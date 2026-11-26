const PaymentMethodService = require('../services/paymentMethodService');
const { ResponseHelper } = require('../helpers');

class PaymentMethodController {
  static async getAll(req, res) {
    try {
      const paymentMethods = await PaymentMethodService.getAll();
      return res.status(200).send(ResponseHelper.successResponse(paymentMethods));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const paymentMethod = await PaymentMethodService.getById(id);
      
      if (!paymentMethod) {
        return res.status(404).send(ResponseHelper.errorResponse('Payment method not found'));
      }
      
      return res.status(200).send(ResponseHelper.successResponse(paymentMethod));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async create(req, res) {
    try {
      const { name, code, type, icon, fee_percentage, fee_fixed } = req.body;
      
      // Validation
      if (!name || !code || !type) {
        return res.status(400).send(ResponseHelper.errorResponse('Name, code, and type are required'));
      }

      const paymentMethodData = {
        name,
        code,
        type,
        icon: icon || null,
        fee_percentage: fee_percentage || 0,
        fee_fixed: fee_fixed || 0,
        is_active: true
      };

      const newPaymentMethod = await PaymentMethodService.create(paymentMethodData);
      return res.status(201).send(ResponseHelper.successResponse(newPaymentMethod, 201));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, code, type, icon, fee_percentage, fee_fixed, is_active } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (type !== undefined) updateData.type = type;
      if (icon !== undefined) updateData.icon = icon;
      if (fee_percentage !== undefined) updateData.fee_percentage = fee_percentage;
      if (fee_fixed !== undefined) updateData.fee_fixed = fee_fixed;
      if (is_active !== undefined) updateData.is_active = is_active;

      const updatedPaymentMethod = await PaymentMethodService.update(id, updateData);
      
      if (!updatedPaymentMethod) {
        return res.status(404).send(ResponseHelper.errorResponse('Payment method not found'));
      }
      
      return res.status(200).send(ResponseHelper.successResponse(updatedPaymentMethod));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await PaymentMethodService.delete(id);
      
      if (!deleted) {
        return res.status(404).send(ResponseHelper.errorResponse('Payment method not found'));
      }
      
      return res.status(200).send(ResponseHelper.successResponse({ message: 'Payment method deleted successfully' }));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = PaymentMethodController;
