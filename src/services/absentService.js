const AbsentRepository = require('../repositories/absentRepository');
const BranchRepository = require('../repositories/branchRepository');
const UserRepository = require('../repositories/userRepository');
const WorkScheduleService = require('./workScheduleService');

const moment = require('moment');

class AbsentService {
    static async create(data) {
        try {
            if (isNaN(data.branch_id) || data.branch_id <= 0) throw new Error('Invalid ID');
            if (isNaN(data.employee_id) || data.employee_id <= 0) throw new Error('Invalid ID');

            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            const [branch, employee] = await Promise.all([
                BranchRepository.getById(data.branch_id),
                UserRepository.getById(data.employee_id)
            ]);

            if (!branch) throw new Error('Branch not found');
            if (!employee) throw new Error('Employee not found');

            // Calculate work_duration if clock_out is provided
            if (data.clock_in && data.clock_out) {
                const startTime = moment(data.date + ' ' + data.clock_in);
                const endTime = moment(data.date + ' ' + data.clock_out);
                const duration = moment.duration(endTime.diff(startTime));
                data.work_duration = `${String(duration.hours()).padStart(2, '0')}:${String(duration.minutes()).padStart(2, '0')}:${String(duration.seconds()).padStart(2, '0')}`;
            }

            // Snapshot jadwal + hitung keterlambatan dari jam masuk aktual.
            // Tanpa jadwal, absen tetap tersimpan (is_late dibiarkan false).
            if (employee.tenant_id && data.clock_in) {
                try {
                    const resolved = await WorkScheduleService.resolve(
                        data.employee_id,
                        employee.tenant_id,
                        data.date,
                        data.branch_id
                    );
                    if (resolved) {
                        const lateness = WorkScheduleService.computeLateness(
                            data.clock_in,
                            resolved.target,
                            data.date
                        );
                        data.schedule_id = resolved.schedule.id;
                        data.expected_clock_in = lateness.expected_clock_in;
                        data.expected_clock_out = lateness.expected_clock_out;
                        data.late_minutes = lateness.late_minutes;
                        data.is_late = lateness.is_late;
                    }
                } catch (error) {
                    // Kegagalan hitung jadwal tidak boleh menggagalkan absen.
                    console.warn('⚠️ AbsentService.create - gagal hitung jadwal:', error.message);
                }
            }

            const result = await AbsentRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll({ page, pageSize, startDate, endDate, search }) {
        try {
            if (isNaN(page) || page <= 0) throw new Error('Page must be a positive integer');
            if (![10, 20, 50, 100].includes(pageSize)) throw new Error('Page size must be one of the following: 10, 20, 50, 100');
            if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new Error('Start date cannot be later than end date');

            const result = await AbsentRepository.getAll({ page, pageSize, startDate, endDate, search });
            if (!result || result.length === 0) throw new Error('No absent found');

            return {
                absents: result.absents,
                pagination: result.pagination,
                rekap_karyawan: result.rekap_karyawan
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Data untuk halaman Monitoring Absensi (supervisor/owner).
     *
     * Selain daftar baris (urut skor AI terendah → tertinggi), ikut dihitung
     * ringkasan supaya kartu angka di atas tabel tidak perlu hitung ulang
     * di frontend.
     */
    static async getMonitor({ date, branchId, tenantId, search }) {
        try {
            const rows = await AbsentRepository.getMonitor({ date, branchId, tenantId, search });

            const summary = {
                total: rows.length,
                verified: 0,
                review: 0,
                reject: 0,
                no_ai: 0,
            };

            rows.forEach((row) => {
                const verdicts = [row.ai_clock_in_verdict, row.ai_clock_out_verdict].filter(Boolean);
                if (verdicts.length === 0) {
                    summary.no_ai += 1;
                    return;
                }
                if (verdicts.includes('reject')) summary.reject += 1;
                else if (verdicts.includes('review')) summary.review += 1;
                else summary.verified += 1;
            });

            return { summary, absents: rows };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByUserId(id, month, year) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await AbsentRepository.getByUserId(id, month, year);
            if (!result) throw new Error('Absent not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await AbsentRepository.getById(id);
            if (!result) throw new Error('Absent not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(data) {
        try {
            if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            if (data.branch_id || data.employee_id) {
                const [branch, employee] = await Promise.all([
                    BranchRepository.getById(data.branch_id),
                    UserRepository.getById(data.employee_id)
                ]);

                if (!branch) throw new Error('Branch not found');
                if (!employee) throw new Error('Employee not found');
            }

            const check = await AbsentRepository.getById(data.id);
            if (!check) throw new Error('Absent not found');

            const result = await AbsentRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await AbsentRepository.getById(id);
            if (!check) throw new Error('Absent not found');

            await AbsentRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    static async checkTodayAbsent(employee_id) {
        try {
            const threeDaysAgo = moment().subtract(3, 'days').startOf('day').format('YYYY-MM-DD');
            const unfinishedAbsent = await AbsentRepository.findUnfinishedAbsent(employee_id, threeDaysAgo);

            const today = moment().format('YYYY-MM-DD');
            const todayAbsent = await AbsentRepository.findTodayAbsent(employee_id, today);

            // Jika unfinishedAbsent ditemukan (absen kemarin belum clock_out)
            if (unfinishedAbsent && !todayAbsent) {
                // Tidak melakukan auto-close, biarkan user update manual
                // Hanya return informasi bahwa ada unfinished absent
                return {
                    isAbsent: false,
                    absentData: null,
                    hasUnfinishedAbsent: true,
                    isTodayAbsent: false,
                    unfinishedAbsentData: {
                        id: unfinishedAbsent.id,
                        date: unfinishedAbsent.date,
                        clock_in: unfinishedAbsent.clock_in,
                        clock_out: unfinishedAbsent.clock_out
                    }
                };
            }

            // Jika sudah absen hari ini
            if (todayAbsent) {
                return {
                    isAbsent: true,
                    absentData: todayAbsent,
                    hasUnfinishedAbsent: false,
                    isTodayAbsent: true
                };
            }

            // Tidak ada unfinished dan belum absen hari ini
            return {
                isAbsent: false,
                absentData: null,
                hasUnfinishedAbsent: false,
                isTodayAbsent: false
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async createPermission(raw) {
        try {
            const today = moment().format('YYYY-MM-DD');
            const existingPermission = await AbsentRepository.findTodayPermission(raw.user_id, today);

            if (existingPermission) throw new Error('You have already requested leave for today');

            const data = {
                employee_id: raw.user_id,
                branch_id: raw.branch_id,
                date: today,
                clock_in: moment().format('HH:mm:ss'),
                clock_out: moment().format('HH:mm:ss'),
                status: raw.status,
                description: raw.description
            };
            return await AbsentRepository.create(data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getMyPermissions(userId) {
        try {
            const result = await AbsentRepository.findPermissions(userId);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async endWork(data) {
        try {
            const absent = await AbsentRepository.findById(data.absent_id);
            if (!absent) throw new Error('Absent not found');

            const startTime = moment(absent.date + ' ' + absent.clock_in);
            const endTime = moment(absent.date + ' ' + data.clock_out);
            const duration = moment.duration(endTime.diff(startTime));
            const work_duration = `${String(duration.hours()).padStart(2, '0')}:${String(duration.minutes()).padStart(2, '0')}:${String(duration.seconds()).padStart(2, '0')}`;
            data.work_duration = work_duration;

            const result = await AbsentRepository.update(data.absent_id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = AbsentService;