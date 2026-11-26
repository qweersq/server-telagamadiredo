const OrderDetailStatusLogRepository = require('../repositories/orderDetailStatusLogRepository');

class OrderDetailStatusLogService {
    static async getHistoryByOrderDetailId(order_detail_id) {
        return await OrderDetailStatusLogRepository.getByOrderDetailId(order_detail_id);
    }
}

module.exports = OrderDetailStatusLogService; 