const FinanceService = require('../services/financeService');
const { ResponseHelper } = require('../helpers');

class FinanceController {
    static async getDailyTransactions(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) :
                (req.user.role === 'superadmin' ? null : req.user.branch_id);
            const filters = {
                date: req.query.date,
                type: req.query.type || 'all',
                startDate: req.query.start_date,
                endDate: req.query.end_date,
                period: req.query.period || 'daily',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                tenant_id,
                branch_id
            };

            const data = await FinanceService.getDailyTransactions(filters);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getDailySummary(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            // For superadmin, set branch_id to null to show all accounts when no branch_id query param
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) :
                (req.user.role === 'superadmin' ? null : req.user.branch_id);

            // Determine filter type for frontend badge
            // Superadmin without branch_id query = all branches
            // Regular user = specific branch (their branch)
            const is_all_branches = req.user.role === 'superadmin' && !req.query.branch_id;
            const is_specific_branch = !is_all_branches;

            const filters = {
                date: req.query.date,
                startDate: req.query.start_date,
                endDate: req.query.end_date,
                period: req.query.period || 'daily',
                tenant_id,
                branch_id,
                is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : true,
                filter_info: {
                    is_all_branches,
                    is_specific_branch,
                    branch_id: branch_id,
                    user_role: req.user.role
                }
            };

            const data = await FinanceService.getDailySummary(filters);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getTransactionDetail(req, res) {
        try {
            const transactionId = parseInt(req.params.id, 10);
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : req.user.branch_id;

            if (!transactionId || isNaN(transactionId)) {
                return res.status(400).send(ResponseHelper.errorResponse('Invalid transaction ID', 400));
            }

            const data = await FinanceService.getTransactionDetail(transactionId, tenant_id, branch_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getPeriods(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : req.user.branch_id;
            const data = await FinanceService.getPeriods(tenant_id, branch_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getAccountSummary(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : req.user.branch_id;
            const filters = {
                date: req.query.date,
                startDate: req.query.start_date,
                endDate: req.query.end_date,
                period: req.query.period || 'daily',
                type: req.query.type || 'all',
                tenant_id,
                branch_id
            };

            const data = await FinanceService.getAccountSummary(filters);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAccountSummaryCounts(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : req.user.branch_id;
            const filters = {
                date: req.query.date,
                startDate: req.query.start_date,
                endDate: req.query.end_date,
                period: req.query.period || 'daily',
                type: req.query.type || 'all',
                tenant_id,
                branch_id
            };

            const data = await FinanceService.getAccountSummaryCounts(filters);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getFinancialReport(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) :
                (req.user.role === 'superadmin' ? null : req.user.branch_id);

            const filters = {
                month: parseInt(req.query.month) || new Date().getMonth() + 1,
                year: parseInt(req.query.year) || new Date().getFullYear(),
                tenant_id,
                branch_id
            };

            const data = await FinanceService.getFinancialReport(filters);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getTransactionsPDF(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) :
                (req.user.role === 'superadmin' ? null : req.user.branch_id);

            const filters = {
                date: req.query.date,
                type: req.query.type || 'all',
                startDate: req.query.start_date,
                endDate: req.query.end_date,
                period: req.query.period || 'daily',
                tenant_id,
                branch_id
            };

            const pdfBuffer = await FinanceService.generateTransactionsPDF(filters);

            const filename = `Daftar-Transaksi-${filters.date || 'semua'}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getFinancialReportPDF(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) :
                (req.user.role === 'superadmin' ? null : req.user.branch_id);

            const filters = {
                month: parseInt(req.query.month) || new Date().getMonth() + 1,
                year: parseInt(req.query.year) || new Date().getFullYear(),
                tenant_id,
                branch_id
            };

            // Generate PDF buffer
            const pdfBuffer = await FinanceService.generateFinancialReportPDF(filters);

            // Set response headers
            const months = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
            ];
            const monthName = months[filters.month - 1];
            const filename = `Laporan-Keuangan-${monthName}-${filters.year}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }
}

module.exports = FinanceController;
