const DeliveryRepository = require('../repositories/deliveryRepository');

const moment = require('moment');

class DeliveryService {
  static async create(raw, delivery_details) {
    try {
      if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

      const result = await DeliveryRepository.create(raw, delivery_details);

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getAll({ page, pageSize, startDate, endDate, search, month, year, user_id }) {
    try {
      if (isNaN(page) || page <= 0) throw new Error('Page must be a positive integer');
      if (![10, 20, 50, 100].includes(pageSize)) throw new Error('Page size must be one of the following: 10, 20, 50, 100');
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new Error('Start date cannot be later than end date');
      
      const result = await DeliveryRepository.getAll({ page, pageSize, startDate, endDate, search, month, year, user_id });
      if (!result || result.length === 0) throw new Error('No devliery found');

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getById(id) {
    try {
      const result = await DeliveryRepository.getById(id);
      if (!result) throw new Error('Delivery not found');

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async update(raw, delivery_details) {
    try {
      const data = Object.fromEntries(
        Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
      );

      if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

      const check = await DeliveryRepository.getById(data.id);
      if (!check) throw new Error('Delivery not found');

      const result = await DeliveryRepository.update(data, delivery_details);

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async delete(id) {
    try {
      const check = await DeliveryRepository.getById(id);
      if (!check) throw new Error('Delivery not found');

      await DeliveryRepository.delete(id);

      return null;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async createOdoData(data) {
    return await DeliveryRepository.createOdoData(data);
  }
};

module.exports = DeliveryService;