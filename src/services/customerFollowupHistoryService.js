const CustomerFollowupHistoryRepository = require('../repositories/customerFollowupHistoryRepository');

/**
 * Service untuk riwayat follow-up customer.
 * Thin wrapper: memvalidasi parameter request lalu memanggil repository.
 */
class CustomerFollowupHistoryService {
  static async getHistory(user_tenant_id, user_branch_id, user_role, params = {}) {
    try {
      return await CustomerFollowupHistoryRepository.getHistory({
        user_tenant_id,
        user_branch_id,
        user_role,
        ...params,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getFollowedUpCustomers(user_tenant_id, user_branch_id, user_role, params = {}) {
    try {
      return await CustomerFollowupHistoryRepository.getFollowedUpCustomers({
        user_tenant_id,
        user_branch_id,
        user_role,
        ...params,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getSummary(user_tenant_id, user_branch_id, user_role, params = {}) {
    try {
      return await CustomerFollowupHistoryRepository.getSummary({
        user_tenant_id,
        user_branch_id,
        user_role,
        ...params,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getCustomerHistory(user_tenant_id, user_branch_id, user_role, customer_id, params = {}) {
    try {
      const result = await CustomerFollowupHistoryRepository.getCustomerHistory({
        user_tenant_id,
        user_branch_id,
        user_role,
        customer_id,
        ...params,
      });

      if (!result.customer) {
        const err = new Error('Customer tidak ditemukan atau di luar cakupan akses Anda');
        err.statusCode = 404;
        throw err;
      }

      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CustomerFollowupHistoryService;
