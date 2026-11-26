// bikin controller untuk finance account
const FinanceCategoryService = require('../services/financeCategoryService');
const { ResponseHelper } = require('../helpers');

class FinanceCategoryController {
    static async create(req, res) {
        try {
            const { name, type, description } = req.body;
            const tenant_id = req.user.tenant_id;
            const financeCategory = await FinanceCategoryService.create(name, type, description, tenant_id);

            res.status(201).send(ResponseHelper.successResponse(financeCategory));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getAll(req, res) {
        try {
            // ALWAYS use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const type = req.query.type; // Get type filter from query params
            const financeCategories = await FinanceCategoryService.getAll(tenant_id, type);
            res.status(200).send(ResponseHelper.successResponse(financeCategories));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            const financeCategory = await FinanceCategoryService.getById(id, tenant_id);
            res.status(200).send(ResponseHelper.successResponse(financeCategory));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, type, description } = req.body;
            const tenant_id = req.user.tenant_id;
            const financeCategory = await FinanceCategoryService.update(id, name, type, description, tenant_id);
            res.status(200).send(ResponseHelper.successResponse(financeCategory));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            const financeCategory = await FinanceCategoryService.delete(id, tenant_id);
            res.status(200).send(ResponseHelper.successResponse(financeCategory));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = FinanceCategoryController;