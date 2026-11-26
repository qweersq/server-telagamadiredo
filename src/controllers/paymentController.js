const PaymentService = require('../services/paymentService');
const { ResponseHelper } = require('../helpers');
const PaymentDetailRepository = require('../repositories/paymentDetailRepository');
const moment = require('moment');

class PaymentController {
  static async create(req, res) {
    try {
      const raw = {
        code: req.body.code,
        status: req.body.status,
        method: req.body.method,
        total_process_time_cost: 0, // Process time cost dihilangkan
        total_discount: req.body.total_discount,
        total_price: req.body.total_price,
        final_price: req.body.final_price,
        date: req.body.date,
        money: req.body.money,
        change: req.body.change,
        evidence_photo: req.body.evidence_photo,
        tenant_id: req.user.tenant_id
      };

      const data = await PaymentService.create(raw, req.user.tenant_id, req.user.role);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getAll(req, res) {
    try {
      const data = await PaymentService.getAll(req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await PaymentService.getById(id, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const raw = {
        id: parseInt(req.params.id, 10),
        code: req.body.code,
        status: req.body.status,
        method: req.body.method,
        total_process_time_cost: 0, // Process time cost dihilangkan
        total_discount: req.body.total_discount,
        total_price: req.body.total_price,
        final_price: req.body.final_price,
        date: req.body.date,
        money: req.body.money,
        change: req.body.change,
        evidence_photo: req.body.evidence_photo,
      };

      const data = await PaymentService.update(raw, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await PaymentService.delete(id, req.user.tenant_id, req.user.role);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };


  static async getPaymentDetailsByPaymentId(req, res) {
    try {
      const paymentId = parseInt(req.params.id, 10);
      const data = await PaymentDetailRepository.getByPaymentId(paymentId);
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Update payment detail date
   * PATCH /api/payment-details/:id/date
   */
  static async updatePaymentDetailDate(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { new_date } = req.body;

      if (!new_date) {
        return res.status(400).send(ResponseHelper.errorResponse('new_date is required'));
      }

      const data = await PaymentDetailRepository.updateDate(id, moment(new_date).format('YYYY-MM-DD HH:mm:ss'));
      return res.status(200).send(ResponseHelper.successResponse(data, 200, 'Payment detail date updated successfully'));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
};

module.exports = PaymentController;