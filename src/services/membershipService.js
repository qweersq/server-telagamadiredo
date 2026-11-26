const MembershipRepository = require('../repositories/membershipRepository');

class MembershipService {
    static async create(data, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            // Add tenant_id and branch_id to membership data for data isolation
            if (user_tenant_id) {
                data.tenant_id = user_tenant_id;
            }
            if (user_branch_id) {
                data.branch_id = user_branch_id;
            }

            const result = await MembershipRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const result = await MembershipRepository.getAll(search, user_tenant_id, user_branch_id, user_role, page, limit);
            
            return {
                memberships: result.memberships,
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await MembershipRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            if (!result) throw new Error('Membership not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(data, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

            const check = await MembershipRepository.getById(data.id, user_tenant_id, user_branch_id, user_role);
            if (!check) throw new Error('Membership not found');

            const result = await MembershipRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await MembershipRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            if (!check) throw new Error('Membership not found');

            // Remove from customer's current_membership_id if this is the current membership
            if (check.customer_id) {
                await MembershipRepository.updateCustomerCurrentMembership(check.customer_id, null);
            }

            await MembershipRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async toggleStatus(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const result = await MembershipRepository.toggleStatus(id, user_tenant_id, user_branch_id, user_role);
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get membership details with statistics and customers
     */
    static async getDetails(membershipId, filters, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(membershipId) || membershipId <= 0) throw new Error('Invalid membership ID');

            // Get membership info
            const membership = await MembershipRepository.getById(membershipId, user_tenant_id, user_branch_id, user_role);
            if (!membership) throw new Error('Membership not found');

            // Get statistics
            const statistics = await MembershipRepository.getStatistics(membershipId, user_tenant_id, user_branch_id, user_role);

            // Get customers with pagination
            const customersResult = await MembershipRepository.getCustomers(membershipId, filters, user_tenant_id, user_branch_id, user_role);

            return {
                membership,
                statistics,
                customers: customersResult.customers,
                pagination: customersResult.pagination
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = MembershipService;