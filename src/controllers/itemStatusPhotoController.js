const ItemStatusPhotoService = require('../services/itemStatusPhotoService');
const { ResponseHelper } = require('../helpers');

class ItemStatusPhotoController {
    static async create(req, res) {
        try {
            const data = await ItemStatusPhotoService.create(req.body);
            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const data = await ItemStatusPhotoService.getAll();
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const data = await ItemStatusPhotoService.getById(req.params.id);
            if (!data) return res.status(404).send(ResponseHelper.errorResponse('Not found', 404));
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async update(req, res) {
        try {
            const data = await ItemStatusPhotoService.update(req.params.id, req.body);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async delete(req, res) {
        try {
            await ItemStatusPhotoService.delete(req.params.id);
            return res.status(204).send();
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }
}

module.exports = ItemStatusPhotoController; 