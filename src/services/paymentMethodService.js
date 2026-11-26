const { PaymentMethod } = require('../models');

class PaymentMethodService {
  static async getAll() {
    try {
      const paymentMethods = await PaymentMethod.findAll({
        order: [['created_at', 'DESC']]
      });
      return paymentMethods;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getById(id) {
    try {
      const paymentMethod = await PaymentMethod.findByPk(id);
      return paymentMethod;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async create(data) {
    try {
      const paymentMethod = await PaymentMethod.create(data);
      return paymentMethod;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async update(id, data) {
    try {
      const [updatedRowsCount] = await PaymentMethod.update(data, {
        where: { id }
      });
      
      if (updatedRowsCount === 0) {
        return null;
      }
      
      const updatedPaymentMethod = await PaymentMethod.findByPk(id);
      return updatedPaymentMethod;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async delete(id) {
    try {
      const deletedRowsCount = await PaymentMethod.destroy({
        where: { id }
      });
      
      return deletedRowsCount > 0;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = PaymentMethodService;
