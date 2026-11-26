const SubscriptionPlanService = require('../services/subscriptionPlanService');
const { ResponseHelper } = require('../helpers');

class SubscriptionPlanController {
    static async create(req, res) {
        try {
            const raw = {
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                duration_days: req.body.duration_days,
                max_branches: req.body.max_branches,
                max_users: req.body.max_users,
                max_orders_per_month: req.body.max_orders_per_month,
                features: req.body.features,
                is_active: req.body.is_active,
                sort_order: req.body.sort_order
            };

            const data = await SubscriptionPlanService.create(raw);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const is_active = req.query.is_active;

            const data = await SubscriptionPlanService.getAll(search, is_active);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getAvailablePlans(req, res) {
        try {
            const data = await SubscriptionPlanService.getActivePlans();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await SubscriptionPlanService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async update(req, res) {
        try {
            const { id } = req.params;
            const raw = {
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                duration_days: req.body.duration_days,
                max_branches: req.body.max_branches,
                max_users: req.body.max_users,
                max_orders_per_month: req.body.max_orders_per_month,
                features: req.body.features,
                is_active: req.body.is_active,
                sort_order: req.body.sort_order
            };

            // Remove undefined values
            Object.keys(raw).forEach(key => {
                if (raw[key] === undefined) {
                    delete raw[key];
                }
            });

            const data = await SubscriptionPlanService.update(id, raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const data = await SubscriptionPlanService.delete(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getActivePlans(req, res) {
        try {
            const data = await SubscriptionPlanService.getActivePlans();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;

            if (typeof is_active !== 'boolean') {
                return res.status(400).send(ResponseHelper.errorResponse('is_active must be a boolean', 400));
            }

            const data = await SubscriptionPlanService.toggleStatus(id, is_active);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getPlanStats(req, res) {
        try {
            const { id } = req.params;
            const data = await SubscriptionPlanService.getPlanStats(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };
}

module.exports = SubscriptionPlanController;
