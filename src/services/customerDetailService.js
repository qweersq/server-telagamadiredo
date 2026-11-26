const CustomerDetailRepository = require('../repositories/customerDetailRepository');

class CustomerDetailService {
    /**
     * Get customer basic info + summary metrics
     * ✅ Validates expired memberships real-time
     */
    static async getCustomerDetail(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const data = await CustomerDetailRepository.getCustomerDetail(customer_id, user_tenant_id, user_branch_id, user_role);
            
            // ✅ Validasi expired membership real-time
            if (data.customer && data.customer.current_membership) {
                const membership = data.customer.current_membership;
                const now = new Date();
                
                // Cek jika membership adalah paid membership (payment_id tidak null) dan sudah expired
                if (membership.payment_id !== null && 
                    membership.payment_id !== undefined && 
                    membership.end_date && 
                    new Date(membership.end_date) <= now) {
                    // Membership sudah expired, set current_membership jadi null
                    console.log(`ℹ️ CustomerDetailService.getCustomerDetail - Customer ${customer_id} has expired paid membership (end_date: ${membership.end_date}), setting current_membership to null`);
                    data.customer.current_membership = null;
                    data.customer.current_membership_id = null;
                }
                // Jika status bukan 'active', juga set jadi null
                else if (membership.status !== 'active') {
                    console.log(`ℹ️ CustomerDetailService.getCustomerDetail - Customer ${customer_id} has inactive membership (status: ${membership.status}), setting current_membership to null`);
                    data.customer.current_membership = null;
                    data.customer.current_membership_id = null;
                }
            }
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer payment history with pagination
     */
    static async getCustomerPayments(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const data = await CustomerDetailRepository.getCustomerPayments(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer order history with pagination
     */
    static async getCustomerOrders(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const data = await CustomerDetailRepository.getCustomerOrders(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer items & services history with pagination
     */
    static async getCustomerItemsServices(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 20) {
        try {
            const data = await CustomerDetailRepository.getCustomerItemsServices(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer follow-up history with pagination
     */
    static async getCustomerFollowUps(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const data = await CustomerDetailRepository.getCustomerFollowUps(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer shoes photos with pagination
     */
    static async getCustomerShoesPhotos(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 20) {
        try {
            const data = await CustomerDetailRepository.getCustomerShoesPhotos(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer progress photos grouped by order details with pagination
     */
    static async getCustomerProgressPhotos(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const data = await CustomerDetailRepository.getCustomerProgressPhotos(customer_id, user_tenant_id, user_branch_id, user_role, page, limit);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer items history (grouped by item_id)
     */
    static async getCustomerItemsHistory(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const data = await CustomerDetailRepository.getCustomerItemsHistory(customer_id, user_tenant_id, user_branch_id, user_role);
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = CustomerDetailService;
