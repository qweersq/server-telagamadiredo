const DiscountService = require('../services/discountService');
const { ResponseHelper } = require('../helpers');

class DiscountController {
  static async create(req, res) {
    try {
      const raw = {
        name: req.body.name,
        type: req.body.type,
        discount: req.body.discount,
        tenant_id: req.user.tenant_id
      };

      const data = await DiscountService.create(raw);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      const search = req.query.search;
      const tenant_id = req.user.tenant_id;
      const data = await DiscountService.getAll(search, tenant_id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const tenant_id = req.user.tenant_id;
      const data = await DiscountService.getById(id, tenant_id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const raw = {
        id: parseInt(req.params.id, 10),
        name: req.body.name,
        type: req.body.type,
        discount: req.body.discount,
        tenant_id: req.user.tenant_id
      };

      const data = await DiscountService.update(raw);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const tenant_id = req.user.tenant_id;
      await DiscountService.delete(id, tenant_id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async toggleStatus(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const tenant_id = req.user.tenant_id;
      const data = await DiscountService.toggleStatus(id, tenant_id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };
};

module.exports = DiscountController;