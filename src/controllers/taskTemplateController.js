const TaskTemplateService = require('../services/taskTemplateService');
const { ResponseHelper } = require('../helpers');

class TaskTemplateController {
    static async create(req, res) {
        try {
            const data = await TaskTemplateService.create(
                req.body,
                req.user.tenant_id,
                req.user.role,
                req.user.id
            );

            return res.status(201).send(ResponseHelper.successResponse(data, 'Template tugas berhasil dibuat'));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const isActive = req.query.is_active !== undefined
                ? ['true', '1', 1].includes(String(req.query.is_active).toLowerCase())
                : undefined;

            const data = await TaskTemplateService.getAll({
                tenant_id: req.user.tenant_id,
                user_role: req.user.role,
                branch_id: req.query.branch_id ? parseInt(req.query.branch_id, 10) : null,
                position: req.query.position || null,
                search: req.query.search || null,
                is_active: isActive,
                page: parseInt(req.query.page, 10) || 1,
                pageSize: req.query.pageSize !== undefined ? parseInt(req.query.pageSize, 10) : 50,
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ TaskTemplateController.getAll - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getPositions(req, res) {
        try {
            const data = await TaskTemplateService.getPositions(
                req.user.tenant_id,
                req.user.role,
                req.query.branch_id ? parseInt(req.query.branch_id, 10) : null
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const data = await TaskTemplateService.getById(
                parseInt(req.params.id, 10),
                req.user.tenant_id,
                req.user.role
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan') ? 404 : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    static async update(req, res) {
        try {
            const data = await TaskTemplateService.update(
                parseInt(req.params.id, 10),
                req.body,
                req.user.tenant_id,
                req.user.role
            );

            return res.status(200).send(ResponseHelper.successResponse(data, 'Template tugas berhasil diperbarui'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan') ? 404 : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    static async delete(req, res) {
        try {
            await TaskTemplateService.delete(
                parseInt(req.params.id, 10),
                req.user.tenant_id,
                req.user.role
            );

            return res.status(200).send(ResponseHelper.successResponse(null, 'Template tugas berhasil dihapus'));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan') ? 404 : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    static async toggleStatus(req, res) {
        try {
            const data = await TaskTemplateService.toggleStatus(
                parseInt(req.params.id, 10),
                req.user.tenant_id,
                req.user.role
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            const status = error.message.includes('tidak ditemukan') ? 404 : 400;
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }
}

module.exports = TaskTemplateController;
