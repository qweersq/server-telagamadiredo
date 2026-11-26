const ProductCategoryService = require('../services/productCategoryService');
const { ResponseHelper } = require('../helpers');

class ProductCategoryController {
    static async create(req, res) {
        try {
            const raw = {
                name: req.body.name,
                type_service: req.body.type_service,
                order_mode: req.body.order_mode,
                description: req.body.description,
                sort_order: req.body.sort_order,
                is_active: req.body.is_active
            };

            const data = await ProductCategoryService.create(raw, req.user.tenant_id, req.user.role);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const isActive = req.query.is_active !== undefined
                ? req.query.is_active === 'true' || req.query.is_active === true
                : undefined;
            const typeService = req.query.type_service || undefined;
            const orderMode = req.query.order_mode || undefined;

            const data = await ProductCategoryService.getAll(
                search,
                req.user.tenant_id,
                req.user.role,
                page,
                pageSize,
                isActive,
                typeService,
                orderMode
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ ProductCategoryController - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const data = await ProductCategoryService.getById(id, req.user.tenant_id, req.user.role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    static async update(req, res) {
        try {
            const raw = {
                id: parseInt(req.params.id, 10),
                name: req.body.name,
                type_service: req.body.type_service,
                order_mode: req.body.order_mode,
                description: req.body.description,
                sort_order: req.body.sort_order,
                is_active: req.body.is_active
            };

            const data = await ProductCategoryService.update(raw, req.user.tenant_id, req.user.role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            await ProductCategoryService.delete(id, req.user.tenant_id, req.user.role);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async toggleStatus(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const data = await ProductCategoryService.toggleStatus(id, req.user.tenant_id, req.user.role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getOptions(req, res) {
        try {
            const data = await ProductCategoryService.getOptions(req.user.tenant_id, req.user.role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ ProductCategoryController - Error getting options:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = ProductCategoryController;
