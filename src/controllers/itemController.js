const ItemService = require('../services/itemService');
const { ResponseHelper } = require('../helpers');

class ItemController {
  static async create(req, res) {
    try {
      const raw = {
        name: req.body.name,
        brand: req.body.brand,
        type: req.body.type,
        color: req.body.color,
        material: req.body.material,
        tenant_id: req.user.tenant_id
      };

      const data = await ItemService.create(raw, req.user.tenant_id);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async bulkCreate(req, res) {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).send(ResponseHelper.errorResponse('items array is required', 400));
      }

      const data = await ItemService.bulkCreate(items, req.user.tenant_id);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      const search = req.query.search;
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 10;
      
      const data = await ItemService.getAll(search, req.user.tenant_id, page, pageSize);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await ItemService.getById(id, req.user.tenant_id);

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
        brand: req.body.brand,
        type: req.body.type,
        color: req.body.color,
        material: req.body.material,
        tenant_id: req.user.tenant_id
      };

      const data = await ItemService.update(raw, req.user.tenant_id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await ItemService.delete(id, req.user.tenant_id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async searchItemsWithRelevance(req, res) {
    try {
      const { search } = req.query;
      const items = await ItemService.searchItemsWithRelevance(search, req.user.tenant_id);
      return res.status(200).send(ResponseHelper.successResponse(items));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
}

};

module.exports = ItemController;