const DeliveryDetailRepository = require('../repositories/deliveryDetailRepository');

const moment = require('moment');

class DevlieryDetailService {
    static async create(data) {
        try {
            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            const result = await DeliveryDetailRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll() {
        try {
            const result = await DeliveryDetailRepository.getAll();
            if (!result || result.length === 0) throw new Error('No delivery detail found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await DeliveryDetailRepository.getById(id);
            if (!result) throw new Error('Delivery Detail not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw) {
        try {
            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
            );

            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            const check = await DeliveryDetailRepository.getById(data.id);
            if (!check) throw new Error('Delivery Detail not found');

            const result = await DeliveryDetailRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            const check = await DeliveryDetailRepository.getById(id);
            if (!check) throw new Error('Delivery Detail not found');

            await DeliveryDetailRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = DevlieryDetailService;