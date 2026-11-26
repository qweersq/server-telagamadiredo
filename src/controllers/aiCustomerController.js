const AiCustomerService = require('../services/aiCustomerService');
const { ResponseHelper } = require('../helpers');

class AiCustomerController {
    static async analyzeCustomerPattern(req, res) {
        try {
            const customer_id = parseInt(req.params.customer_id, 10);
            const analysis = await AiCustomerService.analyzeCustomerPattern(customer_id);

            return res.status(200).send(ResponseHelper.successResponse(analysis));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
};

module.exports = AiCustomerController;