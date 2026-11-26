const DashboardProfitOverviewService = require('../services/dashboardProfitOverviewService');
const { ResponseHelper } = require('../helpers');

class DashboardProfitOverviewController {
    static async dashboardProfitOverview(req, res) {
        try {
            const raw = {
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const data = await DashboardProfitOverviewService.dashboardProfitOverview(raw);
    
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
};

module.exports = DashboardProfitOverviewController;