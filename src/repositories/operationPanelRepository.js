const { sequelize } = require('../models');

class OperationPanelRepository {
  static async getOrderDetails({ offset, pageSize, status, sort_by, sort_dir, start_date, end_date, search, user_tenant_id, user_branch_id, user_role }) {

    // --- WHERE conditions ---
    const conditions = ['od.deletedAt IS NULL', 'o.deletedAt IS NULL'];
    const params = [];

    // Tenant isolation
    if (user_role !== 'superapp-superadmin') {
      conditions.push('o.tenant_id = ?');
      params.push(user_tenant_id);
      if (user_branch_id) {
        conditions.push('o.branch_id = ?');
        params.push(user_branch_id);
      }
    }

    // Date range filter by entry_date
    if (start_date) {
      conditions.push('o.entry_date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('o.entry_date <= ?');
      params.push(end_date);
    }

    // Search filter
    if (search && search.trim()) {
      conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR t.name LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Status filter
    if (status === 'dalam_penjemputan') {
      conditions.push("od.status = 'not_yet'");
      conditions.push("od.pickup_method = 'pickup'");
    } else if (status === 'siap_dikirim') {
      conditions.push("od.status = 'siap_dikirim'");
    } else if (status === 'siap_diambil') {
      // Dua status yang sama-sama berarti "siap diambil"
      conditions.push("od.status IN ('siap', 'siap_diambil')");
    } else if (status) {
      conditions.push('od.status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // --- ORDER BY ---
    const allowedSortBy = { entry_date: 'o.entry_date', due_date: 'od.due_date' };
    const allowedSortDir = ['asc', 'desc'];
    const sortColumn = allowedSortBy[sort_by] || 'o.entry_date';
    const sortDirection = allowedSortDir.includes(sort_dir) ? sort_dir.toUpperCase() : 'ASC';
    const orderByClause = `${sortColumn} ${sortDirection}`;

    // --- COUNT query ---
    const countSql = `
      SELECT COUNT(*) as total
      FROM order_details od
      JOIN orders o          ON od.order_id = o.id
      LEFT JOIN customers c  ON o.customer_id = c.id
      LEFT JOIN treatment t  ON od.treatment_id = t.id
      WHERE ${whereClause}
    `;
    const [[{ total }]] = await sequelize.query(countSql, { replacements: params });

    // --- DATA query ---
    const dataSql = `
      SELECT
        od.id               AS od_id,
        od.status           AS od_status,
        od.pickup_method,
        od.delivery_status,
        od.delivery_date,
        od.delivery_time,
        od.due_date,
        od.final_price,
        od.custom_price,
        od.custom_price_reason,
        od.process_time,
        od.description,
        od.employee_id,
        od.courier_id,
        o.id                AS order_id,
        o.entry_date,
        o.is_notified,
        o.notified_at,
        c.id                AS customer_id,
        c.name              AS customer_name,
        c.phone             AS customer_phone,
        t.id                AS treatment_id,
        t.name              AS treatment_name,
        i.id                AS item_id,
        i.brand             AS item_brand,
        i.color             AS item_color,
        emp.name            AS employee_name,
        (
          SELECT sp.url_photo
          FROM shoes_photos sp
          WHERE sp.order_detail_id = od.id
            AND sp.deletedAt IS NULL
          ORDER BY sp.createdAt ASC
          LIMIT 1
        ) AS thumbnail
      FROM order_details od
      JOIN orders o         ON od.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN treatment t ON od.treatment_id = t.id
      LEFT JOIN items i     ON od.item_id = i.id
      LEFT JOIN users emp   ON od.employee_id = emp.id
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await sequelize.query(dataSql, {
      replacements: [...params, pageSize, offset],
    });

    // Shape response
    const orderDetails = rows.map(r => ({
      id: r.od_id,
      status: r.od_status,
      pickup_method: r.pickup_method,
      delivery_status: r.delivery_status,
      delivery_date: r.delivery_date,
      delivery_time: r.delivery_time,
      due_date: r.due_date,
      final_price: r.final_price,
      custom_price: r.custom_price,
      custom_price_reason: r.custom_price_reason,
      process_time: r.process_time,
      description: r.description,
      thumbnail: r.thumbnail,
      order: {
        id: r.order_id,
        entry_date: r.entry_date,
        is_notified: !!r.is_notified,
        notified_at: r.notified_at,
      },
      customer: {
        id: r.customer_id,
        name: r.customer_name,
        phone: r.customer_phone,
      },
      treatment: {
        id: r.treatment_id,
        name: r.treatment_name,
      },
      item: {
        id: r.item_id,
        brand: r.item_brand,
        color: r.item_color,
      },
      employee: {
        id: r.employee_id,
        name: r.employee_name,
      },
    }));

    return { totalCount: parseInt(total, 10), orderDetails };
  }
}

module.exports = OperationPanelRepository;
