const SuperAppTenantV2Repository = require('../repositories/superAppTenantV2Repository');

/**
 * SuperApp Tenant V2 Service
 * Simple service for tenant management with trial filtering
 */
class SuperAppTenantV2Service {
    
    /**
     * Get trial tenants (status: trial, subscription_status: trial)
     */
    static async getTrialTenants(search, page, limit) {
        try {
            console.log('🔍 SuperAppTenantV2Service.getTrialTenants - Fetching trial tenants');
            
            const offset = (page - 1) * limit;
            
            const result = await SuperAppTenantV2Repository.getTrialTenants(search, limit, offset);
            
            console.log('✅ SuperAppTenantV2Service.getTrialTenants - Success');
            return result;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Service.getTrialTenants - Error:', error);
            throw error;
        }
    }

    /**
     * Get all tenants with simple filtering
     */
    static async getAllTenants(tab, search, page, limit) {
        try {
            console.log('🔍 SuperAppTenantV2Service.getAllTenants - Fetching all tenants');
            
            const offset = (page - 1) * limit;
            
            const result = await SuperAppTenantV2Repository.getAllTenants(tab, search, limit, offset);
            
            console.log('✅ SuperAppTenantV2Service.getAllTenants - Success');
            return result;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Service.getAllTenants - Error:', error);
            throw error;
        }
    }

    /**
     * Get tenant stats for dashboard
     */
    static async getTenantStats() {
        try {
            console.log('🔍 SuperAppTenantV2Service.getTenantStats - Fetching tenant stats');
            
            const stats = await SuperAppTenantV2Repository.getTenantStats();
            
            console.log('✅ SuperAppTenantV2Service.getTenantStats - Success');
            return stats;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Service.getTenantStats - Error:', error);
            throw error;
        }
    }

    /**
     * Update tenant data
     */
    static async updateTenant(tenantId, updateData) {
        try {
            console.log('🔍 SuperAppTenantV2Service.updateTenant - Updating tenant:', tenantId);
            
            // Validate required fields
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }

            // Validate status values if provided
            if (updateData.status) {
                const validStatuses = ['active', 'inactive', 'suspended', 'trial', 'pending_payment'];
                if (!validStatuses.includes(updateData.status)) {
                    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
                }
            }

            if (updateData.subscription_status) {
                const validSubscriptionStatuses = ['trial', 'active', 'expired', 'cancelled', 'pending_payment'];
                if (!validSubscriptionStatuses.includes(updateData.subscription_status)) {
                    throw new Error(`Invalid subscription_status. Must be one of: ${validSubscriptionStatuses.join(', ')}`);
                }
            }

            // Validate trial_end_date if provided
            if (updateData.trial_end_date && isNaN(Date.parse(updateData.trial_end_date))) {
                throw new Error('Invalid trial_end_date format');
            }

            const updatedTenant = await SuperAppTenantV2Repository.updateTenant(tenantId, updateData);
            
            console.log('✅ SuperAppTenantV2Service.updateTenant - Success');
            return updatedTenant;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Service.updateTenant - Error:', error);
            throw error;
        }
    }
}

module.exports = SuperAppTenantV2Service;
