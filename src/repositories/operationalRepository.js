const { 
  Order, 
  OrderDetail, 
  Customer, 
  Treatment, 
  Item, 
  Discount, 
  Payment, 
  PaymentDetail,
  Membership,
  CustomerMembership,
  Delivery,
  Op, 
  sequelize 
} = require('../models');

class OperationalRepository {
  /**
   * Get operational summary data
   */
  static async getOperationalSummary(tenant_id, branch_id, startDate, endDate) {
    try {
      console.log('🔍 OperationalRepository.getOperationalSummary - Params:', {
        tenant_id, branch_id, startDate, endDate
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};
      
      if (branch_id) {
        branchCondition = 'AND o.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      // Use raw SQL queries to avoid Sequelize issues
      const summaryQuery = `
        SELECT 
          (SELECT COUNT(*) FROM order_details od 
           INNER JOIN orders o ON od.order_id = o.id 
           WHERE o.tenant_id = :tenant_id 
           AND o.entry_date BETWEEN :startDate AND :endDate 
           AND o.deletedAt IS NULL 
           AND od.deletedAt IS NULL 
           ${branchCondition}) as total_services,
          
          (SELECT COUNT(DISTINCT o.customer_id) FROM orders o 
           WHERE o.tenant_id = :tenant_id 
           AND o.entry_date BETWEEN :startDate AND :endDate 
           AND o.deletedAt IS NULL 
           ${branchCondition}) as total_customers,
          
          (SELECT COUNT(*) FROM customers c 
           WHERE c.tenant_id = :tenant_id 
           AND c.createdAt BETWEEN :startDate AND :endDate 
           AND c.deletedAt IS NULL 
           ${branch_id ? 'AND c.branch_id = :branch_id' : ''}) as total_new_customers,
          
          (SELECT COALESCE(SUM(od.price - od.final_price), 0) FROM order_details od 
           INNER JOIN orders o ON od.order_id = o.id 
           WHERE o.tenant_id = :tenant_id 
           AND o.entry_date BETWEEN :startDate AND :endDate 
           AND o.deletedAt IS NULL 
           AND od.deletedAt IS NULL 
           AND od.discount_id IS NOT NULL 
           ${branchCondition}) as total_discounts,
          
          -- ✅ Total Item = jumlah BARANG, bukan jumlah baris order_details.
          --    Satu sepatu yang dikerjakan 2 layanan (mis. deepclean + reglue)
          --    tetap dihitung 1 item. Karena itu pakai pasangan (order_id, item_id).
          --    COUNT(DISTINCT item_id) saja SALAH: item_id yang sama dipakai di
          --    order berbeda harus dihitung terpisah. Jumlah "pekerjaan" tetap
          --    ada di total_services di atas.
          (SELECT COUNT(DISTINCT od.order_id, od.item_id) FROM order_details od 
           INNER JOIN orders o ON od.order_id = o.id 
           WHERE o.tenant_id = :tenant_id 
           AND o.entry_date BETWEEN :startDate AND :endDate 
           AND o.deletedAt IS NULL 
           AND od.deletedAt IS NULL 
           AND od.item_id IS NOT NULL 
           ${branchCondition}) as total_items,
          
          (SELECT COUNT(*) FROM customer_memberships cm
           INNER JOIN memberships m ON cm.membership_id = m.id
           WHERE m.tenant_id = :tenant_id
           AND cm.createdAt BETWEEN :startDate AND :endDate
           AND cm.deletedAt IS NULL
           AND m.deletedAt IS NULL) as total_memberships,

          (SELECT COALESCE(SUM(p.final_price), 0) FROM orders o
           LEFT JOIN payments p ON o.payment_id = p.id
           WHERE o.tenant_id = :tenant_id
           AND o.entry_date BETWEEN :startDate AND :endDate
           AND o.deletedAt IS NULL
           ${branchCondition}) as total_revenue,

          (SELECT COUNT(*) FROM orders o
           WHERE o.tenant_id = :tenant_id
           AND o.entry_date BETWEEN :startDate AND :endDate
           AND o.deletedAt IS NULL
           ${branchCondition}) as total_orders
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        ...branchParams
      };

      const [results] = await sequelize.query(summaryQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const summary = {
        total_services: results.total_services || 0,
        total_customers: results.total_customers || 0,
        total_new_customers: results.total_new_customers || 0,
        total_discounts: results.total_discounts || 0,
        total_items: results.total_items || 0,
        total_memberships: results.total_memberships || 0,
        total_revenue: parseFloat(results.total_revenue || 0),
        total_orders: parseInt(results.total_orders || 0)
      };

      console.log('✅ OperationalRepository.getOperationalSummary - Result:', summary);
      return summary;
    } catch (error) {
      console.error('❌ OperationalRepository.getOperationalSummary - Error:', error);
      throw new Error(`Failed to get operational summary: ${error.message}`);
    }
  }

  /**
   * Get top services by order count
   */
  static async getTopServices(tenant_id, branch_id, startDate, endDate) {
    try {
      console.log('🔍 OperationalRepository.getTopServices - Params:', {
        tenant_id, branch_id, startDate, endDate
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};

      if (branch_id) {
        branchCondition = 'AND o.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      const topServicesQuery = `
        SELECT
          t.id as treatment_id,
          t.name as treatment_name,
          t.type_service,
          COUNT(od.id) as total_orders,
          COALESCE(SUM(od.final_price), 0) as total_revenue,
          COALESCE(AVG(od.final_price), 0) as avg_price
        FROM order_details od
        INNER JOIN treatment t ON od.treatment_id = t.id
        INNER JOIN orders o ON od.order_id = o.id
        WHERE o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :startDate AND :endDate
        AND o.deletedAt IS NULL
        AND od.deletedAt IS NULL
        AND t.deletedAt IS NULL
        ${branchCondition}
        GROUP BY t.id, t.name, t.type_service
        ORDER BY total_orders DESC
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        ...branchParams
      };

      const results = await sequelize.query(topServicesQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const result = results.map(service => ({
        treatment_name: service.treatment_name,
        type_service: service.type_service,
        total_orders: parseInt(service.total_orders),
        total_revenue: parseFloat(service.total_revenue || 0),
        avg_price: parseFloat(service.avg_price || 0)
      }));

      console.log('✅ OperationalRepository.getTopServices - Result:', result);
      return result;
    } catch (error) {
      console.error('❌ OperationalRepository.getTopServices - Error:', error);
      throw new Error(`Failed to get top services: ${error.message}`);
    }
  }

  /**
   * Get top customers by order count
   */
  static async getTopCustomers(tenant_id, branch_id, startDate, endDate, limit = 10) {
    try {
      console.log('🔍 OperationalRepository.getTopCustomers - Params:', {
        tenant_id, branch_id, startDate, endDate, limit
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};
      
      if (branch_id) {
        branchCondition = 'AND o.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      const topCustomersQuery = `
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(p.final_price), 0) as total_spent,
          COALESCE(AVG(p.final_price), 0) as avg_order_value,
          MAX(o.entry_date) as last_order_date
        FROM customers c
        INNER JOIN orders o ON c.id = o.customer_id
        INNER JOIN payments p ON o.payment_id = p.id
        WHERE o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :startDate AND :endDate
        AND o.deletedAt IS NULL
        AND c.deletedAt IS NULL
        AND p.deletedAt IS NULL
        ${branchCondition}
        GROUP BY c.id, c.name, c.phone
        ORDER BY total_orders DESC
        LIMIT :limit
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        limit: limit,
        ...branchParams
      };

      const results = await sequelize.query(topCustomersQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const result = results.map(customer => ({
        customer_name: customer.customer_name,
        phone: customer.phone,
        total_orders: parseInt(customer.total_orders),
        total_spent: parseFloat(customer.total_spent || 0),
        avg_order_value: parseFloat(customer.avg_order_value || 0),
        last_order_date: customer.last_order_date
      }));

      console.log('✅ OperationalRepository.getTopCustomers - Result:', result);
      return result;
    } catch (error) {
      console.error('❌ OperationalRepository.getTopCustomers - Error:', error);
      throw new Error(`Failed to get top customers: ${error.message}`);
    }
  }

  /**
   * Get discount analysis
   */
  static async getDiscountAnalysis(tenant_id, branch_id, startDate, endDate) {
    try {
      console.log('🔍 OperationalRepository.getDiscountAnalysis - Params:', {
        tenant_id, branch_id, startDate, endDate
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};
      
      if (branch_id) {
        branchCondition = 'AND o.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      const discountAnalysisQuery = `
        SELECT 
          d.id as discount_id,
          d.name as discount_name,
          d.type as discount_type,
          d.discount as discount_value,
          COUNT(od.id) as usage_count,
          COALESCE(SUM(od.price - od.final_price), 0) as total_discount_given,
          COALESCE(AVG(od.price - od.final_price), 0) as avg_discount_per_order
        FROM order_details od
        INNER JOIN discounts d ON od.discount_id = d.id
        INNER JOIN orders o ON od.order_id = o.id
        WHERE o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :startDate AND :endDate
        AND o.deletedAt IS NULL
        AND od.deletedAt IS NULL
        AND d.deletedAt IS NULL
        AND od.discount_id IS NOT NULL
        ${branchCondition}
        GROUP BY d.id, d.name, d.type, d.discount
        ORDER BY usage_count DESC
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        ...branchParams
      };

      const results = await sequelize.query(discountAnalysisQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const result = results.map(discount => ({
        discount_name: discount.discount_name,
        discount_type: discount.discount_type,
        discount_value: parseFloat(discount.discount_value),
        usage_count: parseInt(discount.usage_count),
        total_discount_given: parseFloat(discount.total_discount_given || 0),
        avg_discount_per_order: parseFloat(discount.avg_discount_per_order || 0)
      }));

      console.log('✅ OperationalRepository.getDiscountAnalysis - Result:', result);
      return result;
    } catch (error) {
      console.error('❌ OperationalRepository.getDiscountAnalysis - Error:', error);
      throw new Error(`Failed to get discount analysis: ${error.message}`);
    }
  }

  /**
   * Get item analysis (most treated items)
   */
  static async getItemAnalysis(tenant_id, branch_id, startDate, endDate) {
    try {
      console.log('🔍 OperationalRepository.getItemAnalysis - Params:', {
        tenant_id, branch_id, startDate, endDate
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};

      if (branch_id) {
        branchCondition = 'AND o.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      const itemAnalysisQuery = `
        SELECT
          i.id as item_id,
          i.name as item_name,
          i.brand,
          i.type,
          i.color,
          COUNT(od.id) as total_treatments,
          COALESCE(SUM(od.final_price), 0) as total_revenue
        FROM order_details od
        INNER JOIN items i ON od.item_id = i.id
        INNER JOIN orders o ON od.order_id = o.id
        WHERE o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :startDate AND :endDate
        AND o.deletedAt IS NULL
        AND od.deletedAt IS NULL
        AND i.deletedAt IS NULL
        ${branchCondition}
        GROUP BY i.id, i.name, i.brand, i.type, i.color
        ORDER BY total_treatments DESC
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        ...branchParams
      };

      const results = await sequelize.query(itemAnalysisQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const result = results.map(item => ({
        item_name: item.item_name,
        brand: item.brand,
        type: item.type,
        color: item.color,
        total_treatments: parseInt(item.total_treatments),
        total_revenue: parseFloat(item.total_revenue || 0)
      }));

      console.log('✅ OperationalRepository.getItemAnalysis - Result:', result);
      return result;
    } catch (error) {
      console.error('❌ OperationalRepository.getItemAnalysis - Error:', error);
      throw new Error(`Failed to get item analysis: ${error.message}`);
    }
  }

  /**
   * Get membership analysis
   */
  static async getMembershipAnalysis(tenant_id, branch_id, startDate, endDate) {
    try {
      console.log('🔍 OperationalRepository.getMembershipAnalysis - Params:', {
        tenant_id, branch_id, startDate, endDate
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};
      
      if (branch_id) {
        branchCondition = 'AND cm.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      const membershipAnalysisQuery = `
        SELECT 
          m.id as membership_id,
          m.name as membership_name,
          m.price as membership_price,
          COUNT(cm.id) as total_members,
          COALESCE(SUM(m.price), 0) as total_revenue,
          COUNT(CASE WHEN cm.status = 'active' THEN 1 END) as active_members,
          COUNT(CASE WHEN cm.status = 'expired' THEN 1 END) as expired_members
        FROM customer_memberships cm
        INNER JOIN memberships m ON cm.membership_id = m.id
        WHERE m.tenant_id = :tenant_id
        AND cm.start_date BETWEEN :startDate AND :endDate
        AND cm.deletedAt IS NULL
        AND m.deletedAt IS NULL
        ${branchCondition}
        GROUP BY m.id, m.name, m.price
        ORDER BY total_members DESC
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        ...branchParams
      };

      const results = await sequelize.query(membershipAnalysisQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const result = results.map(membership => ({
        membership_name: membership.membership_name,
        membership_price: parseFloat(membership.membership_price),
        total_members: parseInt(membership.total_members),
        total_revenue: parseFloat(membership.total_revenue || 0),
        active_members: parseInt(membership.active_members || 0),
        expired_members: parseInt(membership.expired_members || 0)
      }));

      console.log('✅ OperationalRepository.getMembershipAnalysis - Result:', result);
      return result;
    } catch (error) {
      console.error('❌ OperationalRepository.getMembershipAnalysis - Error:', error);
      throw new Error(`Failed to get membership analysis: ${error.message}`);
    }
  }

  /**
   * Get operational trends (daily data for charts)
   */
  static async getOperationalTrends(tenant_id, branch_id, startDate, endDate) {
    try {
      console.log('🔍 OperationalRepository.getOperationalTrends - Params:', {
        tenant_id, branch_id, startDate, endDate
      });

      // Build where conditions for branch
      let branchCondition = '';
      let branchParams = {};
      
      if (branch_id) {
        branchCondition = 'AND o.branch_id = :branch_id';
        branchParams.branch_id = branch_id;
      }

      const trendsQuery = `
        SELECT 
          DATE(o.entry_date) as date,
          COUNT(o.id) as daily_orders,
          COALESCE(SUM(p.final_price), 0) as daily_revenue
        FROM orders o
        INNER JOIN payments p ON o.payment_id = p.id
        WHERE o.tenant_id = :tenant_id
        AND o.entry_date BETWEEN :startDate AND :endDate
        AND o.deletedAt IS NULL
        AND p.deletedAt IS NULL
        ${branchCondition}
        GROUP BY DATE(o.entry_date)
        ORDER BY DATE(o.entry_date) ASC
      `;

      const params = {
        tenant_id: tenant_id,
        startDate: startDate,
        endDate: endDate,
        ...branchParams
      };

      const results = await sequelize.query(trendsQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const result = results.map(trend => ({
        date: trend.date,
        daily_orders: parseInt(trend.daily_orders),
        daily_revenue: parseFloat(trend.daily_revenue || 0)
      }));

      console.log('✅ OperationalRepository.getOperationalTrends - Result:', result);
      return result;
    } catch (error) {
      console.error('❌ OperationalRepository.getOperationalTrends - Error:', error);
      throw new Error(`Failed to get operational trends: ${error.message}`);
    }
  }

  /**
   * Performa per cabang dalam SATU query (untuk beranda Supervisor "Top Cabang").
   *
   * Definisi sengaja disamakan dengan "Laporan Operasional" milik owner:
   *   - revenue    = SUM(payments.final_price) lewat `orders.payment_id`, basis `orders.entry_date`
   *                  SEMUA status bayar ikut (sengaja TIDAK difilter `payments.status`)
   *   - orders     = COUNT(orders)
   *   - treatments = COUNT(order_details)  → jumlah pekerjaan/layanan
   *   - items      = COUNT(DISTINCT order_id, item_id) → jumlah barang
   *     (1 sepatu walau dikerjakan >1 layanan tetap 1 item. COUNT(DISTINCT item_id)
   *      saja SALAH karena item_id yang sama di order berbeda harus dihitung pisah.)
   *
   * ⚠️ `order_details` TIDAK di-join ke query uang. Kalau di-join, satu order dengan
   *    3 detail akan menghitung omzetnya 3× (pernah kejadian, ±4,3× membengkak).
   *    Karena itu layanan & item dihitung di subquery terpisah.
   *
   * "Uang Masuk" sengaja TIDAK dihitung di sini — itu diambil dari buku besar
   * (`FinanceRepository.getCashInByBranch`) supaya definisinya sama dengan
   * Laporan Keuangan owner. Penggabungannya dilakukan di OperationalService.
   *
   * `revenue_prev` = omzet periode pembanding (rentang sama panjang, tepat sebelumnya)
   *                  → dipakai untuk delta ▲/▼.
   *
   * @param {number} tenant_id
   * @param {string} startDate  format YYYY-MM-DD
   * @param {string} endDate    format YYYY-MM-DD
   * @param {string} [prevStartDate]
   * @param {string} [prevEndDate]
   * @returns {Promise<Array>} [{ branch_id, orders, revenue, revenue_prev, treatments, items }]
   */
  static async getBranchesPerformance(tenant_id, startDate, endDate, prevStartDate, prevEndDate) {
    try {
      console.log('🔍 OperationalRepository.getBranchesPerformance - Params:', {
        tenant_id, startDate, endDate, prevStartDate, prevEndDate
      });

      // Kalau periode pembanding tidak dikirim, fallback ke periode yang sama
      // (delta jadi 0%) — lebih aman daripada BETWEEN dengan nilai NULL yang
      // membuat hasilnya kosong.
      const compareStart = prevStartDate || startDate;
      const compareEnd = prevEndDate || endDate;

      const performanceQuery = `
        SELECT
          b.id AS branch_id,
          COALESCE(rev.orders, 0) AS orders,
          COALESCE(rev.revenue, 0) AS revenue,
          COALESCE(rev.revenue_prev, 0) AS revenue_prev,
          COALESCE(svc.treatments, 0) AS treatments,
          COALESCE(svc.items, 0) AS items
        FROM branches b
        LEFT JOIN (
          SELECT
            o.branch_id,
            COUNT(CASE WHEN o.entry_date BETWEEN :startDate AND :endDate THEN 1 END) AS orders,
            SUM(CASE WHEN o.entry_date BETWEEN :startDate AND :endDate THEN COALESCE(p.final_price, 0) ELSE 0 END) AS revenue,
            SUM(CASE WHEN o.entry_date BETWEEN :compareStart AND :compareEnd THEN COALESCE(p.final_price, 0) ELSE 0 END) AS revenue_prev
          FROM orders o
          LEFT JOIN payments p ON o.payment_id = p.id
          WHERE o.tenant_id = :tenant_id
          AND o.entry_date BETWEEN :compareStart AND :endDate
          AND o.deletedAt IS NULL
          GROUP BY o.branch_id
        ) rev ON rev.branch_id = b.id
        LEFT JOIN (
          SELECT
            o.branch_id,
            COUNT(*) AS treatments,
            COUNT(DISTINCT od.order_id, od.item_id) AS items
          FROM order_details od
          INNER JOIN orders o ON od.order_id = o.id
          WHERE o.tenant_id = :tenant_id
          AND o.entry_date BETWEEN :startDate AND :endDate
          AND o.deletedAt IS NULL
          AND od.deletedAt IS NULL
          GROUP BY o.branch_id
        ) svc ON svc.branch_id = b.id
        WHERE b.tenant_id = :tenant_id
        AND b.deletedAt IS NULL
        ORDER BY revenue DESC, b.name ASC
      `;

      const results = await sequelize.query(performanceQuery, {
        replacements: {
          tenant_id: tenant_id,
          startDate: startDate,
          endDate: endDate,
          compareStart: compareStart,
          compareEnd: compareEnd
        },
        type: sequelize.QueryTypes.SELECT
      });

      const rows = results.map((row) => ({
        branch_id: parseInt(row.branch_id),
        orders: parseInt(row.orders || 0),
        revenue: parseFloat(row.revenue || 0),
        revenue_prev: parseFloat(row.revenue_prev || 0),
        treatments: parseInt(row.treatments || 0),
        items: parseInt(row.items || 0)
      }));

      console.log('✅ OperationalRepository.getBranchesPerformance - Result:', rows.length, 'cabang');
      return rows;
    } catch (error) {
      console.error('❌ OperationalRepository.getBranchesPerformance - Error:', error);
      throw new Error(`Failed to get branches performance: ${error.message}`);
    }
  }
}

module.exports = OperationalRepository;
