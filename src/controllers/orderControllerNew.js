const OrderServiceNew = require('../services/orderServiceNew');
const ResponseHelper = require('../helpers/responseHelper');

class OrderControllerNew {
  /**
   * NEW: Get all orders dengan Raw SQL Query
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getAllNew(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 10;

      // Ambil filter dinamis dari query (bisa dari filter[field]=value atau filter sebagai JSON string)
      let filter = {};
      if (req.query.filter) {
        if (typeof req.query.filter === 'string') {
          // Support ?filter={...} (JSON string)
          try {
            filter = JSON.parse(req.query.filter);
          } catch (e) {
            // Support ?filter[field]=value
            filter = req.query.filter;
          }
        } else {
          filter = req.query.filter;
        }
      }

      // Support legacy: jika ada startDate, endDate, dst, masukkan ke filter
      const legacyFields = ['startDate', 'endDate', 'dueStartDate', 'dueEndDate', 'paymentStartDate', 'paymentEndDate', 'paymentDetailStartDate', 'paymentDetailEndDate', 'search'];
      legacyFields.forEach((f) => {
        if (req.query[f]) filter[f] = req.query[f];
      });

      const raw = {
        page,
        pageSize,
        filter,
      };

      // Add user context for data isolation (security: always use JWT token)
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : req.user.branch_id;
      const user_role = req.user.role;

      const data = await OrderServiceNew.getAllNew({
        ...raw,
        user_tenant_id,
        user_branch_id,
        user_role
      });
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Export orders data untuk Excel/CSV
   * GET /orders-new-raw/export
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async exportOrders(req, res) {
    try {
      // Ambil filter: start_date, end_date, branch_id
      let filter = {};
      if (req.query.start_date) filter.start_date = req.query.start_date;
      if (req.query.end_date) filter.end_date = req.query.end_date;
      
      // Branch ID dari query param
      const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;

      // Add user context for data isolation
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = branch_id || req.user.branch_id;
      const user_role = req.user.role;

      // Panggil service export
      const data = await OrderServiceNew.exportOrders({
        filter,
        user_tenant_id,
        user_branch_id,
        user_role
      });

      // Set headers untuk download
      const filename = `data_pesanan_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.status(200).send(data);
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = OrderControllerNew;
