const CustomerMembershipService = require('../services/customerMembershipService');
const { ResponseHelper } = require('../helpers');

class CustomerMembershipController {
    static async create(req, res) {
        try {
            const raw = {
                customer_id: req.body.customer_id,
                membership_id: req.body.membership_id,
                payment_id: req.body.payment_id || null, // ✅ Accept payment_id from request body
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                status: req.body.status || 'active'
            };

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await CustomerMembershipService.create(raw, user_tenant_id, user_branch_id, user_role);
            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerMembershipService.getAll(search, user_tenant_id, user_branch_id, user_role, page, limit);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerMembershipService.getById(id, user_tenant_id, user_branch_id, user_role);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async update(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Get current membership to preserve payment_id
            const CustomerMembershipService = require('../services/customerMembershipService');
            const currentMembership = await CustomerMembershipService.getById(id, req.user.tenant_id, req.user.branch_id, req.user.role);
            
            const raw = {
                customer_id: req.body.customer_id,
                membership_id: req.body.membership_id,
                payment_id: req.body.payment_id !== undefined ? req.body.payment_id : (currentMembership?.payment_id || null), // Preserve payment_id if not provided
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                status: req.body.status
            };

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await CustomerMembershipService.update(id, raw, user_tenant_id, user_branch_id, user_role);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            await CustomerMembershipService.delete(id, user_tenant_id, user_branch_id, user_role);
            return res.status(200).send(ResponseHelper.successResponse(null, 200, 'Customer membership deleted successfully'));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = CustomerMembershipController;
