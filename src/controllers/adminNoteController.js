const AdminNoteService = require('../services/adminNoteService');
const { ResponseHelper } = require('../helpers');

class AdminNoteController {
    static async create(req, res) {
        try {
            const raw = {
                title: req.body.title,
                content: req.body.content,
                customer_id: req.body.customer_id ? parseInt(req.body.customer_id, 10) : null,
                order_id: req.body.order_id ? parseInt(req.body.order_id, 10) : null,
                status: req.body.status || 'pending',
                priority: req.body.priority || 'normal',
                due_date: req.body.due_date || null,
                created_by: req.user.id,
                tenant_id: req.user.tenant_id,
                branch_id: parseInt(req.body.branch_id, 10) || req.user.branch_id
            };

            const data = await AdminNoteService.create(raw);
            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const raw = {
                page: parseInt(req.query.page, 10) || 1,
                pageSize: parseInt(req.query.pageSize, 10) || 20,
                tenant_id: req.user.tenant_id,
                branch_id: parseInt(req.query.branch_id, 10) || req.user.branch_id,
                status: req.query.status || 'all',
                priority: req.query.priority || 'all',
                customer_id: req.query.customer_id ? parseInt(req.query.customer_id, 10) : null,
                order_id: req.query.order_id ? parseInt(req.query.order_id, 10) : null,
                search: req.query.search || null,
                dueDateFilter: req.query.dueDateFilter || null // overdue, due_today, due_this_week, due_this_month
            };

            if (!raw.tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id is required', 400));
            }
            if (!raw.branch_id) {
                return res.status(400).send(ResponseHelper.errorResponse('branch_id is required', 400));
            }

            const data = await AdminNoteService.getAll(raw);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const branch_id = parseInt(req.query.branch_id, 10) || req.user.branch_id;

            const data = await AdminNoteService.getById(id, tenant_id, branch_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async update(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const branch_id = parseInt(req.body.branch_id, 10) || req.user.branch_id;
            const user_id = req.user.id;

            const raw = {
                title: req.body.title,
                content: req.body.content,
                customer_id: req.body.customer_id !== undefined ? (req.body.customer_id ? parseInt(req.body.customer_id, 10) : null) : undefined,
                order_id: req.body.order_id !== undefined ? (req.body.order_id ? parseInt(req.body.order_id, 10) : null) : undefined,
                status: req.body.status,
                priority: req.body.priority,
                due_date: req.body.due_date !== undefined ? (req.body.due_date || null) : undefined
            };

            const data = await AdminNoteService.update(id, raw, tenant_id, branch_id, user_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async markAsDone(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const branch_id = parseInt(req.body.branch_id, 10) || req.user.branch_id;
            const user_id = req.user.id;

            const data = await AdminNoteService.markAsDone(id, tenant_id, branch_id, user_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const branch_id = parseInt(req.query.branch_id, 10) || req.user.branch_id;

            await AdminNoteService.delete(id, tenant_id, branch_id);
            return res.status(200).send(ResponseHelper.successResponse({ message: 'Admin note deleted successfully' }));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getPendingCount(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branch_id = parseInt(req.query.branch_id, 10) || req.user.branch_id;

            const count = await AdminNoteService.getPendingCount(tenant_id, branch_id);
            return res.status(200).send(ResponseHelper.successResponse({ count }));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = AdminNoteController;

