const TenantReactivationService = require('../services/tenantReactivationService');
const ResponseHelper = require('../helpers/responseHelper');

class TenantReactivationController {
    /**
     * Get reactivation info for suspended tenant
     */
    static async getReactivationInfo(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            
            console.log('🔍 TenantReactivationController.getReactivationInfo - Getting info for tenant:', tenantId);

            const reactivationInfo = await TenantReactivationService.getReactivationInfo(tenantId);

            return res.status(200).send(ResponseHelper.successResponse(reactivationInfo));

        } catch (error) {
            console.error('❌ TenantReactivationController.getReactivationInfo - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Reactivate suspended tenant with fresh start
     */
    static async reactivateTenant(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const { plan_id, payment_method } = req.body;

            console.log('🔄 TenantReactivationController.reactivateTenant - Reactivating tenant:', {
                tenantId,
                planId: plan_id,
                paymentMethod: payment_method
            });

            // Validate required fields
            if (!plan_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Plan ID is required', 400));
            }

            const paymentData = {
                payment_method: payment_method || 'bank_transfer'
            };

            const result = await TenantReactivationService.reactivateTenant(tenantId, plan_id, paymentData);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Tenant reactivated successfully'));

        } catch (error) {
            console.error('❌ TenantReactivationController.reactivateTenant - Error:', error);
            
            // Handle specific errors
            if (error.message.includes('not found')) {
                return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
            }
            
            if (error.message.includes('not suspended')) {
                return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
            }

            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Get reactivation status (for SuperApp admin)
     */
    static async getReactivationStatus(req, res) {
        try {
            const { tenantId } = req.params;

            console.log('🔍 TenantReactivationController.getReactivationStatus - Getting status for tenant:', tenantId);

            const reactivationInfo = await TenantReactivationService.getReactivationInfo(tenantId);

            return res.status(200).send(ResponseHelper.successResponse(reactivationInfo));

        } catch (error) {
            console.error('❌ TenantReactivationController.getReactivationStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Admin force reactivate tenant (for SuperApp admin)
     */
    static async adminReactivateTenant(req, res) {
        try {
            const { tenantId } = req.params;
            const { plan_id, notes } = req.body;

            console.log('🔄 TenantReactivationController.adminReactivateTenant - Admin reactivating tenant:', {
                tenantId,
                planId: plan_id,
                adminId: req.user.id
            });

            if (!plan_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Plan ID is required', 400));
            }

            const paymentData = {
                payment_method: 'admin_override',
                notes: notes || 'Admin forced reactivation'
            };

            const result = await TenantReactivationService.reactivateTenant(tenantId, plan_id, paymentData);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Tenant reactivated by admin'));

        } catch (error) {
            console.error('❌ TenantReactivationController.adminReactivateTenant - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = TenantReactivationController;
