const PlanChangeService = require('../services/planChangeService');
const ResponseHelper = require('../helpers/responseHelper');

class ActiveTenantPlanController {
    /**
     * Change subscription plan for active tenant
     * POST /active-tenant-plan/change-plan
     */
    static async changePlan(req, res) {
        try {
            const { tenant_id, plan_id, billing_id } = req.body;
            

            // Validate required fields
            if (!tenant_id || !plan_id) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id and plan_id are required', 400));
            }

            // Execute plan change
            const result = await PlanChangeService.changePlan(tenant_id, plan_id, billing_id);
            

            return res.status(200).send(ResponseHelper.successResponse(result, 'Plan changed successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPlanController.changePlan - Error:', error);
            
            // Handle specific error types
            if (error.message.includes('not found')) {
                return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
            }
            
            if (error.message.includes('inactive') || error.message.includes('unpaid')) {
                return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
            }

            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get available plans for active tenant
     * GET /active-tenant-plan/available-plans
     */
    static async getAvailablePlans(req, res) {
        try {
            const { SubscriptionPlan } = require('../models');
            
            const plans = await SubscriptionPlan.findAll({
                where: { is_active: true },
                order: [['price', 'ASC']]
            });

            return res.status(200).send(ResponseHelper.successResponse(plans, 'Available plans retrieved successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPlanController.getAvailablePlans - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get current subscription details
     * GET /active-tenant-plan/current-subscription/:tenant_id
     */
    static async getCurrentSubscription(req, res) {
        try {
            const { tenant_id } = req.params;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id is required', 400));
            }

            const subscription = await PlanChangeService.getCurrentSubscription(tenant_id);
            
            return res.status(200).send(ResponseHelper.successResponse(subscription, 'Current subscription retrieved successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPlanController.getCurrentSubscription - Error:', error);
            
            if (error.message.includes('not found')) {
                return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
            }

            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Handle plan change success
     * @param {Object} responseData - Response data
     */
    static async handlePlanChangeSuccess(responseData) {
        // Add any post-processing logic here
        return responseData;
    }

    /**
     * Handle plan change error
     * @param {Error} error - Error object
     */
    static async handlePlanChangeError(error) {
        console.error('❌ ActiveTenantPlanController.handlePlanChangeError - Plan change failed:', error);
        // Add any error handling logic here
        throw error;
    }
}

module.exports = ActiveTenantPlanController;
