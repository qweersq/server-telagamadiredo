const DailyTaskService = require('../services/dailyTaskService');
const DailyTaskVerificationService = require('../services/dailyTaskVerificationService');
const { ResponseHelper } = require('../helpers');

class DailyTaskController {
    /** GET /daily-tasks — daftar tugas satu cabang per tanggal (supervisor/owner) */
    static async getAll(req, res) {
        try {
            const data = await DailyTaskService.listForBranch(req.query, req.user);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            const status = error.message.includes('wajib') || error.message.includes('tidak valid') ? 400 : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** GET /daily-tasks/me — tugas milik user yang sedang login */
    static async getMine(req, res) {
        try {
            const data = await DailyTaskService.listForUser(req.query, req.user);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            const status = error.message.includes('wajib') || error.message.includes('tidak valid') ? 400 : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /daily-tasks/generate — buat tugas massal dari template */
    static async generate(req, res) {
        try {
            const data = await DailyTaskService.generate(req.body, req.user);

            const message = data.created > 0
                ? `${data.created} tugas berhasil dibuat`
                : 'Tidak ada tugas baru untuk dibuat';

            return res.status(200).send(ResponseHelper.successResponse(data, message));
        } catch (error) {
            const status = error.message.includes('wajib') || error.message.includes('tidak valid') ? 400 : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /daily-tasks/copy — salin tugas dari hari sebelumnya */
    static async copy(req, res) {
        try {
            const data = await DailyTaskService.copyFromPrevious(req.body, req.user);

            const message = data.created > 0
                ? `${data.created} tugas disalin dari ${data.source_date}`
                : 'Semua tugas hari sebelumnya sudah ada';

            return res.status(200).send(ResponseHelper.successResponse(data, message));
        } catch (error) {
            const status = error.message.includes('wajib')
                || error.message.includes('tidak valid')
                || error.message.includes('Belum ada')
                || error.message.includes('Tidak ada')
                || error.message.includes('harus sebelum')
                ? 400
                : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /daily-tasks — tugas tambahan manual untuk satu karyawan */
    static async create(req, res) {
        try {
            const data = await DailyTaskService.createManual(req.body, req.user);

            return res.status(201).send(ResponseHelper.successResponse(data, 'Tugas berhasil ditambahkan'));
        } catch (error) {
            const status = error.message.includes('wajib')
                || error.message.includes('tidak ditemukan')
                || error.message.includes('tidak valid')
                || error.message.includes('belum terdaftar')
                ? 400
                : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** PATCH /daily-tasks/:id/complete — tandai selesai (karyawan / supervisor) */
    static async complete(req, res) {
        try {
            const data = await DailyTaskService.complete(parseInt(req.params.id, 10), req.body, req.user);

            return res.status(200).send(ResponseHelper.successResponse(data, 'Tugas ditandai selesai'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan')
                ? 404
                : error.message.includes('hanya dapat') || error.message.includes('sudah ditandai')
                    ? 403
                    : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** PATCH /daily-tasks/:id/reopen — batalkan tanda selesai */
    static async reopen(req, res) {
        try {
            const data = await DailyTaskService.reopen(parseInt(req.params.id, 10), req.user);

            return res.status(200).send(ResponseHelper.successResponse(data, 'Tugas dikembalikan ke pending'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan')
                ? 404
                : error.message.includes('hanya dapat') || error.message.includes('masih berstatus')
                    ? 403
                    : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** DELETE /daily-tasks/:id */
    static async delete(req, res) {
        try {
            await DailyTaskService.delete(parseInt(req.params.id, 10), req.user);

            return res.status(200).send(ResponseHelper.successResponse(null, 'Tugas berhasil dihapus'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan') ? 404 : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /daily-tasks/:id/verify — nilai foto bukti dengan Gemini Vision */
    static async verify(req, res) {
        try {
            const data = await DailyTaskVerificationService.verify(parseInt(req.params.id, 10), req.user);

            return res.status(200).send(ResponseHelper.successResponse(data, 'Verifikasi selesai'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan')
                ? 404
                : error.message.includes('belum punya foto') || error.message.includes('tidak valid')
                    ? 400
                    : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** PATCH /daily-tasks/:id/override — supervisor menimpa verdict AI */
    static async override(req, res) {
        try {
            const data = await DailyTaskVerificationService.override(
                parseInt(req.params.id, 10),
                req.body,
                req.user
            );

            return res.status(200).send(ResponseHelper.successResponse(data, 'Hasil verifikasi diperbarui'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan')
                ? 404
                : error.message.includes('harus salah satu')
                    ? 400
                    : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /** POST /daily-tasks/close-day — pending → incomplete untuk satu hari */
    static async closeDay(req, res) {
        try {
            const data = await DailyTaskService.closeDay({
                tenant_id: req.user.tenant_id,
                user_id: req.body.user_id ? parseInt(req.body.user_id, 10) : null,
                branch_id: req.body.branch_id ? parseInt(req.body.branch_id, 10) : null,
                date: req.body.date,
            });

            return res.status(200).send(ResponseHelper.successResponse(data, 'Tugas yang belum selesai ditandai incomplete'));
        } catch (error) {
            const status = error.message.includes('wajib') || error.message.includes('tidak valid') ? 400 : 500;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }
}

module.exports = DailyTaskController;
