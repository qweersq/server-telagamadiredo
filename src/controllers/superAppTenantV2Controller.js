const ResponseHelper = require('../helpers/responseHelper');
const SuperAppTenantV2Service = require('../services/superAppTenantV2Service');

/**
 * SuperApp Tenant V2 Controller
 * Simple controller for tenant management with trial filtering
 */
class SuperAppTenantV2Controller {
    
    /**
     * Get trial tenants (status: trial, subscription_status: trial)
     * GET /superapp/tenants/v2/trial
     */
    static async getTrialTenants(req, res) {
        try {
            console.log('🔍 SuperAppTenantV2Controller.getTrialTenants - Fetching trial tenants');

            const { page = 1, limit = 20, search } = req.query;
            
            const result = await SuperAppTenantV2Service.getTrialTenants(
                search,
                parseInt(page),
                parseInt(limit)
            );

            const response = {
                success: true,
                data: result
            };

            console.log('✅ SuperAppTenantV2Controller.getTrialTenants - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppTenantV2Controller.getTrialTenants - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get all tenants with simple filtering
     * GET /superapp/tenants/v2
     */
    static async getAllTenants(req, res) {
        try {
            console.log('🔍 SuperAppTenantV2Controller.getAllTenants - Fetching all tenants');

            const { tab, page = 1, limit = 20, search } = req.query;
            
            const result = await SuperAppTenantV2Service.getAllTenants(
                tab,
                search,
                parseInt(page),
                parseInt(limit)
            );

            const response = {
                success: true,
                data: result
            };

            console.log('✅ SuperAppTenantV2Controller.getAllTenants - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppTenantV2Controller.getAllTenants - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get tenant stats for dashboard
     * GET /superapp/tenants/v2/stats
     */
    static async getTenantStats(req, res) {
        try {
            console.log('🔍 SuperAppTenantV2Controller.getTenantStats - Fetching tenant stats');

            const stats = await SuperAppTenantV2Service.getTenantStats();

            const response = {
                success: true,
                data: stats
            };

            console.log('✅ SuperAppTenantV2Controller.getTenantStats - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppTenantV2Controller.getTenantStats - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Update tenant data
     * PUT /superapp/tenants/v2/:id
     */
    static async updateTenant(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            console.log('🔍 SuperAppTenantV2Controller.updateTenant - Updating tenant:', { id, updateData });

            const updatedTenant = await SuperAppTenantV2Service.updateTenant(parseInt(id), updateData);

            const response = {
                success: true,
                message: 'Tenant updated successfully',
                data: updatedTenant
            };

            console.log('✅ SuperAppTenantV2Controller.updateTenant - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppTenantV2Controller.updateTenant - Error:', error);
            
            // Handle specific errors
            if (error.message === 'Tenant not found') {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }
            
            if (error.message.includes('Invalid')) {
                return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
            }

            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }
}

module.exports = SuperAppTenantV2Controller;
