const CustomerFollowupHistoryService = require('../services/customerFollowupHistoryService');
const ResponseHelper = require('../helpers/responseHelper');

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

/**
 * Controller riwayat follow-up customer.
 *
 * Endpoint (lihat customerFollowupRoutes.js):
 *  - GET /customer-followups/history
 *  - GET /customer-followups/followed-up
 *  - GET /customer-followups/summary
 *  - GET /customer-followups/customers/:customer_id/history
 */
class CustomerFollowupHistoryController {
  /**
   * Log aktivitas follow-up (per pesan).
   * Query: page, limit, customer_id, month, status, date_from, date_to, search, sort
   */
  static async getHistory(req, res) {
    try {
      const { month, date_from, date_to } = req.query;

      if (month && !MONTH_REGEX.test(String(month))) {
        return res.status(400).send(ResponseHelper.errorResponse('Format month harus YYYY-MM', 400));
      }

      if (date_from && !DATE_ONLY_REGEX.test(String(date_from))) {
        return res.status(400).send(ResponseHelper.errorResponse('Format date_from harus YYYY-MM-DD', 400));
      }

      if (date_to && !DATE_ONLY_REGEX.test(String(date_to))) {
        return res.status(400).send(ResponseHelper.errorResponse('Format date_to harus YYYY-MM-DD', 400));
      }

      if (date_from && date_to && String(date_from) > String(date_to)) {
        return res.status(400).send(ResponseHelper.errorResponse('date_from tidak boleh lebih besar dari date_to', 400));
      }

      const result = await CustomerFollowupHistoryService.getHistory(
        req.user.tenant_id,
        req.user.branch_id,
        req.user.role_asli || req.user.role,
        {
          page: req.query.page,
          limit: req.query.limit,
          customer_id: req.query.customer_id,
          month: req.query.month || null,
          status: req.query.status || null,
          date_from: req.query.date_from || null,
          date_to: req.query.date_to || null,
          search: req.query.search || null,
          sort: req.query.sort || 'sent_at_desc',
        }
      );

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  /**
   * Daftar customer yang sudah pernah di-follow up.
   * Query: days, page, limit, search, sort
   */
  static async getFollowedUpCustomers(req, res) {
    try {
      const days = parseInt(req.query.days, 10);
      if (req.query.days !== undefined && (!Number.isInteger(days) || days <= 0 || days > 3650)) {
        return res.status(400).send(ResponseHelper.errorResponse('days harus berupa angka antara 1 - 3650', 400));
      }

      const result = await CustomerFollowupHistoryService.getFollowedUpCustomers(
        req.user.tenant_id,
        req.user.branch_id,
        req.user.role_asli || req.user.role,
        {
          days: days || 30,
          page: req.query.page,
          limit: req.query.limit,
          search: req.query.search || null,
          sort: req.query.sort || 'last_followup_desc',
        }
      );

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  /**
   * Ringkasan aktivitas follow-up.
   * Query: days (default 30)
   */
  static async getSummary(req, res) {
    try {
      const days = parseInt(req.query.days, 10);
      if (req.query.days !== undefined && (!Number.isInteger(days) || days <= 0 || days > 3650)) {
        return res.status(400).send(ResponseHelper.errorResponse('days harus berupa angka antara 1 - 3650', 400));
      }

      const result = await CustomerFollowupHistoryService.getSummary(
        req.user.tenant_id,
        req.user.branch_id,
        req.user.role_asli || req.user.role,
        { days: days || 30 }
      );

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  /**
   * Detail 1 customer + statistik + timeline follow-up.
   * Query: page, limit
   */
  static async getCustomerHistory(req, res) {
    try {
      const customerId = parseInt(req.params.customer_id, 10);
      if (!Number.isInteger(customerId) || customerId <= 0) {
        return res.status(400).send(ResponseHelper.errorResponse('customer_id tidak valid', 400));
      }

      const result = await CustomerFollowupHistoryService.getCustomerHistory(
        req.user.tenant_id,
        req.user.branch_id,
        req.user.role_asli || req.user.role,
        customerId,
        {
          page: req.query.page,
          limit: req.query.limit,
        }
      );

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).send(ResponseHelper.errorResponse(error.message, statusCode));
    }
  }
}

module.exports = CustomerFollowupHistoryController;
