
const { PaymentLog } = require('../models');

class PaymentLogRepository {
    static async create(data, transaction) {
        try {
            const result = await PaymentLog.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await PaymentLog.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async bulkCreate(data, transaction) {
        try {
            const result = await PaymentLog.bulkCreate(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = PaymentLogRepository;