const TenantTabRepository = require('../repositories/tenantTabRepository');

class TenantTabService {
    /**
     * Get unverified tenants
     */
    static async getUnverifiedTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getUnverifiedTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getUnverifiedTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get active trial tenants
     */
    static async getActiveTrialTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getActiveTrialTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getActiveTrialTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get expired trial tenants
     */
    static async getExpiredTrialTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getExpiredTrialTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getExpiredTrialTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get active tenants
     */
    static async getActiveTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getActiveTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getActiveTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get expired tenants
     */
    static async getExpiredTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getExpiredTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getExpiredTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get last access trial tenants
     */
    static async getLastAccessTrialTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getLastAccessTrialTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getLastAccessTrialTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get last access subscription tenants
     */
    static async getLastAccessSubscriptionTenants(params) {
        try {
            const { page, limit } = params;
            
            const result = await TenantTabRepository.getLastAccessSubscriptionTenants({
                page,
                limit
            });

            return result;
        } catch (error) {
            console.error('TenantTabService.getLastAccessSubscriptionTenants error:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = TenantTabService;
