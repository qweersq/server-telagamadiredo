const TenantTabService = require('../services/tenantTabService');
const ResponseHelper = require('../helpers/responseHelper');

class TenantTabController {
    /**
     * Get unverified tenants
     * GET /tenants/unverified
     */
    static async getUnverifiedTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getUnverifiedTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting unverified tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant belum verifikasi'));
        }
    }

    /**
     * Get active trial tenants
     * GET /tenants/active-trial
     */
    static async getActiveTrialTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getActiveTrialTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting active trial tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant trial aktif'));
        }
    }

    /**
     * Get expired trial tenants
     * GET /tenants/expired-trial
     */
    static async getExpiredTrialTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getExpiredTrialTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting expired trial tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant trial expired'));
        }
    }

    /**
     * Get active tenants
     * GET /tenants/active
     */
    static async getActiveTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getActiveTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting active tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant aktif'));
        }
    }

    /**
     * Get expired tenants
     * GET /tenants/expired-tenant
     */
    static async getExpiredTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getExpiredTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting expired tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant expired'));
        }
    }

    /**
     * Get last access trial tenants
     * GET /tenants/last-access-trial
     */
    static async getLastAccessTrialTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getLastAccessTrialTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting last access trial tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant trial terakhir akses'));
        }
    }

    /**
     * Get last access subscription tenants
     * GET /tenants/last-access-subscription
     */
    static async getLastAccessSubscriptionTenants(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const data = await TenantTabService.getLastAccessSubscriptionTenants({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('Error getting last access subscription tenants:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data tenant subscription terakhir akses'));
        }
    }
}

module.exports = TenantTabController;
