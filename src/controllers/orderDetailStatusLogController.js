const OrderDetailStatusLogService = require('../services/orderDetailStatusLogService');
const { ResponseHelper } = require('../helpers');

class OrderDetailStatusLogController {
    static async getHistoryByOrderDetailId(req, res) {
        try {
            const order_detail_id = parseInt(req.params.order_detail_id, 10);
            if (!order_detail_id || isNaN(order_detail_id)) {
                return res.status(400).send(ResponseHelper.errorResponse('ID order detail tidak valid'));
            }
            const data = await OrderDetailStatusLogService.getHistoryByOrderDetailId(order_detail_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = OrderDetailStatusLogController; 