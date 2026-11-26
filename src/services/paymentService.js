const PaymentRepository = require('../repositories/paymentRepository');

const moment = require('moment');

class PaymentService {
    static async create(data, user_tenant_id = null, user_role = null) {
        try {
            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            // Ensure tenant_id is set for data isolation
            if (user_tenant_id) {
                data.tenant_id = user_tenant_id;
            }

            const result = await PaymentRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(user_tenant_id = null, user_role = null) {
        try {
            const result = await PaymentRepository.getAll(user_tenant_id, user_role);
            if (!result || result.length === 0) throw new Error('No payment found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await PaymentRepository.getById(id, user_tenant_id, user_role);
            if (!result) throw new Error('Payment not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(raw.id) || raw.id <= 0) throw new Error('Invalid ID');

            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
            );

            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            const check = await PaymentRepository.getById(data.id, user_tenant_id, user_role);
            if (!check) throw new Error('Payment not found');

            const result = await PaymentRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await PaymentRepository.getById(id, user_tenant_id, user_role);
            if (!check) throw new Error('Payment not found');

            await PaymentRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = PaymentService