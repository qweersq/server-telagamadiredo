const { OrderDetailStatusLog } = require('../models');

class OrderDetailStatusLogRepository {
    static async create(data, transaction = null) {
        return await OrderDetailStatusLog.create(data, { transaction });
    }

    static async getAll() {
        return await OrderDetailStatusLog.findAll();
    }

    static async getById(id) {
        return await OrderDetailStatusLog.findByPk(id);
    }

    static async update(id, data) {
        const log = await OrderDetailStatusLog.findByPk(id);
        if (!log) throw new Error('OrderDetailStatusLog not found');
        return await log.update(data);
    }

    static async delete(id) {
        const log = await OrderDetailStatusLog.findByPk(id);
        if (!log) throw new Error('OrderDetailStatusLog not found');
        return await log.destroy();
    }

    static async getByOrderDetailId(order_detail_id) {
        return await OrderDetailStatusLog.findAll({
            where: { order_detail_id },
            order: [['created_at', 'DESC']],
            include: [
                {
                    association: 'item_status_photos',
                    attributes: ['id', 'photo_url']
                },
                {
                    association: 'status_updater',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });
    }
}

module.exports = OrderDetailStatusLogRepository; 