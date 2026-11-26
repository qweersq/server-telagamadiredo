const sequelize = require('../config/database');

/**
 * Repository khusus RIWAYAT follow-up customer.
 *
 * Berbeda dengan `customerFollowupRepository` yang dipakai halaman list
 * follow-up, repository ini fokus ke pembacaan data historis:
 *  - log aktivitas follow-up (per event / per pesan)
 *  - agregat per customer (siapa saja yang sudah pernah di-follow up)
 *  - ringkasan (summary) untuk kartu statistik
 *  - timeline 1 customer
 *
 * Catatan keamanan:
 *  - Semua nilai dari request masuk lewat `replacements` (parameterized),
 *    tidak ada interpolasi string mentah.
 *  - Isolasi data (tenant/cabang) dibangun sekali di `buildScope()`.
 */

const MAX_LIMIT = 100;
const MAX_DAYS = 3650;

class CustomerFollowupHistoryRepository {
  // ────────────────────────────────────────────────────────────────
  // Helper
  // ────────────────────────────────────────────────────────────────

  static normalizePagination(page, limit) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 20));
    return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
  }

  static normalizeDays(days, fallback = 30) {
    const parsed = parseInt(days, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, MAX_DAYS);
  }

  static buildPagination(page, limit, totalItems) {
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Isolasi data berdasarkan role.
   *  - superapp-superadmin : tanpa batasan tenant
   *  - superadmin/supervisor : seluruh cabang dalam tenant
   *  - admin/employee : tenant + cabang milik user
   *
   * @param {string} alias nama alias tabel yang dipakai di query (mis. 'cf')
   */
  static buildScope(user_tenant_id, user_branch_id, user_role, alias = 'cf') {
    if (user_role === 'superapp-superadmin') {
      return { clause: '', replacements: {} };
    }

    const conditions = [];
    const replacements = {};

    const tenantId = Number(user_tenant_id);
    if (Number.isInteger(tenantId) && tenantId > 0) {
      conditions.push(`${alias}.tenant_id = :scopeTenantId`);
      replacements.scopeTenantId = tenantId;
    } else {
      // Jangan pernah bocorkan data lintas tenant kalau tenant tidak diketahui
      conditions.push('1 = 0');
    }

    const canSeeAllBranches = ['superadmin', 'supervisor'].includes(user_role);
    if (!canSeeAllBranches) {
      const branchId = Number(user_branch_id);
      if (Number.isInteger(branchId) && branchId > 0) {
        conditions.push(`${alias}.branch_id = :scopeBranchId`);
        replacements.scopeBranchId = branchId;
      } else {
        conditions.push('1 = 0');
      }
    }

    return {
      clause: conditions.length ? `AND ${conditions.join(' AND ')}` : '',
      replacements,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 1. Log aktivitas follow-up (per event)
  // ────────────────────────────────────────────────────────────────

  /**
   * Riwayat follow-up per aktivitas/pesan.
   *
   * @param {object} params
   * @param {number|string} params.user_tenant_id
   * @param {number|string} params.user_branch_id
   * @param {string} params.user_role
   * @param {number} params.page
   * @param {number} params.limit
   * @param {number|null} params.customer_id
   * @param {string|null} params.month          format YYYY-MM
   * @param {string|null} params.status         'sent' | 'failed'
   * @param {string|null} params.date_from      format YYYY-MM-DD
   * @param {string|null} params.date_to        format YYYY-MM-DD
   * @param {string|null} params.search         cari nama / telepon / isi pesan
   * @param {string|null} params.sort           sent_at_desc | sent_at_asc | customer_asc
   */
  static async getHistory({
    user_tenant_id,
    user_branch_id,
    user_role,
    page = 1,
    limit = 20,
    customer_id = null,
    month = null,
    status = null,
    date_from = null,
    date_to = null,
    search = null,
    sort = 'sent_at_desc',
  } = {}) {
    try {
      const pagination = this.normalizePagination(page, limit);
      const scope = this.buildScope(user_tenant_id, user_branch_id, user_role, 'cf');

      const conditions = ['cf.deleted_at IS NULL'];
      const replacements = { ...scope.replacements };

      const customerIdNum = parseInt(customer_id, 10);
      if (Number.isInteger(customerIdNum) && customerIdNum > 0) {
        conditions.push('cf.customer_id = :customerId');
        replacements.customerId = customerIdNum;
      }

      if (month && /^\d{4}-\d{2}$/.test(String(month))) {
        conditions.push("DATE_FORMAT(cf.sent_at, '%Y-%m') = :month");
        replacements.month = String(month);
      }

      if (status && ['sent', 'failed'].includes(status)) {
        conditions.push('cf.status = :status');
        replacements.status = status;
      }

      if (date_from && /^\d{4}-\d{2}-\d{2}$/.test(String(date_from))) {
        conditions.push('cf.sent_at >= :dateFrom');
        replacements.dateFrom = `${date_from} 00:00:00`;
      }

      if (date_to && /^\d{4}-\d{2}-\d{2}$/.test(String(date_to))) {
        conditions.push('cf.sent_at <= :dateTo');
        replacements.dateTo = `${date_to} 23:59:59`;
      }

      const searchTerm = typeof search === 'string' ? search.trim().slice(0, 100) : '';
      if (searchTerm) {
        conditions.push('(customers.name LIKE :search OR customers.phone LIKE :search OR cf.message_content LIKE :search)');
        replacements.search = `%${searchTerm}%`;
      }

      const sortMap = {
        sent_at_desc: 'cf.sent_at DESC, cf.id DESC',
        sent_at_asc: 'cf.sent_at ASC, cf.id ASC',
        customer_asc: 'customers.name ASC, cf.sent_at DESC',
      };
      const orderBy = sortMap[sort] || sortMap.sent_at_desc;

      const whereClause = conditions.join(' AND ');

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM customer_followups cf
        LEFT JOIN customers ON customers.id = cf.customer_id
        WHERE ${whereClause}
          ${scope.clause}
      `;

      const countRows = await sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      const totalItems = Number(countRows?.[0]?.total) || 0;

      const dataQuery = `
        SELECT
          cf.id,
          cf.customer_id,
          cf.tenant_id,
          cf.branch_id,
          cf.message_content,
          cf.sent_at,
          cf.status,
          cf.created_at,
          customers.name AS customer_name,
          customers.phone AS customer_phone,
          customers.email AS customer_email,
          branches.name AS branch_name,
          users.name AS created_by_name
        FROM customer_followups cf
        LEFT JOIN customers ON customers.id = cf.customer_id
        LEFT JOIN branches ON branches.id = cf.branch_id
        LEFT JOIN users ON users.id = cf.created_by
        WHERE ${whereClause}
          ${scope.clause}
        ORDER BY ${orderBy}
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      `;

      const followups = await sequelize.query(dataQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return {
        followups,
        pagination: this.buildPagination(pagination.page, pagination.limit, totalItems),
        filters: {
          customer_id: customerIdNum || null,
          month: month || null,
          status: status || null,
          date_from: date_from || null,
          date_to: date_to || null,
          search: searchTerm || null,
          sort: sortMap[sort] ? sort : 'sent_at_desc',
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Agregat per customer (siapa saja yang sudah pernah di-FU)
  // ────────────────────────────────────────────────────────────────

  /**
   * Daftar customer yang SUDAH pernah di-follow up dalam N hari terakhir.
   *
   * @param {object} params
   * @param {number|string} params.user_tenant_id
   * @param {number|string} params.user_branch_id
   * @param {string} params.user_role
   * @param {number} params.days
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string|null} params.search
   * @param {string|null} params.sort  last_followup_desc | last_followup_asc | total_followups_desc | name_asc
   */
  static async getFollowedUpCustomers({
    user_tenant_id,
    user_branch_id,
    user_role,
    days = 30,
    page = 1,
    limit = 20,
    search = null,
    sort = 'last_followup_desc',
  } = {}) {
    try {
      const pagination = this.normalizePagination(page, limit);
      const safeDays = this.normalizeDays(days, 30);
      const scope = this.buildScope(user_tenant_id, user_branch_id, user_role, 'cf');

      const searchTerm = typeof search === 'string' ? search.trim().slice(0, 100) : '';
      const replacements = {
        ...scope.replacements,
        days: safeDays,
      };

      let searchCondition = '';
      if (searchTerm) {
        searchCondition = 'AND (c.name LIKE :search OR c.phone LIKE :search)';
        replacements.search = `%${searchTerm}%`;
      }

      const countQuery = `
        SELECT COUNT(DISTINCT cf.customer_id) AS total
        FROM customer_followups cf
        INNER JOIN customers c ON c.id = cf.customer_id
        WHERE cf.deleted_at IS NULL
          AND c.deletedAt IS NULL
          AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          ${scope.clause}
          ${searchCondition}
      `;

      const countRows = await sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      const totalItems = Number(countRows?.[0]?.total) || 0;

      const sortMap = {
        last_followup_desc: 'agg.last_followup_date DESC',
        last_followup_asc: 'agg.last_followup_date ASC',
        total_followups_desc: 'agg.total_followups DESC, agg.last_followup_date DESC',
        name_asc: 'c.name ASC',
      };
      const orderBy = sortMap[sort] || sortMap.last_followup_desc;

      const dataQuery = `
        WITH followup_agg AS (
          SELECT
            cf.customer_id,
            MIN(cf.sent_at) AS first_followup_date,
            MAX(cf.sent_at) AS last_followup_date,
            COUNT(*) AS total_followups,
            SUM(CASE WHEN cf.status = 'failed' THEN 1 ELSE 0 END) AS failed_followups,
            COUNT(DISTINCT cf.branch_id) AS total_branches
          FROM customer_followups cf
          WHERE cf.deleted_at IS NULL
            AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            ${scope.clause}
          GROUP BY cf.customer_id
        ),
        last_order AS (
          SELECT
            o.customer_id,
            MAX(o.entry_date) AS last_order_date
          FROM orders o
          INNER JOIN order_details od ON od.order_id = o.id
          WHERE o.deletedAt IS NULL
            AND od.status IN ('done', 'selesai')
          GROUP BY o.customer_id
        )
        SELECT
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.gmaps,
          c.tenant_id,
          c.branch_id,
          c.createdAt,
          c.updatedAt,
          branches.name AS branch_name,
          agg.first_followup_date,
          agg.last_followup_date,
          agg.total_followups,
          agg.failed_followups,
          agg.total_branches,
          DATEDIFF(CURDATE(), agg.last_followup_date) AS days_since_last_followup,
          lo.last_order_date,
          DATEDIFF(CURDATE(), lo.last_order_date) AS days_since_last_order,
          (
            SELECT cf2.message_content
            FROM customer_followups cf2
            WHERE cf2.customer_id = c.id
              AND cf2.deleted_at IS NULL
            ORDER BY cf2.sent_at DESC, cf2.id DESC
            LIMIT 1
          ) AS last_message,
          (
            SELECT cf3.status
            FROM customer_followups cf3
            WHERE cf3.customer_id = c.id
              AND cf3.deleted_at IS NULL
            ORDER BY cf3.sent_at DESC, cf3.id DESC
            LIMIT 1
          ) AS last_status
        FROM followup_agg agg
        INNER JOIN customers c ON c.id = agg.customer_id
        LEFT JOIN branches ON branches.id = c.branch_id
        LEFT JOIN last_order lo ON lo.customer_id = c.id
        WHERE c.deletedAt IS NULL
          ${searchCondition}
        ORDER BY ${orderBy}
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      `;

      const customers = await sequelize.query(dataQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return {
        customers,
        pagination: this.buildPagination(pagination.page, pagination.limit, totalItems),
        filters: {
          days: safeDays,
          search: searchTerm || null,
          sort: sortMap[sort] ? sort : 'last_followup_desc',
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 3. Ringkasan follow-up
  // ────────────────────────────────────────────────────────────────

  /**
   * Ringkasan aktivitas follow-up dalam rentang N hari terakhir.
   */
  static async getSummary({
    user_tenant_id,
    user_branch_id,
    user_role,
    days = 30,
  } = {}) {
    try {
      const safeDays = this.normalizeDays(days, 30);
      const scope = this.buildScope(user_tenant_id, user_branch_id, user_role, 'cf');

      const query = `
        SELECT
          COUNT(*) AS total_followups,
          COUNT(DISTINCT cf.customer_id) AS total_customers,
          SUM(CASE WHEN cf.status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
          SUM(CASE WHEN cf.status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
          SUM(CASE WHEN cf.sent_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS this_month_followups,
          COUNT(DISTINCT CASE WHEN cf.sent_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN cf.customer_id END) AS this_month_customers,
          COUNT(DISTINCT CASE WHEN cf.sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN cf.customer_id END) AS customers_last_7_days,
          COUNT(DISTINCT CASE WHEN cf.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN cf.customer_id END) AS customers_last_30_days,
          MIN(cf.sent_at) AS first_followup_at,
          MAX(cf.sent_at) AS last_followup_at
        FROM customer_followups cf
        WHERE cf.deleted_at IS NULL
          AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          ${scope.clause}
      `;

      const rows = await sequelize.query(query, {
        replacements: { ...scope.replacements, days: safeDays },
        type: sequelize.QueryTypes.SELECT,
      });

      const row = rows?.[0] || {};
      const totalFollowups = Number(row.total_followups) || 0;
      const sentCount = Number(row.sent_count) || 0;
      const failedCount = Number(row.failed_count) || 0;

      return {
        range_days: safeDays,
        total_followups: totalFollowups,
        total_customers: Number(row.total_customers) || 0,
        sent_count: sentCount,
        failed_count: failedCount,
        success_rate: totalFollowups > 0
          ? Number(((sentCount / totalFollowups) * 100).toFixed(2))
          : 0,
        this_month_followups: Number(row.this_month_followups) || 0,
        this_month_customers: Number(row.this_month_customers) || 0,
        customers_last_7_days: Number(row.customers_last_7_days) || 0,
        customers_last_30_days: Number(row.customers_last_30_days) || 0,
        first_followup_at: row.first_followup_at || null,
        last_followup_at: row.last_followup_at || null,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 4. Timeline 1 customer
  // ────────────────────────────────────────────────────────────────

  /**
   * Detail 1 customer + statistik follow-up + timeline (paginated).
   * Mengembalikan `customer: null` bila customer di luar cakupan user.
   */
  static async getCustomerHistory({
    user_tenant_id,
    user_branch_id,
    user_role,
    customer_id,
    page = 1,
    limit = 20,
  } = {}) {
    try {
      const customerIdNum = parseInt(customer_id, 10);
      if (!Number.isInteger(customerIdNum) || customerIdNum <= 0) {
        throw new Error('customer_id tidak valid');
      }

      const pagination = this.normalizePagination(page, limit);
      const cfScope = this.buildScope(user_tenant_id, user_branch_id, user_role, 'cf');
      const customerScope = this.buildScope(user_tenant_id, user_branch_id, user_role, 'c');

      // ── Data customer (dengan isolasi tenant/cabang) ─────────────
      const customerQuery = `
        SELECT
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.gmaps,
          c.tenant_id,
          c.branch_id,
          c.createdAt,
          c.updatedAt,
          branches.name AS branch_name
        FROM customers c
        LEFT JOIN branches ON branches.id = c.branch_id
        WHERE c.id = :customerId
          AND c.deletedAt IS NULL
          ${customerScope.clause}
        LIMIT 1
      `;

      const customerRows = await sequelize.query(customerQuery, {
        replacements: { ...customerScope.replacements, customerId: customerIdNum },
        type: sequelize.QueryTypes.SELECT,
      });

      const customer = customerRows?.[0] || null;
      if (!customer) {
        return { customer: null, statistics: null, followups: [], pagination: this.buildPagination(pagination.page, pagination.limit, 0) };
      }

      // ── Statistik seluruh follow-up customer ini ─────────────────
      const statsQuery = `
        SELECT
          COUNT(*) AS total_followups,
          SUM(CASE WHEN cf.status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
          SUM(CASE WHEN cf.status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
          MIN(cf.sent_at) AS first_followup_at,
          MAX(cf.sent_at) AS last_followup_at,
          DATEDIFF(CURDATE(), MAX(cf.sent_at)) AS days_since_last_followup,
          COUNT(DISTINCT cf.branch_id) AS total_branches
        FROM customer_followups cf
        WHERE cf.deleted_at IS NULL
          AND cf.customer_id = :customerId
          ${cfScope.clause}
      `;

      const statsRows = await sequelize.query(statsQuery, {
        replacements: { ...cfScope.replacements, customerId: customerIdNum },
        type: sequelize.QueryTypes.SELECT,
      });
      const statsRow = statsRows?.[0] || {};
      const totalFollowups = Number(statsRow.total_followups) || 0;

      // ── Order terakhir (konteks tambahan untuk marketing) ────────
      const lastOrderQuery = `
        SELECT
          MAX(o.entry_date) AS last_order_date,
          DATEDIFF(CURDATE(), MAX(o.entry_date)) AS days_since_last_order,
          COUNT(DISTINCT o.id) AS total_orders
        FROM orders o
        INNER JOIN order_details od ON od.order_id = o.id
        WHERE o.customer_id = :customerId
          AND o.deletedAt IS NULL
          AND od.status IN ('done', 'selesai')
      `;

      const lastOrderRows = await sequelize.query(lastOrderQuery, {
        replacements: { customerId: customerIdNum },
        type: sequelize.QueryTypes.SELECT,
      });
      const lastOrder = lastOrderRows?.[0] || {};

      // ── Timeline (paginated) ────────────────────────────────────
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM customer_followups cf
        WHERE cf.deleted_at IS NULL
          AND cf.customer_id = :customerId
          ${cfScope.clause}
      `;

      const countRows = await sequelize.query(countQuery, {
        replacements: { ...cfScope.replacements, customerId: customerIdNum },
        type: sequelize.QueryTypes.SELECT,
      });
      const totalItems = Number(countRows?.[0]?.total) || 0;

      const timelineQuery = `
        SELECT
          cf.id,
          cf.customer_id,
          cf.branch_id,
          cf.message_content,
          cf.sent_at,
          cf.status,
          cf.created_at,
          branches.name AS branch_name,
          users.name AS created_by_name
        FROM customer_followups cf
        LEFT JOIN branches ON branches.id = cf.branch_id
        LEFT JOIN users ON users.id = cf.created_by
        WHERE cf.deleted_at IS NULL
          AND cf.customer_id = :customerId
          ${cfScope.clause}
        ORDER BY cf.sent_at DESC, cf.id DESC
        LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      `;

      const followups = await sequelize.query(timelineQuery, {
        replacements: { ...cfScope.replacements, customerId: customerIdNum },
        type: sequelize.QueryTypes.SELECT,
      });

      const sentCount = Number(statsRow.sent_count) || 0;

      return {
        customer,
        statistics: {
          total_followups: totalFollowups,
          sent_count: sentCount,
          failed_count: Number(statsRow.failed_count) || 0,
          success_rate: totalFollowups > 0
            ? Number(((sentCount / totalFollowups) * 100).toFixed(2))
            : 0,
          first_followup_at: statsRow.first_followup_at || null,
          last_followup_at: statsRow.last_followup_at || null,
          days_since_last_followup: statsRow.days_since_last_followup != null
            ? Number(statsRow.days_since_last_followup)
            : null,
          total_branches: Number(statsRow.total_branches) || 0,
          last_order_date: lastOrder.last_order_date || null,
          days_since_last_order: lastOrder.days_since_last_order != null
            ? Number(lastOrder.days_since_last_order)
            : null,
          total_orders: Number(lastOrder.total_orders) || 0,
        },
        followups,
        pagination: this.buildPagination(pagination.page, pagination.limit, totalItems),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = CustomerFollowupHistoryRepository;
