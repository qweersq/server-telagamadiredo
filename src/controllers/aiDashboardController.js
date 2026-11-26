const AiDashboardService = require('../services/aiDashboardService');
const { ResponseHelper } = require('../helpers');

class AiDashboardController {

    static async generateAIAnalysis(req, res) {
        try {
            const startDate = req.query.startDate || moment().startOf('month').format('YYYY-MM-DD');
            const endDate = req.query.endDate || moment().endOf('month').format('YYYY-MM-DD');

            const analysis = await AiDashboardService.generateAnalysis(startDate, endDate);

            return res.status(200).send(ResponseHelper.successResponse(analysis));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = AiDashboardController;