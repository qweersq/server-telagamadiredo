const { Order, Customer, Payment, sequelize } = require('../models');

class ReferralRepository {
  /**
   * Get referral report data
   */
  static async getReferralReport(filters) {
    try {
      const { tenant_id, branch_id, start_date, end_date } = filters;

      // Build WHERE clause
      let whereClause = `
        o.referred_by IS NOT NULL
        AND o.deletedAt IS NULL
        AND o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :start_date AND :end_date
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
          COUNT(DISTINCT o.id) as total_referral_orders,
          COUNT(DISTINCT o.referred_by) as total_referrers,
          COALESCE(SUM(p.final_price), 0) as total_revenue_from_referral
        FROM orders o
        LEFT JOIN payments p ON o.payment_id = p.id AND p.deletedAt IS NULL
        WHERE ${whereClause}
      `;

      const [summaryResult] = await sequelize.query(summaryQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // Calculate conversion rate and avg referral per customer
      const totalOrdersQuery = `
        SELECT COUNT(DISTINCT o.id) as total_orders
        FROM orders o
        WHERE o.deletedAt IS NULL
          AND o.tenant_id = :tenant_id
          AND o.entry_date BETWEEN :start_date AND :end_date
          ${branch_id ? 'AND o.branch_id = :branch_id' : ''}
      `;

      const [totalOrdersResult] = await sequelize.query(totalOrdersQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const totalReferralOrders = parseInt(summaryResult.total_referral_orders) || 0;
      const totalReferrers = parseInt(summaryResult.total_referrers) || 0;
      const totalOrders = parseInt(totalOrdersResult.total_orders) || 0;
      const totalRevenue = parseFloat(summaryResult.total_revenue_from_referral) || 0;

      const conversionRate = totalOrders > 0 
        ? parseFloat(((totalReferralOrders / totalOrders) * 100).toFixed(2))
        : 0;

      const avgReferralPerCustomer = totalReferrers > 0
        ? parseFloat((totalReferralOrders / totalReferrers).toFixed(2))
        : 0;

      // 2. Get Top Referrers (Top 10)
      const topReferrersWhereClause = `
        o.deletedAt IS NULL
        AND o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :start_date AND :end_date
        ${branch_id ? 'AND o.branch_id = :branch_id' : ''}
        AND o.referred_by IS NOT NULL
      `;

      const topReferrersQuery = `
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          COUNT(o.id) as total_referrals,
          COALESCE(SUM(p.final_price), 0) as total_revenue,
          MAX(o.entry_date) as last_referral_date
        FROM customers c
        INNER JOIN orders o ON c.id = o.referred_by
        LEFT JOIN payments p ON o.payment_id = p.id AND p.deletedAt IS NULL
        WHERE c.deletedAt IS NULL
          AND ${topReferrersWhereClause}
        GROUP BY c.id, c.name, c.phone
        ORDER BY total_referrals DESC, total_revenue DESC
        LIMIT 10
      `;

      const topReferrers = await sequelize.query(topReferrersQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      // 3. Get Referral Orders List
      const referralOrdersQuery = `
        SELECT 
          o.id as order_id,
          p.code as order_code,
          oc.name as customer_name,
          cr.name as referrer_name,
          cr.phone as referrer_phone,
          o.entry_date as order_date,
          COALESCE(p.final_price, 0) as total_amount
        FROM orders o
        LEFT JOIN customers oc ON o.customer_id = oc.id AND oc.deletedAt IS NULL
        LEFT JOIN customers cr ON o.referred_by = cr.id AND cr.deletedAt IS NULL
        LEFT JOIN payments p ON o.payment_id = p.id AND p.deletedAt IS NULL
        WHERE ${whereClause}
        ORDER BY o.entry_date DESC, o.id DESC
        LIMIT 100
      `;

      const referralOrders = await sequelize.query(referralOrdersQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return {
        summary: {
          total_referral_orders: totalReferralOrders,
          total_referrers: totalReferrers,
          conversion_rate: conversionRate,
          avg_referral_per_customer: avgReferralPerCustomer,
          total_revenue_from_referral: Math.round(totalRevenue)
        },
        top_referrers: topReferrers.map(r => {
          let lastReferralDate = null;
          if (r.last_referral_date) {
            if (r.last_referral_date instanceof Date) {
              lastReferralDate = r.last_referral_date.toISOString().split('T')[0];
            } else if (typeof r.last_referral_date === 'string') {
              lastReferralDate = r.last_referral_date.split('T')[0];
            } else {
              lastReferralDate = String(r.last_referral_date).split('T')[0];
            }
          }
          
          return {
            customer_id: r.customer_id,
            customer_name: r.customer_name || 'Unknown',
            customer_phone: r.customer_phone || '',
            total_referrals: parseInt(r.total_referrals) || 0,
            total_revenue: Math.round(parseFloat(r.total_revenue) || 0),
            last_referral_date: lastReferralDate
          };
        }),
        referral_orders: referralOrders.map(o => {
          let orderDate = null;
          if (o.order_date) {
            if (o.order_date instanceof Date) {
              orderDate = o.order_date.toISOString().split('T')[0];
            } else if (typeof o.order_date === 'string') {
              orderDate = o.order_date.split('T')[0];
            } else {
              orderDate = String(o.order_date).split('T')[0];
            }
          }
          
          return {
            order_id: o.order_id,
            order_code: o.order_code || '',
            customer_name: o.customer_name || 'Unknown',
            referrer_name: o.referrer_name || 'Unknown',
            referrer_phone: o.referrer_phone || '',
            order_date: orderDate,
            total_amount: Math.round(parseFloat(o.total_amount) || 0)
          };
        })
      };
    } catch (error) {
      throw new Error(`Failed to get referral report: ${error.message}`);
    }
  }
}

module.exports = ReferralRepository;

