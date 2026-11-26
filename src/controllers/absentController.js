const moment = require('moment');
const AbsentService = require('../services/absentService');
const AbsentVerificationService = require('../services/absentVerificationService');
const LocationValidationService = require('../services/locationValidationService');
const { ResponseHelper } = require('../helpers');

/**
 * Apakah aktor ini boleh mengisi/mengoreksi absensi tanpa foto & GPS (backfill).
 *
 * Supervisor di-normalisasi menjadi `superadmin` oleh AuthMiddleware, jadi
 * pengecekan memakai `role_asli` agar supervisor TIDAK ikut lolos.
 */
const isBackfillActor = (user) => {
    const realRole = String(user?.role_asli || user?.role || '').toLowerCase();
    return realRole === 'superadmin' || realRole === 'admin';
};

class AbsentController {
    static async create(req, res) {
        try {
            const { latitude, longitude, accuracy } = req.body;
            const branchId = parseInt(req.body.branch_id, 10);

            const photoClockIn = req.body.photo_clock_in ? String(req.body.photo_clock_in).trim() : null;

            // Owner/Admin boleh mencatat absen susulan (backfill) tanpa foto & GPS.
            const isAdmin = ['superadmin', 'admin'].includes(req.user?.role);

            // 1. Foto bukti wajib — jadi acuan verifikasi AI.
            if (!photoClockIn && !isAdmin) {
                return res.status(400).send(ResponseHelper.errorResponse(
                    'Foto bukti absen wajib diunggah. Gunakan aplikasi GPS Camera agar tanggal, jam, dan lokasi terlihat.',
                    400
                ));
            }

            // 2. Koordinat GPS wajib.
            const hasCoords = latitude !== undefined && latitude !== null && latitude !== ''
                && longitude !== undefined && longitude !== null && longitude !== '';

            if (!hasCoords && !isAdmin) {
                return res.status(400).send(ResponseHelper.errorResponse(
                    'Lokasi GPS wajib aktif. Izinkan akses lokasi di browser lalu coba lagi.',
                    400
                ));
            }

            // 3. Validasi radius kantor — memblokir absen di luar area.
            //    Cabang yang belum punya koordinat tidak memblokir (tidak ada acuan).
            let locationValidated = false;
            let locationNote = null;
            let locationDistance = null;

            if (hasCoords) {
                try {
                    const locationValidation = await LocationValidationService.validateLocation(
                        latitude, longitude, accuracy, branchId
                    );

                    locationValidated = locationValidation.isValid;
                    locationDistance = locationValidation.distance ?? null;

                    if (!locationValidation.isValid) {
                        const blockingCodes = ['GPS_INACCURATE', 'TOO_FAR_FROM_BRANCH', 'BRANCH_NOT_FOUND'];
                        if (blockingCodes.includes(locationValidation.code) && !isAdmin) {
                            return res.status(400).send(ResponseHelper.errorResponse(
                                locationValidation.error,
                                { code: locationValidation.code, distance: locationDistance }
                            ));
                        }
                        locationNote = locationValidation.error;
                    }
                } catch (locationError) {
                    if (!isAdmin) {
                        return res.status(400).send(ResponseHelper.errorResponse(
                            `Gagal memvalidasi lokasi: ${locationError.message}`,
                            400
                        ));
                    }
                    locationNote = locationError.message;
                }
            }

            const raw = {
                employee_id: parseInt(req.body.employee_id, 10),
                branch_id: branchId,
                date: req.body.date,
                clock_in: req.body.clock_in,
                clock_out: req.body.clock_out,
                status: req.body.status,
                description: locationNote
                    ? [req.body.description, `[GPS] ${locationNote}`].filter(Boolean).join(' | ')
                    : locationDistance !== null
                        ? [req.body.description, `[GPS] ${locationDistance}m dari kantor`].filter(Boolean).join(' | ')
                        : req.body.description,
                // Location data
                latitude: latitude || null,
                longitude: longitude || null,
                accuracy: accuracy || null,
                location_validated: locationValidated,
                // Foto bukti absen (biasanya dari aplikasi GPS camera)
                photo_clock_in: photoClockIn,
                ai_clock_in_status: photoClockIn ? 'pending' : 'skipped',
            };

            const data = await AbsentService.create(raw);

            // Fire-and-forget: kegagalan AI tidak boleh menggagalkan absen.
            if (photoClockIn) AbsentVerificationService.autoVerify(data.id, 'clock_in');

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            console.error('Absent creation error:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const raw = {
                page: parseInt(req.query.page, 10) || 1,
                pageSize: parseInt(req.query.pageSize, 10) || 10,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                search: req.query.search
            };
            const data = await AbsentService.getAll(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    /**
     * Monitoring absensi untuk supervisor/owner.
     *
     * Query: date (YYYY-MM-DD, default hari ini), branch_id (opsional), search (opsional)
     * Hasil diurutkan dari skor AI terendah ke tertinggi (lihat AbsentRepository.getMonitor).
     */
    static async getMonitor(req, res) {
        try {
            const date = req.query.date || moment().format('YYYY-MM-DD');
            const branchId = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const search = req.query.search ? String(req.query.search).trim() : null;

            const data = await AbsentService.getMonitor({
                date,
                branchId,
                tenantId: req.user?.tenant_id,
                search,
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const data = await AbsentService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getByUserId(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const data = await AbsentService.getByUserId(id, month, year);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async update(req, res) {
        try {
            const photoClockIn = req.body.photo_clock_in ? String(req.body.photo_clock_in).trim() : undefined;
            const photoClockOut = req.body.photo_clock_out ? String(req.body.photo_clock_out).trim() : undefined;

            const isAdmin = isBackfillActor(req.user);
            const isClockOut = Boolean(req.body.clock_out);

            // Absen pulang oleh karyawan wajib menyertakan foto bukti.
            if (!isAdmin && isClockOut && !photoClockOut) {
                return res.status(400).send(
                    ResponseHelper.errorResponse(
                        'Foto bukti absen pulang wajib diunggah. Gunakan aplikasi GPS Camera agar tanggal, jam, dan lokasi terlihat.',
                        { code: 'PHOTO_REQUIRED' }
                    )
                );
            }

            // Validasi radius kantor untuk absen pulang (hanya bila koordinat dikirim).
            if (!isAdmin && isClockOut && req.body.latitude != null && req.body.longitude != null) {
                const branchId = req.user?.branch_id || req.body.branch_id || null;
                const check = await LocationValidationService.validateLocation(
                    Number(req.body.latitude),
                    Number(req.body.longitude),
                    req.body.accuracy,
                    branchId
                );

                if (!check.isValid && ['GPS_INACCURATE', 'TOO_FAR_FROM_BRANCH', 'BRANCH_NOT_FOUND'].includes(check.code)) {
                    return res.status(400).send(
                        ResponseHelper.errorResponse(check.error, {
                            code: check.code,
                            distance: check.distance,
                        })
                    );
                }
            }

            const raw = {
                id: parseInt(req.params.id, 10),
                clock_in: req.body.clock_in,
                clock_out: req.body.clock_out,
                date: req.body.date,
                status: req.body.status,
                description: req.body.description,
                work_duration: req.body.work_duration
            };

            if (photoClockIn !== undefined) {
                raw.photo_clock_in = photoClockIn;
                raw.ai_clock_in_status = 'pending';
            }
            if (photoClockOut !== undefined) {
                raw.photo_clock_out = photoClockOut;
                raw.ai_clock_out_status = 'pending';
            }

            const data = await AbsentService.update(raw);

            // Fire-and-forget: verifikasi AI tidak boleh menggagalkan absen.
            if (photoClockIn) AbsentVerificationService.autoVerify(data.id, 'clock_in');
            if (photoClockOut) AbsentVerificationService.autoVerify(data.id, 'clock_out');

            // Absen pulang: tugas harian yang masih pending dianggap tidak selesai.
            // Best effort — kegagalan di sini tidak boleh menggagalkan absensi.
            if (req.body.clock_out) {
                try {
                    const DailyTaskService = require('../services/dailyTaskService');
                    await DailyTaskService.closeDay({
                        tenant_id: req.user.tenant_id,
                        user_id: data.employee_id,
                        date: data.date,
                    });
                } catch (taskError) {
                    console.error('⚠️ AbsentController.update - Gagal menutup tugas harian:', taskError.message);
                }
            }

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            await AbsentService.delete(id);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };


    static async checkTodayAbsent(req, res) {
        try {
            const employee_id = parseInt(req.query.employee_id, 10);
            const data = await AbsentService.checkTodayAbsent(employee_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async createPermission(req, res) {
        try {
            const raw = {
                user_id: req.user.id,
                branch_id: req.user.branch_id,
                status: req.body.status,
                description: req.body.description
            }
            const data = await AbsentService.createPermission(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getMyPermissions(req, res) {
        try {
            const data = await AbsentService.getMyPermissions(req.user.id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async endWork(req, res) {
        try {
            const photoClockOut = req.body.photo_clock_out ? String(req.body.photo_clock_out).trim() : null;

            const isAdmin = isBackfillActor(req.user);
            if (!isAdmin && !photoClockOut) {
                return res.status(400).send(
                    ResponseHelper.errorResponse(
                        'Foto bukti absen pulang wajib diunggah. Gunakan aplikasi GPS Camera agar tanggal, jam, dan lokasi terlihat.',
                        { code: 'PHOTO_REQUIRED' }
                    )
                );
            }

            const raw = {
                absent_id: parseInt(req.body.absent_id, 10),
                clock_out: req.body.clock_out
            };
            if (photoClockOut) {
                raw.photo_clock_out = photoClockOut;
                raw.ai_clock_out_status = 'pending';
            }

            const data = await AbsentService.endWork(raw);

            if (photoClockOut) AbsentVerificationService.autoVerify(data.id, 'clock_out');

            try {
                const DailyTaskService = require('../services/dailyTaskService');
                await DailyTaskService.closeDay({
                    tenant_id: req.user.tenant_id,
                    user_id: data.employee_id,
                    date: data.date,
                });
            } catch (taskError) {
                console.error('⚠️ AbsentController.endWork - Gagal menutup tugas harian:', taskError.message);
            }

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Nilai ulang foto absen dengan AI (dipakai kalau verifikasi otomatis gagal).
     * Body/query: kind = clock_in | clock_out
     */
    static async verify(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const kind = req.body.kind || req.query.kind || 'clock_in';

            const data = await AbsentVerificationService.verify(id, kind);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    /**
     * Timpa verdict AI secara manual.
     * Body: kind, verdict (verified|review|reject), reason
     */
    static async override(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const kind = req.body.kind || 'clock_in';

            const data = await AbsentVerificationService.override(id, kind, req.body, req.user);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }
};

module.exports = AbsentController;