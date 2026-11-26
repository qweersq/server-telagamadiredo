const ResponseHelper = require('../helpers/responseHelper');
const AppVersionService = require('../services/appVersionService');

class AppVersionController {
    static async create(req, res) {
        try {
            const data = {
                platform: req.body.platform,
                version: req.body.version,
                version_code: req.body.version_code || null,
                min_required_version: req.body.min_required_version || req.body.version,
                force_update: req.body.force_update || false,
                update_message: req.body.update_message || null,
                features: req.body.features || [],
                is_active: req.body.is_active !== undefined ? req.body.is_active : true
            };

            const result = await AppVersionService.create(data);
            
            return res.status(201).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ AppVersionController.create - Error:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const { platform } = req.query;
            const result = await AppVersionService.getAll(platform);
            
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ AppVersionController.getAll - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await AppVersionService.getById(id);
            
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ AppVersionController.getById - Error:', error);
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    static async checkVersion(req, res) {
        try {
            const { platform } = req.query;
            const { version } = req.query;

            if (!platform || !version) {
                return res.status(400).send(ResponseHelper.errorResponse('platform and version are required', 400));
            }

            const result = await AppVersionService.checkVersion(platform, version);
            
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ AppVersionController.checkVersion - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const data = {
                platform: req.body.platform,
                version: req.body.version,
                version_code: req.body.version_code,
                min_required_version: req.body.min_required_version,
                force_update: req.body.force_update,
                update_message: req.body.update_message,
                features: req.body.features,
                is_active: req.body.is_active
            };

            // Remove undefined values
            Object.keys(data).forEach(key => {
                if (data[key] === undefined) {
                    delete data[key];
                }
            });

            const result = await AppVersionService.update(id, data);
            
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ AppVersionController.update - Error:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await AppVersionService.delete(id);
            
            return res.status(200).send(ResponseHelper.successResponse({ message: 'App version deleted successfully' }));
        } catch (error) {
            console.error('❌ AppVersionController.delete - Error:', error);
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }
}

module.exports = AppVersionController;

