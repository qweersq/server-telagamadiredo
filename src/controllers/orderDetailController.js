const OrderDetailService = require('../services/orderDetailService');
const { ResponseHelper } = require('../helpers');

class OrderDetailController {
  static async create(req, res) {
    try {
      const raw = {
        order_id: parseInt(req.body.order_id, 10) || null,
        employee_id: parseInt(req.body.employee_id, 10) || null,
        treatment_id: parseInt(req.body.treatment_id, 10) || null,
        item_id: parseInt(req.body.item_id, 10) || null,
        price: req.body.price || null,
        due_date: req.body.due_date || null,
        discount_id: parseInt(req.body.discount_id, 10) || null,
        process_time: 'regular', // Default value
        process_time_cost: 0, // Process time cost dihilangkan
        final_price: req.body.final_price || null,
        status: req.body.status || null,
        description: req.body.description || null
      };

      const data = await OrderDetailService.create(raw);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      const data = await OrderDetailService.getAll();

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await OrderDetailService.getById(id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      // Ambil data lama dari DB
      const oldData = await OrderDetailService.getById(id);
      if (!oldData) {
        return res.status(404).send(ResponseHelper.errorResponse('OrderDetail not found'));
      }

      // Hanya update field yang dikirim di body
      const raw = { ...oldData.toJSON(), ...req.body, id };

      const data = await OrderDetailService.update(raw);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await OrderDetailService.delete(id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async orderDetailProcess(req, res) {
    try {
      const orderDetailId = parseInt(req.params.id, 10);
      const { old_status, new_status, photos } = req.body;
      const updated_by = req.body.updated_by || req.user?.id || null;
      // photos: array string url
      let photoUrls = [];
      if (Array.isArray(photos)) {
        photoUrls = photos;
      } else if (typeof photos === 'string') {
        // Jika hanya satu string, jadikan array
        photoUrls = [photos];
      }

      const result = await OrderDetailService.processStatusChange({
        orderDetailId,
        old_status,
        new_status,
        updated_by,
        photoUrls,
      });

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async cancelOnProgress(req, res) {
    try {
      const orderDetailId = parseInt(req.params.id, 10);
      
      if (isNaN(orderDetailId)) {
        return res.status(400).send(ResponseHelper.errorResponse('Invalid order detail ID', 400));
      }

      const result = await OrderDetailService.cancelOnProgressStatus(orderDetailId);

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async getPhotoHistory(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (!id) {
        return res.status(400).send(ResponseHelper.errorResponse('Invalid order detail ID', 400));
      }

      const data = await OrderDetailService.getPhotoHistory(id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
    }
  }
};


module.exports = OrderDetailController;