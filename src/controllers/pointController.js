const PointService = require('../services/pointService');
const { ResponseHelper } = require('../helpers');
const { Customer } = require('../models');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');

class PointController {
    /**
     * Get customer points
     * GET /points/customers/:id
     */
    static async getCustomerPoints(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const user_tenant_id = req.user.tenant_id;

            const data = await PointService.getCustomerPoints(customer_id, user_tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    /**
     * Get point transaction history
     * GET /points/customers/:id/history
     * Query params: page, limit, order_id (optional - filter by order_id)
     */
    static async getPointHistory(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const order_id = req.query.order_id ? parseInt(req.query.order_id, 10) : null; // ✅ Optional filter by order_id

            const data = await PointService.getPointHistory(
                customer_id,
                user_tenant_id,
                user_branch_id,
                user_role,
                page,
                limit,
                order_id // ✅ Pass order_id to service
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    /**
     * Manual adjustment of customer points (admin only)
     * POST /points/adjust
     * Body: { customer_id, points, description }
     */
    static async adjustPoints(req, res) {
        try {
            const customer_id = parseInt(req.body.customer_id, 10);
            const points = parseInt(req.body.points, 10);
            const description = req.body.description || null;
            const user_tenant_id = req.user.tenant_id;

            // Validate input
            if (!customer_id || isNaN(customer_id)) {
                return res.status(400).send(ResponseHelper.errorResponse('customer_id is required', 400));
            }

            if (!points || isNaN(points) || points === 0) {
                return res.status(400).send(ResponseHelper.errorResponse('points must be a non-zero number', 400));
            }

            // Validate customer exists and belongs to tenant
            const customer = await Customer.findByPk(customer_id);
            if (!customer) {
                return res.status(404).send(ResponseHelper.errorResponse('Customer not found', 404));
            }

            if (customer.tenant_id !== user_tenant_id) {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied', 403));
            }

            // Adjust points
            const data = await PointService.adjustPoints(
                customer_id,
                points,
                description,
                user_tenant_id
            );

            return res.status(200).send(ResponseHelper.successResponse(data, 200));
        } catch (error) {
            console.error('❌ PointController.adjustPoints - Error:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    /**
     * Expire points (cron job endpoint)
     * POST /cron/expire-points
     */
    static async expirePoints(req, res) {
        try {
            console.log('🔄 PointController.expirePoints - Starting point expiration process...');
            
            const result = await PointService.expirePoints();

            return res.status(200).send(ResponseHelper.successResponse(result, 200));
        } catch (error) {
            console.error('❌ PointController.expirePoints - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = PointController;
