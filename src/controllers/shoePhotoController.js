const ShoesPhotoService = require('../services/shoePhotoService');
const { ResponseHelper } = require('../helpers');

class ShoePhotoConotroller {
  static async create(req, res) {
    try {
      const raw = {
        order_detail_id: req.body.order_detail_id,
        url_photo: req.body.url_photo
      };

      const data = await ShoesPhotoService.create(raw);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      const data = await ShoesPhotoService.getAll();

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await ShoesPhotoService.getById(id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const raw = {
        id: parseInt(req.params.id, 10),
        order_detail_id: req.body.order_detail_id,
        url_photo: req.body.url_photo
      };

      const data = await ShoesPhotoService.update(raw);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await ShoesPhotoService.delete(id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
};

module.exports = ShoePhotoConotroller;