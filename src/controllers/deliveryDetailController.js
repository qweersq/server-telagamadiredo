const DeliveryDetailService = require('../services/deliveryDetailService');
const { ResponseHelper } = require('../helpers');

class DeliveryDetailController {
  static async create(req, res) {
    try {
      const raw = {
        order_id: parseInt(req.body.order_id, 10),
        delivery_id: parseInt(req.body.delivery_id, 10),
        address: req.body.address,
        date: req.body.date,
        type: req.body.type,
        photo_url: req.body.photo_url,
        description: req.body.description,
        distance: req.body.distance,
        cost: req.body.cost,
      };      

      const data = await DeliveryDetailService.create(raw);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getAll(req, res) {
    try {
      const data = await DeliveryDetailService.getAll();

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await DeliveryDetailService.getById(id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const raw = {
        id: parseInt(req.params.id, 10),
        order_id: parseInt(req.body.order_id, 10),
        delivery_id: parseInt(req.body.delivery_id, 10),
        address: req.body.address,
        date: req.body.date,
        type: req.body.type,
        photo_url: req.body.photo_url,
        description: req.body.description,
        distance: req.body.distance,
        cost: req.body.cost,
      };   

      const data = await DeliveryDetailService.update(raw);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await DeliveryDetailService.delete(id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };
};

module.exports = DeliveryDetailController;