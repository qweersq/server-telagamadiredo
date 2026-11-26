const ResponseHelper = require('../helpers/responseHelper');
const SuperAppAdminService = require('../services/superAppAdminService');

class SuperAppAdminController {
    static async getStatistics(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            console.log('📊 SuperApp Admin Statistics Request:', {
                start_date,
                end_date,
                user_id: req.user?.id,
                role: req.user?.role
            });

            // Validate date parameters
            if (start_date && end_date) {
                const startDate = new Date(start_date);
                const endDate = new Date(end_date);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return res.status(400).send(ResponseHelper.errorResponse('Invalid date format. Use YYYY-MM-DD', 400));
                }
                
                if (startDate > endDate) {
                    return res.status(400).send(ResponseHelper.errorResponse('Start date cannot be after end date', 400));
                }
            }

            const statistics = await SuperAppAdminService.getStatistics(start_date, end_date);
            
            console.log('✅ SuperApp Admin Statistics Retrieved:', statistics);
            
            return res.status(200).send(ResponseHelper.successResponse(statistics));
        } catch (error) {
            console.error('❌ SuperAppAdminController.getStatistics - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async getTenantStatistics(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            console.log('📊 SuperApp Admin Tenant Statistics Request:', {
                start_date,
                end_date
            });

            const tenantStats = await SuperAppAdminService.getTenantStatistics(start_date, end_date);
            
            console.log('✅ SuperApp Admin Tenant Statistics Retrieved:', tenantStats);
            
            return res.status(200).send(ResponseHelper.successResponse(tenantStats));
        } catch (error) {
            console.error('❌ SuperAppAdminController.getTenantStatistics - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async getUserStatistics(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            console.log('📊 SuperApp Admin User Statistics Request:', {
                start_date,
                end_date
            });

            const userStats = await SuperAppAdminService.getUserStatistics(start_date, end_date);
            
            console.log('✅ SuperApp Admin User Statistics Retrieved:', userStats);
            
            return res.status(200).send(ResponseHelper.successResponse(userStats));
        } catch (error) {
            console.error('❌ SuperAppAdminController.getUserStatistics - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async getRevenueStatistics(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            console.log('📊 SuperApp Admin Revenue Statistics Request:', {
                start_date,
                end_date
            });

            const revenueStats = await SuperAppAdminService.getRevenueStatistics(start_date, end_date);
            
            console.log('✅ SuperApp Admin Revenue Statistics Retrieved:', revenueStats);
            
            return res.status(200).send(ResponseHelper.successResponse(revenueStats));
        } catch (error) {
            console.error('❌ SuperAppAdminController.getRevenueStatistics - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = SuperAppAdminController;
