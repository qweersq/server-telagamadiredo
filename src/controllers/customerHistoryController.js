const CustomerHistoryService = require('../services/customerHistoryService');
const { ResponseHelper } = require('../helpers');

class CustomerHistoryController {
    static async getCustomerHistory(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                status: req.query.status
            };

            const raw = {
                customer_id: parseInt(req.params.customer_id, 10),
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                filters: filters
            }

            const result = await CustomerHistoryService.getCustomerHistory(raw);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = CustomerHistoryController;