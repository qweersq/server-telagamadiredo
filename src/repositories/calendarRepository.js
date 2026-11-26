const { Customer, CustomerMembership, Membership, Discount, Item, Order, OrderDetail, OrderDetailStatusLog, Payment, PaymentDetail, ShoePhoto, Treatment, User, sequelize, Op, FinanceTransaction, FinanceAccount, PaymentMethod } = require('../models');

class CalendarRepository {
  /**
   * Get items summary per tanggal dalam sebulan (berdasarkan due_date)
   * @param {Object} params - { month, year, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - { "2024-01-15": { total_due, not_done, overdue, done, done_on_time, done_late } }
   */
  static async getItemsSummaryByMonth({ month, year, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Extend branch ID untuk include mitra/droppoint branches (sama seperti orders-new-raw)
      const OrderRepositoryNew = require('./orderRepositoryNew');
      let targetBranchIds = user_branch_id;
      if (user_branch_id && !Array.isArray(user_branch_id)) {
        targetBranchIds = await OrderRepositoryNew._getExtendedBranchIds(user_branch_id);
      }

      // Build data isolation conditions
      let conditions = [];
      let params = [];

      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        conditions.push('o.tenant_id = ?');
        params.push(user_tenant_id);
        if (targetBranchIds) {
          if (Array.isArray(targetBranchIds)) {
            conditions.push(`o.branch_id IN (${targetBranchIds.map(() => '?').join(',')})`);
            params.push(...targetBranchIds);
          } else {
            conditions.push('o.branch_id = ?');
            params.push(targetBranchIds);
          }
        }
      } else {
        conditions.push('o.tenant_id = ?');
        params.push(user_tenant_id);
        if (Array.isArray(targetBranchIds)) {
          conditions.push(`o.branch_id IN (${targetBranchIds.map(() => '?').join(',')})`);
          params.push(...targetBranchIds);
        } else {
          conditions.push('o.branch_id = ?');
          params.push(targetBranchIds);
        }
      }

      conditions.push('o.deletedAt IS NULL');
      conditions.push('od.deletedAt IS NULL');
      conditions.push('YEAR(od.due_date) = ?');
      conditions.push('MONTH(od.due_date) = ?');
      params.push(year, month);

      const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

      const query = `
        SELECT 
          DATE(od.due_date) as date,
          COUNT(*) as total_due,
          SUM(CASE WHEN od.status NOT IN ('done', 'selesai') THEN 1 ELSE 0 END) as not_done,
          SUM(CASE WHEN od.due_date < CURDATE() AND od.status NOT IN ('done', 'selesai') THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN od.status IN ('done', 'selesai') THEN 1 ELSE 0 END) as done
        FROM order_details od
        INNER JOIN orders o ON od.order_id = o.id
        WHERE ${whereClause}
        GROUP BY DATE(od.due_date)
        ORDER BY date
      `;

      const results = await sequelize.query(query, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      // Convert to object dengan date sebagai key
      const summary = {};
      results.forEach(row => {
        summary[row.date] = {
          total_due: parseInt(row.total_due) || 0,
          not_done: parseInt(row.not_done) || 0,
          overdue: parseInt(row.overdue) || 0,
          done: parseInt(row.done) || 0
        };
      });

      return summary;
    } catch (error) {
      console.error('❌ CalendarRepository - Error getting items summary:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get payments summary per tanggal dalam sebulan (berdasarkan entry_date)
   * @param {Object} params - { month, year, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - { "2024-01-15": { total_due, unpaid, overdue, paid, paid_on_time, paid_late } }
   */
  static async getPaymentsSummaryByMonth({ month, year, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Extend branch ID untuk include mitra/droppoint branches (sama seperti orders-new-raw)
      const OrderRepositoryNew = require('./orderRepositoryNew');
      let targetBranchIds = user_branch_id;
      if (user_branch_id && !Array.isArray(user_branch_id)) {
        targetBranchIds = await OrderRepositoryNew._getExtendedBranchIds(user_branch_id);
      }

      // Build data isolation conditions
      let conditions = [];
      let params = [];

      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        conditions.push('o.tenant_id = ?');
        params.push(user_tenant_id);
        if (targetBranchIds) {
          if (Array.isArray(targetBranchIds)) {
            conditions.push(`o.branch_id IN (${targetBranchIds.map(() => '?').join(',')})`);
            params.push(...targetBranchIds);
          } else {
            conditions.push('o.branch_id = ?');
            params.push(targetBranchIds);
          }
        }
      } else {
        conditions.push('o.tenant_id = ?');
        params.push(user_tenant_id);
        if (Array.isArray(targetBranchIds)) {
          conditions.push(`o.branch_id IN (${targetBranchIds.map(() => '?').join(',')})`);
          params.push(...targetBranchIds);
        } else {
          conditions.push('o.branch_id = ?');
          params.push(targetBranchIds);
        }
      }

      conditions.push('o.deletedAt IS NULL');
      conditions.push('p.deletedAt IS NULL');
      conditions.push('YEAR(o.entry_date) = ?');
      conditions.push('MONTH(o.entry_date) = ?');
      params.push(year, month);

      const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

      const query = `
        SELECT 
          DATE(o.entry_date) as date,
          COUNT(*) as total_due,
          SUM(CASE WHEN p.status != 'paid' THEN 1 ELSE 0 END) as unpaid,
          SUM(CASE WHEN o.entry_date < CURDATE() AND p.status != 'paid' THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) as paid
        FROM orders o
        INNER JOIN payments p ON o.payment_id = p.id
        WHERE ${whereClause}
        GROUP BY DATE(o.entry_date)
        ORDER BY date
      `;

      const results = await sequelize.query(query, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      // Convert to object dengan date sebagai key
      const summary = {};
      results.forEach(row => {
        summary[row.date] = {
          total_due: parseInt(row.total_due) || 0,
          unpaid: parseInt(row.unpaid) || 0,
          overdue: parseInt(row.overdue) || 0,
          paid: parseInt(row.paid) || 0
        };
      });

      return summary;
    } catch (error) {
      console.error('❌ CalendarRepository - Error getting payments summary:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get orders dengan order_details yang due_date = date tertentu
   * Response structure sama seperti orders-new-raw
   * @param {Object} params - { date, user_tenant_id, user_branch_id, user_role }
   * @returns {Array} - Array of orders dengan order_details
   */
  static async getOrdersByDueDate({ date, user_tenant_id, user_branch_id, user_role, includeOtherItems = false }) {
    try {
      // Build filter untuk orders-new-raw style
      const filter = {
        'order_details.due_date': date
      };

      // Reuse getAllOrderNewRawMinimal dari OrderRepositoryNew
      const OrderRepositoryNew = require('./orderRepositoryNew');
      const { orders } = await OrderRepositoryNew.getAllOrderNewRawMinimal({
        offset: 0,
        pageSizeInt: 1000, // Get all untuk tanggal tertentu
        filter,
        user_tenant_id,
        user_branch_id,
        user_role,
        // true -> order tetap difilter due_date, tapi item lain milik order
        // yang sama ikut dikirim (ditandai is_due_on_filter_date = false).
        includeOtherOrderDetails: includeOtherItems
      });

      return orders;
    } catch (error) {
      console.error('❌ CalendarRepository - Error getting orders by due date:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get orders dengan entry_date = date tertentu
   * Response structure sama seperti orders-new-raw
   * @param {Object} params - { date, user_tenant_id, user_branch_id, user_role }
   * @returns {Array} - Array of orders
   */
  static async getOrdersByEntryDate({ date, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Build filter untuk orders-new-raw style
      const filter = {
        entry_date: date
      };

      // Reuse getAllOrderNewRawMinimal dari OrderRepositoryNew
      const OrderRepositoryNew = require('./orderRepositoryNew');
      const { orders } = await OrderRepositoryNew.getAllOrderNewRawMinimal({
        offset: 0,
        pageSizeInt: 1000, // Get all untuk tanggal tertentu
        filter,
        user_tenant_id,
        user_branch_id,
        user_role
      });

      return orders;
    } catch (error) {
      console.error('❌ CalendarRepository - Error getting orders by entry date:', error);
      throw new Error(error.message);
    }
  }
}

module.exports = CalendarRepository;

