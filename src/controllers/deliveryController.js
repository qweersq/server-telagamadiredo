const DeliveryService = require('../services/deliveryService');
const { ResponseHelper } = require('../helpers');

class DevliveryController {
  static async create(req, res) {
    try {
      const raw = {
        users_id: req.body.users_id,
        quantity: req.body.quantity,
        date: req.body.date,
        total_distance: req.body.total_distance,
        total_cost: req.body.total_cost
      };

      const delivery_details = req.body.delivery_details;

      const data = await DeliveryService.create(raw, delivery_details);
  
      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      const raw = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 10,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        month: req.query.month,
        year: req.query.year,
        user_id: req.query.user_id
      };

      const data = await DeliveryService.getAll(raw);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await DeliveryService.getById(id);
  
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const raw = {
        id: parseInt(req.params.id, 10),
        users_id: req.body.users_id,
        quantity: req.body.quantity,
        date: req.body.date,
        total_distance: req.body.total_distance,
        total_cost: req.body.total_cost
      };

      const delivery_details = req.body.delivery_details;
  
      const data = await DeliveryService.update(raw, delivery_details);
  
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await DeliveryService.delete(id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async createOdoData(req, res) {
    try {
      const raw = {
        users_id: req.body.users_id,
        quantity: req.body.quantity,
        date: req.body.date,
        odo_start: req.body.odoStart,
        odo_end: req.body.odoEnd,
        total_distance: req.body.totalDistance,
        total_cost: req.body.totalCost,
        odo_start_photo_url: req.body.odoStartPhoto,
        odo_end_photo_url: req.body.odoEndPhoto,
      };

      const data = await DeliveryService.createOdoData(raw);
      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }
};

module.exports = DevliveryController;