const { CustomerFollowup, Customer, Branch, User } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

class CustomerFollowupRepository {
  static async create(followupData) {
    try {
      const followup = await CustomerFollowup.create(followupData);
      return followup;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getHistory(user_tenant_id, user_branch_id, user_role, page = 1, limit = 20, customer_id = null, month = null) {
    try {
      const offset = (page - 1) * limit;

      // Data isolation logic
      let tenantCondition = '';
      let branchCondition = '';

      if (user_role === 'superadmin') {
        // Superadmin (owner tenant) bisa lihat semua cabang dalam tenant-nya.
        // Filter tenant tetap wajib agar data tidak bocor lintas tenant.
        tenantCondition = `AND cf.tenant_id = ${user_tenant_id}`;
      } else if (user_role === 'admin') {
        tenantCondition = `AND cf.tenant_id = ${user_tenant_id}`;
        branchCondition = `AND cf.branch_id = ${user_branch_id}`;
      } else {
        tenantCondition = `AND cf.tenant_id = ${user_tenant_id}`;
        branchCondition = `AND cf.branch_id = ${user_branch_id}`;
      }

      // Month filter
      let monthCondition = '';
      if (month) {
        monthCondition = `AND DATE_FORMAT(cf.sent_at, '%Y-%m') = '${month}'`;
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM customer_followups cf
        WHERE cf.deleted_at IS NULL
        ${customer_id ? `AND cf.customer_id = ${customer_id}` : ''}
        ${tenantCondition}
        ${branchCondition}
        ${monthCondition}
      `;

      const countResult = await sequelize.query(countQuery, {
        type: sequelize.QueryTypes.SELECT
      });
      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      // Data query
      const dataQuery = `
        SELECT 
          cf.id,
          cf.customer_id,
          cf.message_content,
          cf.sent_at,
          cf.status,
          cf.created_at,
          customers.name as customer_name,
          customers.phone as customer_phone,
          branches.name as branch_name,
          users.name as created_by_name
        FROM customer_followups cf
        LEFT JOIN customers ON cf.customer_id = customers.id
        LEFT JOIN branches ON cf.branch_id = branches.id
        LEFT JOIN users ON cf.created_by = users.id
        WHERE cf.deleted_at IS NULL
        ${customer_id ? `AND cf.customer_id = ${customer_id}` : ''}
        ${tenantCondition}
        ${branchCondition}
        ${monthCondition}
        ORDER BY cf.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const followups = await sequelize.query(dataQuery, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        followups,
        totalPages,
        totalItems
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getFollowedUpCustomers(user_tenant_id, user_branch_id, user_role, days = 14, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Data isolation logic
      let tenantCondition = '';
      let branchCondition = '';

      if (user_role === 'superadmin') {
        // Superadmin (owner tenant) bisa lihat semua cabang dalam tenant-nya.
        // Filter tenant tetap wajib agar data tidak bocor lintas tenant.
        tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
      } else if (user_role === 'admin') {
        tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
        branchCondition = `AND customers.branch_id = ${user_branch_id}`;
      } else {
        tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
        branchCondition = `AND customers.branch_id = ${user_branch_id}`;
      }

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT customers.id) as total
        FROM customers
        INNER JOIN customer_followups cf ON customers.id = cf.customer_id
        WHERE customers.deleted_at IS NULL
        AND cf.deleted_at IS NULL
        AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        ${tenantCondition}
        ${branchCondition}
      `;

      const countResult = await sequelize.query(countQuery, {
        type: sequelize.QueryTypes.SELECT
      });
      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      // Data query
      const dataQuery = `
        SELECT 
          customers.id,
          customers.name,
          customers.phone,
          customers.email,
          customers.address,
          customers.gmaps,
          customers.tenant_id,
          customers.branch_id,
          customers.createdAt,
          customers.updatedAt,
          branches.name as branch_name,
          MAX(cf.sent_at) as last_followup_date,
          COUNT(cf.id) as total_followups
        FROM customers
        LEFT JOIN branches ON customers.branch_id = branches.id
        INNER JOIN customer_followups cf ON customers.id = cf.customer_id
        WHERE customers.deleted_at IS NULL
        AND cf.deleted_at IS NULL
        AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        ${tenantCondition}
        ${branchCondition}
        GROUP BY customers.id, branches.name
        ORDER BY last_followup_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const customers = await sequelize.query(dataQuery, {
        type: sequelize.QueryTypes.SELECT
      });

      return {
        customers,
        totalPages,
        totalItems
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getStatistics(user_tenant_id, user_branch_id, user_role, month = null) {
    try {
      // Data isolation logic
      let tenantCondition = '';
      let branchCondition = '';

      if (user_role === 'superadmin') {
        // Superadmin (owner tenant) bisa lihat semua cabang dalam tenant-nya.
        // Filter tenant tetap wajib agar data tidak bocor lintas tenant.
        tenantCondition = `AND cf.tenant_id = ${user_tenant_id}`;
      } else if (user_role === 'admin') {
        tenantCondition = `AND cf.tenant_id = ${user_tenant_id}`;
        branchCondition = `AND cf.branch_id = ${user_branch_id}`;
      } else {
        tenantCondition = `AND cf.tenant_id = ${user_tenant_id}`;
        branchCondition = `AND cf.branch_id = ${user_branch_id}`;
      }

      // Month filter
      let monthCondition = '';
      if (month) {
        monthCondition = `AND DATE_FORMAT(cf.sent_at, '%Y-%m') = '${month}'`;
      }

      // Statistics query
      const statsQuery = `
        SELECT 
          COUNT(*) as total_sent_this_month,
          COUNT(DISTINCT cf.customer_id) as total_customers_contacted,
          SUM(CASE WHEN cf.status = 'sent' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN cf.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          ROUND(
            (SUM(CASE WHEN cf.status = 'sent' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
            2
          ) as success_rate
        FROM customer_followups cf
        WHERE cf.deleted_at IS NULL
        ${tenantCondition}
        ${branchCondition}
        ${monthCondition}
      `;

      const statsResult = await sequelize.query(statsQuery, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get conversion data (orders after follow-up)
      const conversionQuery = `
        SELECT 
          COUNT(DISTINCT o.id) as orders_after_followup,
          COALESCE(SUM(p.final_price), 0) as revenue_from_followup
        FROM orders o
        INNER JOIN payments p ON o.payment_id = p.id
        INNER JOIN customer_followups cf ON o.customer_id = cf.customer_id
        WHERE o.deletedAt IS NULL
        AND cf.deleted_at IS NULL
        AND o.createdAt > cf.sent_at
        ${tenantCondition.replace('cf.', 'o.')}
        ${branchCondition.replace('cf.', 'o.')}
        ${monthCondition.replace('cf.sent_at', 'o.createdAt')}
      `;

      const conversionResult = await sequelize.query(conversionQuery, {
        type: sequelize.QueryTypes.SELECT
      });

      const stats = statsResult[0];
      const conversion = conversionResult[0];

      return {
        total_sent_this_month: parseInt(stats.total_sent_this_month) || 0,
        total_customers_contacted: parseInt(stats.total_customers_contacted) || 0,
        orders_after_followup: parseInt(conversion.orders_after_followup) || 0,
        conversion_rate: stats.total_customers_contacted > 0 
          ? parseFloat(((conversion.orders_after_followup / stats.total_customers_contacted) * 100).toFixed(2))
          : 0,
        revenue_from_followup: parseFloat(conversion.revenue_from_followup) || 0,
        success_rate: parseFloat(stats.success_rate) || 0,
        success_count: parseInt(stats.success_count) || 0,
        failed_count: parseInt(stats.failed_count) || 0
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async markAsSent(followupData) {
    try {
      const followup = await CustomerFollowup.create({
        customer_id: followupData.customer_id,
        message_content: followupData.message_content,
        template_id: followupData.template_id,
        tenant_id: followupData.tenant_id,
        branch_id: followupData.branch_id,
        created_by: followupData.created_by,
        sent_at: new Date(),
        status: 'sent'
      });
      return followup;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = CustomerFollowupRepository;
