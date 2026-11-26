const CustomerDetailService = require('../services/customerDetailService');
const { ResponseHelper } = require('../helpers');

class CustomerDetailController {
    /**
     * Get customer basic info + summary metrics
     * GET /customers/:id/detail
     */
    static async getCustomerDetail(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerDetail(customer_id, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer payment history with pagination
     * GET /customers/:id/payments
     */
    static async getCustomerPayments(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerPayments(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer order history with pagination
     * GET /customers/:id/orders
     */
    static async getCustomerOrders(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerOrders(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer items & services history with pagination
     * GET /customers/:id/items-services
     */
    static async getCustomerItemsServices(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerItemsServices(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer follow-up history with pagination
     * GET /customers/:id/follow-ups
     */
    static async getCustomerFollowUps(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerFollowUps(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer shoes photos
     * GET /customers/:id/shoes-photos
     */
    static async getCustomerShoesPhotos(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerShoesPhotos(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer progress photos grouped by order details with pagination
     * GET /customers/:id/progress-photos
     */
    static async getCustomerProgressPhotos(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerProgressPhotos(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customer items history (grouped by item_id)
     * GET /customers/:id/items-history
     */
    static async getCustomerItemsHistory(req, res) {
        try {
            const customer_id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerDetailService.getCustomerItemsHistory(customer_id, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = CustomerDetailController;
