const MembershipService = require('../services/membershipService');
const { ResponseHelper } = require('../helpers');

class MembershipController {
    static async create(req, res) {
        try {
            const raw = {
                name: req.body.name,
                description: req.body.description,
                discount_percentage: req.body.discount_percentage,
                price: req.body.price,
                duration_days: req.body.duration_days,
                min_points: req.body.min_points !== undefined ? req.body.min_points : null, // Minimum lifetime_points untuk tier ini
                is_active: req.body.is_active !== undefined ? req.body.is_active : true
            };

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await MembershipService.create(raw, user_tenant_id, user_branch_id, user_role);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await MembershipService.getAll(search, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await MembershipService.getById(id, user_tenant_id, user_branch_id, user_role);

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
                description: req.body.description,
                discount_percentage: req.body.discount_percentage,
                price: req.body.price,
                duration_days: req.body.duration_days,
                min_points: req.body.min_points !== undefined ? req.body.min_points : null, // Minimum lifetime_points untuk tier ini
                is_active: req.body.is_active
            };

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await MembershipService.update(raw, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            await MembershipService.delete(id, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async toggleStatus(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await MembershipService.toggleStatus(id, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    /**
     * Get membership details with statistics and customers
     * GET /memberships/:id/details
     */
    static async getDetails(req, res) {
        try {
            const membershipId = parseInt(req.params.id, 10);
            
            // Get query parameters for filtering and pagination
            const filters = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                status: req.query.status || '', // 'active', 'expired', 'cancelled'
                search: req.query.search || ''
            };
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await MembershipService.getDetails(
                membershipId, 
                filters, 
                user_tenant_id, 
                user_branch_id, 
                user_role
            );

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
};

module.exports = MembershipController;