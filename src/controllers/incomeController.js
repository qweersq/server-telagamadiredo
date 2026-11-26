const IncomeService = require('../services/incomeService');
const { ResponseHelper } = require('../helpers');

class IncomeController {
    static async create(req, res) {
        try {
            const raw = {
                user_id: parseInt(req.body.user_id, 10),
                name: req.body.name,
                date: req.body.date || new Date(),
                amount: parseFloat(req.body.amount),
                description: req.body.description,
                source: req.body.source || 'other',
                receipt: req.body.receipt,
                finance_account_id: parseInt(req.body.finance_account_id, 10),
                finance_category_id: parseInt(req.body.finance_category_id, 10),
                tenant_id: parseInt(req.body.tenant_id, 10) || req.user.tenant_id,
                branch_id: parseInt(req.body.branch_id, 10) || req.user.branch_id
            };

            if (!raw.name) throw new Error('Name is required');
            if (!raw.amount) throw new Error('Amount is required');
            if (!raw.finance_account_id) throw new Error('Finance account is required');
            if (!raw.finance_category_id) throw new Error('Finance category is required');

            const data = await IncomeService.create(raw);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
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
                search: req.query.search,
                tenant_id: req.user.tenant_id,
                branch_id: parseInt(req.query.branch_id, 10) || req.user.branch_id
            };

            if (!raw.tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id is required', 400));
            }
            if (!raw.branch_id) {
                return res.status(400).send(ResponseHelper.errorResponse('branch_id is required', 400));
            }

            const data = await IncomeService.getAll(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const data = await IncomeService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async update(req, res) {
        try {
            const raw = {
                id: parseInt(req.params.id, 10),
                user_id: parseInt(req.body.user_id, 10) || null,
                shift_id: parseInt(req.body.shift_id, 10) || null,
                name: req.body.name,
                date: req.body.date || new Date(),
                amount: req.body.amount,
                description: req.body.description,
                source: req.body.source,
                receipt: req.body.receipt,
                finance_account_id: req.body.finance_account_id,
                finance_category_id: req.body.finance_category_id,
                tenant_id: parseInt(req.body.tenant_id, 10) || req.user.tenant_id,
                branch_id: parseInt(req.body.branch_id, 10) || req.user.branch_id
            };

            const data = await IncomeService.update(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;

            await IncomeService.delete(id, tenant_id, branch_id);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
};

module.exports = IncomeController;
