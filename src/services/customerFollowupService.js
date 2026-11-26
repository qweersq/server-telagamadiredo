const CustomerFollowupRepository = require('../repositories/customerFollowupRepository');

class CustomerFollowupService {
  static async create(followupData) {
    try {
      const result = await CustomerFollowupRepository.create(followupData);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getHistory(user_tenant_id, user_branch_id, user_role, page = 1, limit = 20, customer_id = null, month = null, include_statistics = false) {
    try {
      const result = await CustomerFollowupRepository.getHistory(user_tenant_id, user_branch_id, user_role, page, limit, customer_id, month);
      
      const response = {
        followups: result.followups,
        pagination: {
          currentPage: page,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: limit,
          hasNextPage: page < result.totalPages,
          hasPrevPage: page > 1
        }
      };

      if (include_statistics) {
        const statistics = await CustomerFollowupRepository.getStatistics(user_tenant_id, user_branch_id, user_role, month);
        response.statistics = statistics;
      }

      return response;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getFollowedUpCustomers(user_tenant_id, user_branch_id, user_role, days = 14, page = 1, limit = 20) {
    try {
      const result = await CustomerFollowupRepository.getFollowedUpCustomers(user_tenant_id, user_branch_id, user_role, days, page, limit);
      
      return {
        customers: result.customers,
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

  static async getStatistics(user_tenant_id, user_branch_id, user_role, month = null) {
    try {
      const result = await CustomerFollowupRepository.getStatistics(user_tenant_id, user_branch_id, user_role, month);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async markAsSent(followupData) {
    try {
      const result = await CustomerFollowupRepository.markAsSent(followupData);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = CustomerFollowupService;
