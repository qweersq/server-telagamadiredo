const PointsManagementService = require('../services/pointsManagementService');
const { ResponseHelper } = require('../helpers');

class PointsManagementController {
    /**
     * Recalculate points for customer(s)
     * POST /points-management/recalculate
     * Body: { customer_ids: [1, 2, 3] } or { customer_ids: [] } for all
     */
    static async recalculatePoints(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            const { customer_ids = [] } = req.body;

            const result = await PointsManagementService.recalculatePoints(
                tenant_id,
                customer_ids,
                user_id
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 200));
        } catch (error) {
            console.error('Error recalculating points:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Reset points for customer(s)
     * POST /points-management/reset
     * Body: { 
     *   customer_ids: [1, 2, 3] or [],
     *   reset_points: true,
     *   reset_lifetime_points: false,
     *   reset_to_value: 0
     * }
     */
    static async resetPoints(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            const {
                customer_ids = [],
                reset_points = true,
                reset_lifetime_points = false,
                reset_to_value = 0
            } = req.body;

            const result = await PointsManagementService.resetPoints(
                tenant_id,
                customer_ids,
                {
                    reset_points,
                    reset_lifetime_points,
                    reset_to_value: parseInt(reset_to_value) || 0
                },
                user_id
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 200));
        } catch (error) {
            console.error('Error resetting points:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = PointsManagementController;

