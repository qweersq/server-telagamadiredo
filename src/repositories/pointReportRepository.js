const { PointTransaction, Customer, Order, Op, sequelize } = require('../models');

class PointReportRepository {
  /**
   * Get point report data
   */
  static async getPointReport(filters) {
    try {
      const { tenant_id, branch_id, start_date, end_date } = filters;

      // Build WHERE clause
      let whereClause = `
        pt.deletedAt IS NULL
        AND c.deletedAt IS NULL
        AND c.tenant_id = :tenant_id
        AND pt.createdAt BETWEEN :start_date AND :end_date
      `;

      const replacements = {
        tenant_id,
        start_date,
        end_date
      };

      if (branch_id) {
        whereClause += ' AND o.branch_id = :branch_id';
        replacements.branch_id = branch_id;
      }

      // 1. Get Summary Statistics
      const summaryQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN pt.type IN ('earn', 'bonus') AND pt.points > 0 THEN pt.points ELSE 0 END), 0) as total_points_given,
          COALESCE(SUM(CASE WHEN pt.type = 'redeem' AND pt.points < 0 THEN ABS(pt.points) ELSE 0 END), 0) as total_points_redeemed,
          COUNT(DISTINCT pt.customer_id) as total_active_customers,
          COUNT(CASE WHEN pt.type = 'redeem' THEN 1 END) as total_redemptions
        FROM point_transactions pt
        INNER JOIN customers c ON pt.customer_id = c.id
        LEFT JOIN orders o ON pt.order_id = o.id AND o.deletedAt IS NULL
        WHERE ${whereClause}
      `;

      const [summaryResult] = await sequelize.query(summaryQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const totalPointsGiven = parseInt(summaryResult.total_points_given) || 0;
      const totalPointsRedeemed = parseInt(summaryResult.total_points_redeemed) || 0;
      const totalActiveCustomers = parseInt(summaryResult.total_active_customers) || 0;
      const totalRedemptions = parseInt(summaryResult.total_redemptions) || 0;

      // Calculate average points per customer
      const avgPointsPerCustomer = totalActiveCustomers > 0
        ? parseFloat((totalPointsGiven / totalActiveCustomers).toFixed(2))
        : 0;

      // Calculate conversion rate (redeemed / given)
      const conversionRate = totalPointsGiven > 0
        ? parseFloat(((totalPointsRedeemed / totalPointsGiven) * 100).toFixed(2))
        : 0;

      // 2. Get Top Customers by Points (Top 10)
      const topCustomersWhereClause = `
        pt.deletedAt IS NULL
        AND c.deletedAt IS NULL
        AND c.tenant_id = :tenant_id
        AND pt.createdAt BETWEEN :start_date AND :end_date
        ${branch_id ? 'AND o.branch_id = :branch_id' : ''}
      `;

      const topCustomersQuery = `
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.points as current_points,
          COALESCE(SUM(CASE WHEN pt.type IN ('earn', 'bonus') AND pt.points > 0 THEN pt.points ELSE 0 END), 0) as total_points_given,
          COALESCE(SUM(CASE WHEN pt.type = 'redeem' AND pt.points < 0 THEN ABS(pt.points) ELSE 0 END), 0) as total_points_redeemed,
          MAX(pt.createdAt) as last_transaction_date
        FROM customers c
        INNER JOIN point_transactions pt ON c.id = pt.customer_id
        LEFT JOIN orders o ON pt.order_id = o.id AND o.deletedAt IS NULL
        WHERE ${topCustomersWhereClause}
        GROUP BY c.id, c.name, c.phone, c.points
        ORDER BY total_points_given DESC, total_points_redeemed DESC
        LIMIT 10
      `;

      const topCustomers = await sequelize.query(topCustomersQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // 3. Get Point Transactions Breakdown (Last 100)
      const transactionsQuery = `
        SELECT 
          pt.id as transaction_id,
          pt.type,
          pt.points,
          pt.description,
          pt.bonus_type,
          pt.createdAt as transaction_date,
          pt.order_id,
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          o.entry_date as order_date
        FROM point_transactions pt
        INNER JOIN customers c ON pt.customer_id = c.id
        LEFT JOIN orders o ON pt.order_id = o.id AND o.deletedAt IS NULL
        WHERE ${whereClause}
        ORDER BY pt.createdAt DESC, pt.id DESC
        LIMIT 100
      `;

      const transactions = await sequelize.query(transactionsQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Format results
      return {
        summary: {
          total_points_given: totalPointsGiven,
          total_points_redeemed: totalPointsRedeemed,
          total_active_customers: totalActiveCustomers,
          total_redemptions: totalRedemptions,
          avg_points_per_customer: avgPointsPerCustomer,
          conversion_rate: conversionRate
        },
        top_customers: topCustomers.map(c => {
          let lastTransactionDate = null;
          if (c.last_transaction_date) {
            if (c.last_transaction_date instanceof Date) {
              lastTransactionDate = c.last_transaction_date.toISOString().split('T')[0];
            } else if (typeof c.last_transaction_date === 'string') {
              lastTransactionDate = c.last_transaction_date.split('T')[0];
            } else {
              lastTransactionDate = String(c.last_transaction_date).split('T')[0];
            }
          }
          
          return {
            customer_id: c.customer_id,
            customer_name: c.customer_name || 'Unknown',
            customer_phone: c.customer_phone || '',
            current_points: parseInt(c.current_points) || 0,
            total_points_given: parseInt(c.total_points_given) || 0,
            total_points_redeemed: parseInt(c.total_points_redeemed) || 0,
            last_transaction_date: lastTransactionDate
          };
        }),
        transactions: transactions.map(t => {
          let transactionDate = null;
          if (t.transaction_date) {
            if (t.transaction_date instanceof Date) {
              transactionDate = t.transaction_date.toISOString().split('T')[0];
            } else if (typeof t.transaction_date === 'string') {
              transactionDate = t.transaction_date.split('T')[0];
            } else {
              transactionDate = String(t.transaction_date).split('T')[0];
            }
          }

          let orderDate = null;
          if (t.order_date) {
            if (t.order_date instanceof Date) {
              orderDate = t.order_date.toISOString().split('T')[0];
            } else if (typeof t.order_date === 'string') {
              orderDate = t.order_date.split('T')[0];
            } else {
              orderDate = String(t.order_date).split('T')[0];
            }
          }
          
          return {
            transaction_id: t.transaction_id,
            type: t.type,
            points: parseInt(t.points) || 0,
            description: t.description || '',
            bonus_type: t.bonus_type || null,
            transaction_date: transactionDate,
            order_id: t.order_id || null,
            customer_id: t.customer_id,
            customer_name: t.customer_name || 'Unknown',
            customer_phone: t.customer_phone || '',
            order_date: orderDate
          };
        })
      };
    } catch (error) {
      throw new Error(`Failed to get point report: ${error.message}`);
    }
  }
}

module.exports = PointReportRepository;

