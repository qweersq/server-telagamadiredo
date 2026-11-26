const FinanceTransferService = require('../services/financeTransferService');
const { ResponseHelper } = require('../helpers');

class FinanceTransferController {
    static async create(req, res) {
        try {
            const { from_account_id, to_account_id, amount, description } = req.body;
            const tenant_id = req.user.tenant_id;
            // Allow superadmin to filter by branch_id if provided in query, otherwise show all accounts
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : 
                             (req.user.role === 'superadmin' ? null : req.user.branch_id);

            // Validate required fields
            if (!from_account_id || !to_account_id || !amount) {
                return res.status(400).send(ResponseHelper.errorResponse('from_account_id, to_account_id, and amount are required'));
            }

            // Validate amount is positive
            if (parseFloat(amount) <= 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Amount must be greater than 0'));
            }

            // Validate accounts are different
            if (from_account_id === to_account_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Source and destination accounts cannot be the same'));
            }

            const transferResult = await FinanceTransferService.create({
                from_account_id,
                to_account_id,
                amount,
                description,
                tenant_id,
                branch_id
            });

            res.status(201).send(ResponseHelper.successResponse(transferResult, 'Transfer berhasil dilakukan'));
        } catch (error) {
            console.error('FinanceTransferController.create error:', error);
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getHistory(req, res) {
        try {
            const { page = 1, limit = 10, from_account_id, to_account_id } = req.query;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;

            const result = await FinanceTransferService.getHistory({
                tenant_id,
                branch_id,
                page: parseInt(page),
                limit: parseInt(limit),
                from_account_id: from_account_id ? parseInt(from_account_id) : null,
                to_account_id: to_account_id ? parseInt(to_account_id) : null
            });

            res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('FinanceTransferController.getHistory error:', error);
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = FinanceTransferController;
