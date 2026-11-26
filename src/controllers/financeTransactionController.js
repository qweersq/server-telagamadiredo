const FinanceTransactionService = require('../services/financeTransactionService');
const { ResponseHelper } = require('../helpers');

class FinanceTransactionController {
    static async create(req, res) {
        try {
            const { account_id, category_id, amount, final_amount, description, date } = req.body;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeTransaction = await FinanceTransactionService.create(
                account_id, 
                category_id, 
                amount, 
                final_amount, 
                description, 
                date, 
                tenant_id, 
                branch_id
            );

            res.status(201).send(ResponseHelper.successResponse(financeTransaction));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getAll(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search;
            const type = req.query.type; // 'credit' or 'debit'
            const startDate = req.query.start_date;
            const endDate = req.query.end_date;

            const financeTransactions = await FinanceTransactionService.getAll(
                tenant_id, 
                branch_id, 
                page, 
                limit, 
                search, 
                type, 
                startDate, 
                endDate
            );
            res.status(200).send(ResponseHelper.successResponse(financeTransactions));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeTransaction = await FinanceTransactionService.getById(id, tenant_id, branch_id);
            res.status(200).send(ResponseHelper.successResponse(financeTransaction));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { account_id, category_id, amount, final_amount, description, date, is_checked } = req.body;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeTransaction = await FinanceTransactionService.update(
                id, 
                account_id, 
                category_id, 
                amount, 
                final_amount, 
                description, 
                date, 
                is_checked, 
                tenant_id, 
                branch_id
            );
            res.status(200).send(ResponseHelper.successResponse(financeTransaction));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeTransaction = await FinanceTransactionService.delete(id, tenant_id, branch_id);
            res.status(200).send(ResponseHelper.successResponse(financeTransaction));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = FinanceTransactionController;