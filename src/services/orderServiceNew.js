const OrderRepositoryNew = require('../repositories/orderRepositoryNew');

class OrderServiceNew {
  /**
   * NEW: Get all orders dengan Raw SQL Query
   * @param {Object} params - { page, pageSize, filter, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - { statistics, orders, pagination }
   */
  static async getAllNew({ page, pageSize, filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      const offset = (page - 1) * pageSize;
      const pageSizeInt = parseInt(pageSize, 10);

      // Kirim filter dinamis ke repository dengan Raw SQL (MINIMAL VERSION - WORKING)
      const { totalCount, orders } = await OrderRepositoryNew.getAllOrderNewRawMinimal({ 
        offset, 
        pageSizeInt, 
        filter, 
        user_tenant_id, 
        user_branch_id, 
        user_role 
      });

      const pagination = {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };

      // Hitung statistics dari seluruh dataset (tanpa pagination)
      const statistics = await OrderRepositoryNew.getStatisticsNewRaw({ 
        filter, 
        user_tenant_id, 
        user_branch_id, 
        user_role 
      });

      return { statistics, orders, pagination };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Export orders untuk Excel/CSV
   * @param {Object} params - { filter, user_tenant_id, user_branch_id, user_role }
   * @returns {String} - CSV content
   */
  static async exportOrders({ filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Convert filter start_date dan end_date ke entry_date
      const exportFilter = {};
      if (filter.start_date) {
        exportFilter.entry_date = { gte: filter.start_date };
      }
      if (filter.end_date) {
        exportFilter.entry_date = { ...exportFilter.entry_date, lte: filter.end_date };
      }

      // Panggil repository untuk export
      const csvData = await OrderRepositoryNew.exportOrdersData({
        filter: exportFilter,
        user_tenant_id,
        user_branch_id,
        user_role
      });

      return csvData;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = OrderServiceNew;
