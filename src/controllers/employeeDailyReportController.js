const EmployeeDailyReportService = require('../services/employeeDailyReportService');
const ResponseHelper = require('../helpers/responseHelper');

class EmployeeDailyReportController {
    /**
     * Ambil rentang tanggal dari query.
     * Dua cara didukung:
     *  - start_date & end_date  → dipakai halaman web, boleh berupa rentang
     *  - date                   → dipakai aplikasi mobile, satu hari
     *                             (start_date = end_date = date)
     *
     * @param {object} query - req.query
     * @returns {{start_date: string, end_date: string}|{error: string}}
     */
    static resolveDateRange(query) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        const normalize = (value) => {
            if (!value) return null;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return null;
            return parsed.toISOString().slice(0, 10);
        };

        let start_date = normalize(query.start_date);
        let end_date = normalize(query.end_date);

        const hasRange = Boolean(query.start_date || query.end_date);
        const hasSingleDay = Boolean(query.date);

        if (!hasRange && !hasSingleDay) {
            return { error: 'Parameter start_date & end_date (YYYY-MM-DD) wajib diisi' };
        }

        // Kompatibilitas ke belakang: aplikasi mobile masih mengirim `date` saja
        if (!hasRange) {
            start_date = normalize(query.date);
            end_date = start_date;
        }

        if (!start_date || !end_date || !dateRegex.test(start_date) || !dateRegex.test(end_date)) {
            return { error: 'Format tanggal harus YYYY-MM-DD' };
        }

        if (start_date > end_date) {
            return { error: 'start_date tidak boleh lebih besar dari end_date' };
        }

        return { start_date, end_date };
    }

    /**
     * Get daily employee performance report
     * GET /employee-daily-report
     *
     * Bisa satu hari (`date=...`) atau rentang (`start_date=...&end_date=...`).
     */
    static async getDailyReport(req, res) {
        try {
            const { branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const reportData = await EmployeeDailyReportService.getDailyReport(
                tenant_id,
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(reportData));
        } catch (error) {
            console.error('Error in getDailyReport:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get order input detail for a specific employee
     * GET /employee-daily-report/input-detail
     */
    static async getOrderInputDetail(req, res) {
        try {
            const { employee_id, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            if (!employee_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Parameter employee_id wajib diisi'));
            }

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const orders = await EmployeeDailyReportService.getOrderInputDetail(
                tenant_id,
                parseInt(employee_id, 10),
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(orders));
        } catch (error) {
            console.error('Error in getOrderInputDetail:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get pickup detail for a specific employee
     * GET /employee-daily-report/pickup-detail
     */
    static async getPickupDetail(req, res) {
        try {
            const { employee_id, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            if (!employee_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Parameter employee_id wajib diisi'));
            }

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const items = await EmployeeDailyReportService.getPickupDetail(
                tenant_id,
                parseInt(employee_id, 10),
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(items));
        } catch (error) {
            console.error('Error in getPickupDetail:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get delivery detail for a specific employee
     * GET /employee-daily-report/delivery-detail
     */
    static async getDeliveryDetail(req, res) {
        try {
            const { employee_id, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            if (!employee_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Parameter employee_id wajib diisi'));
            }

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const deliveries = await EmployeeDailyReportService.getDeliveryDetail(
                tenant_id,
                parseInt(employee_id, 10),
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(deliveries));
        } catch (error) {
            console.error('Error in getDeliveryDetail:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get on_progress detail (Mulai Pengerjaan) for a specific employee
     * GET /employee-daily-report/mulai-pengerjaan-detail
     */
    static async getOnProgressDetail(req, res) {
        try {
            const { employee_id, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            if (!employee_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Parameter employee_id wajib diisi'));
            }

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const items = await EmployeeDailyReportService.getOnProgressDetail(
                tenant_id,
                parseInt(employee_id, 10),
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(items));
        } catch (error) {
            console.error('Error in getOnProgressDetail:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get selesai dikerjakan detail for a specific employee
     * GET /employee-daily-report/selesai-pengerjaan-detail
     */
    static async getSelesaiDikerjakanDetail(req, res) {
        try {
            const { employee_id, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            if (!employee_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Parameter employee_id wajib diisi'));
            }

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const items = await EmployeeDailyReportService.getSelesaiDikerjakanDetail(
                tenant_id,
                parseInt(employee_id, 10),
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(items));
        } catch (error) {
            console.error('Error in getSelesaiDikerjakanDetail:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get QC item detail for a specific employee
     * GET /employee-daily-report/qc-item-detail
     */
    static async getQCItemDetail(req, res) {
        try {
            const { employee_id, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;

            if (!employee_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Parameter employee_id wajib diisi'));
            }

            const range = EmployeeDailyReportController.resolveDateRange(req.query);
            if (range.error) {
                return res.status(400).send(ResponseHelper.errorResponse(range.error));
            }

            const items = await EmployeeDailyReportService.getQCItemDetail(
                tenant_id,
                parseInt(employee_id, 10),
                range.start_date,
                range.end_date,
                branch_id ? parseInt(branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(items));
        } catch (error) {
            console.error('Error in getQCItemDetail:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get branches for tenant
     * GET /employee-daily-report/branches
     */
    static async getBranches(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branches = await EmployeeDailyReportService.getBranches(tenant_id);
            return res.status(200).send(ResponseHelper.successResponse(branches));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = EmployeeDailyReportController;
