const DashboardService = require('../services/dashboardService');
const { ResponseHelper } = require('../helpers');

class DashboardController {
    static async genereteDashboardOverview(req, res) {
        try {
            const startDate = req.query.startDate ? req.query.startDate : moment().startOf('month').format('YYYY-MM-DD');
            const endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format('YYYY-MM-DD');

            const data = await DashboardService.genereteDashboardOverview(startDate, endDate);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async generateFinanceReport(req, res) {
        try {
            const raw = {
                month: req.query.month,
                year: req.query.year
            };
    
            const data = await DashboardService.generateFinanceReport(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
    

    static async generateStatusReport(req, res) {
        try {
            const raw = {
                month: req.query.month,
                year: req.query.year
            };

            const data = await DashboardService.generateStatusReport(raw);

            return res.status(200).json(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
   
};

module.exports = DashboardController;