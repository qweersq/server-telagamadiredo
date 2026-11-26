const { Customer, CustomerMembership, Membership, Discount, Item, Order, OrderDetail, OrderDetailStatusLog, Payment, PaymentDetail, ShoePhoto, Treatment, User, sequelize, Op, FinanceTransaction, FinanceAccount, PaymentMethod, BranchMitraRelation } = require('../models');

class OrderRepositoryNew {
  /**
   * Kolom JSON (MariaDB menyimpannya sebagai LONGTEXT) harus di-parse manual
   * saat diambil lewat raw query, supaya frontend menerima object bukan string.
   */
  static _parseJsonColumn(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper untuk mendapatkan branch ID beserta mitra/droppoint-nya
   * @param {number} branch_id 
   * @returns {Promise<Array>} - [branch_id, child_id_1, child_id_2, ...]
   */
  static async _getExtendedBranchIds(branch_id) {
    if (!branch_id) return null;
    try {
      const relations = await BranchMitraRelation.findAll({
        where: { parent_branch_id: branch_id },
        attributes: ['mitra_branch_id']
      });
      const childIds = relations.map(r => r.mitra_branch_id);
      return [branch_id, ...childIds];
    } catch (error) {
      console.error('Error fetching mitra branches:', error);
      return [branch_id];
    }
  }

  /**
   * Build WHERE clause untuk filter order_details
   * @param {Object} filter - filter object (key diawali 'order_details.')
   * @param {Object} options - { ignoreDueDate: boolean }
   *   ignoreDueDate = true -> kondisi due_date TIDAK dipakai supaya semua item
   *   milik order (termasuk yang due date-nya beda) ikut terambil.
   *   Dipakai oleh Calendar (tab "Tanggal Selesai") agar bisa menampilkan
   *   "item lainnya" dari order yang sama.
   */
  static buildOrderDetailsWhereClause(filter, options = {}) {
    const { ignoreDueDate = false } = options;
    let conditions = [];
    let params = [];

    if (filter) {
      for (const key in filter) {
        const value = filter[key];

        if (key.startsWith('order_details.')) {
          const field = key.replace('order_details.', '');

          // Lewati filter due_date kalau caller minta semua item order.
          if (field === 'due_date' && ignoreDueDate) continue;

          if (field === 'status' && Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(',');
            conditions.push(`od.${field} IN (${placeholders})`);
            params.push(...value);
          } else if (field === 'pickup_method' && Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(',');
            conditions.push(`od.${field} IN (${placeholders})`);
            params.push(...value);
          } else if (field === 'delivery_status' && Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(',');
            conditions.push(`od.${field} IN (${placeholders})`);
            params.push(...value);
          } else if (field === 'due_date' && typeof value === 'object' && value !== null) {
            if (value.gte && value.lte) {
              conditions.push('od.due_date BETWEEN ? AND ?');
              params.push(value.gte, value.lte);
            } else if (value.gte) {
              conditions.push('od.due_date >= ?');
              params.push(value.gte);
            } else if (value.lte) {
              conditions.push('od.due_date <= ?');
              params.push(value.lte);
            }
          } else if (field === 'due_date' && typeof value === 'string') {
            conditions.push('od.due_date = ?');
            params.push(value);
          }
        }
      }
    }

    return {
      whereClause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
      params
    };
  }

  /**
   * Helper method untuk membangun WHERE clause dan parameters
   * @param {Object} filter - Filter object dari request
   * @param {number} user_tenant_id - Tenant ID user
   * @param {number} user_branch_id - Branch ID user
   * @param {string} user_role - Role user
   * @returns {Object} - { whereClause: string, params: Array }
   */
  static buildWhereClause(filter, user_tenant_id, user_branch_id, user_role) {
    let conditions = [];
    let params = [];

    // Data isolation berdasarkan user role
    if (user_role === 'superapp-superadmin') {
      // Super App Super Admin bisa lihat semua data
      // Tidak perlu filter tenant_id dan branch_id
    } else if (user_role === 'superadmin') {
      // Superadmin (per tenant) bisa lihat data tenant-nya
      conditions.push('o.tenant_id = ?');
      params.push(user_tenant_id);
      if (user_branch_id) {
        if (Array.isArray(user_branch_id)) {
          conditions.push(`o.branch_id IN (${user_branch_id.map(() => '?').join(',')})`);
          params.push(...user_branch_id);
        } else {
          conditions.push('o.branch_id = ?');
          params.push(user_branch_id);
        }
      }
    } else {
      // Employee/Admin hanya bisa lihat data branch-nya
      conditions.push('o.tenant_id = ?');
      params.push(user_tenant_id);

      if (Array.isArray(user_branch_id)) {
        conditions.push(`o.branch_id IN (${user_branch_id.map(() => '?').join(',')})`);
        params.push(...user_branch_id);
      } else {
        conditions.push('o.branch_id = ?');
        params.push(user_branch_id);
      }
    }

    // Filter soft deleted orders (deletedAt IS NULL)
    conditions.push('o.deletedAt IS NULL');

    // Parse filter dinamis
    if (filter) {
      for (const key in filter) {
        const value = filter[key];

        // Filter untuk field Order langsung
        if (key === 'entry_date') {
          if (typeof value === 'object' && value !== null) {
            if (value.gte && value.lte) {
              conditions.push('o.entry_date BETWEEN ? AND ?');
              params.push(value.gte, value.lte);
            } else if (value.gte) {
              conditions.push('o.entry_date >= ?');
              params.push(value.gte);
            } else if (value.lte) {
              conditions.push('o.entry_date <= ?');
              params.push(value.lte);
            }
          } else if (typeof value === 'string') {
            conditions.push('o.entry_date = ?');
            params.push(value);
          }
        } else if (key === 'search') {
          // Search in customer name and phone number
          conditions.push('(c.name LIKE ? OR c.phone LIKE ?)');
          params.push(`%${value}%`, `%${value}%`);
        } else if (key.startsWith('order_details.')) {
          const field = key.replace('order_details.', '');
          if (field === 'status' && Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(',');
            conditions.push(`od.${field} IN (${placeholders})`);
            params.push(...value);
          } else if (field === 'pickup_method' && Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(',');
            conditions.push(`od.${field} IN (${placeholders})`);
            params.push(...value);
          } else if (field === 'delivery_status' && Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(',');
            conditions.push(`od.${field} IN (${placeholders})`);
            params.push(...value);
          } else if (field === 'due_date' && typeof value === 'object' && value !== null) {
            if (value.gte && value.lte) {
              conditions.push('od.due_date BETWEEN ? AND ?');
              params.push(value.gte, value.lte);
            } else if (value.gte) {
              conditions.push('od.due_date >= ?');
              params.push(value.gte);
            } else if (value.lte) {
              conditions.push('od.due_date <= ?');
              params.push(value.lte);
            }
          } else if (field === 'due_date' && typeof value === 'string') {
            conditions.push('od.due_date = ?');
            params.push(value);
          }
        } else if (key.startsWith('payment.')) {
          const field = key.replace('payment.', '');
          if (field === 'status') {
            conditions.push('p.status = ?');
            params.push(value);
          }
        } else if (key.startsWith('payment_details.')) {
          const field = key.replace('payment_details.', '');
          if (field === 'status') {
            conditions.push('pd.status = ?');
            params.push(value);
          } else if (field === 'createdAt' && typeof value === 'object' && value !== null) {
            if (value.gte && value.lte) {
              conditions.push('pd.createdAt BETWEEN ? AND ?');
              params.push(value.gte, value.lte);
            } else if (value.gte) {
              conditions.push('pd.createdAt >= ?');
              params.push(value.gte);
            } else if (value.lte) {
              conditions.push('pd.createdAt <= ?');
              params.push(value.lte);
            }
          } else if (field === 'createdAt' && typeof value === 'string') {
            conditions.push('DATE(pd.createdAt) = ?');
            params.push(value);
          }
        }
      }
    }

    return {
      whereClause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
      params
    };
  }

  /**
   * NEW: Get all orders dengan Raw SQL Query (MINIMAL VERSION)
   * @param {Object} params - { offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role, includeOtherOrderDetails }
   *   includeOtherOrderDetails = true -> filter order (mis. od.due_date) tetap
   *   dipakai untuk menentukan ORDER mana yang muncul, tapi daftar
   *   order_details yang dikembalikan TIDAK difilter sehingga semua item milik
   *   order ikut terkirim. Tiap detail diberi flag is_due_on_filter_date.
   * @returns {Object} - { totalCount, orders }
   */
  static async getAllOrderNewRawMinimal({ offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role, includeOtherOrderDetails = false }) {
    try {
      // Extend branch ID if checking specific branch (handle mitra visibility)
      let targetBranchIds = user_branch_id;
      if (user_branch_id && !Array.isArray(user_branch_id)) {
        targetBranchIds = await this._getExtendedBranchIds(user_branch_id);
      }

      console.log('🔍 getAllOrderNewRawMinimal - Input params:', { offset, pageSizeInt, filter, user_tenant_id, user_branch_id, targetBranchIds, user_role });

      const { whereClause, params } = this.buildWhereClause(filter, user_tenant_id, targetBranchIds, user_role);

      console.log('🔍 getAllOrderNewRawMinimal - whereClause:', whereClause);
      console.log('🔍 getAllOrderNewRawMinimal - params:', params);

      // Query untuk count total dengan relasi yang diperlukan
      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
      `;

      const countResult = await sequelize.query(countQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const totalCount = countResult[0].total_count;

      // Query untuk data orders dengan relasi yang diperlukan
      const dataQuery = `
        SELECT DISTINCT 
          o.id,
          o.customer_id,
          o.branch_id,
          o.payment_id,
          o.entry_date,
          o.quantity,
          o.order_type,
          o.table_number,
          o.createdAt,
          o.updatedAt,
          o.created_by,
          o.shift_id,
          o.tenant_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          c.address as customer_address,
          c.gmaps as customer_gmaps,
          p.code as payment_code,
          p.status as payment_status,
          p.final_price as payment_final_price,
          p.total_service,
          p.subtotal,
          p.total_discount,
          p.additional_cost,
          p.paid_amount,
          p.remaining_amount,
          p.due_date as payment_due_date,
          p.notes as payment_notes,
          p.createdAt as payment_createdAt,
          p.updatedAt as payment_updatedAt,
          p.deletedAt as payment_deletedAt,
          p.method as payment_method,
          p.total_process_time_cost,
          p.total_price,
          p.date as payment_date,
          p.money,
          p.change,
          p.evidence_photo,
          p.tenant_id as payment_tenant_id,
          b.name as branch_name,
          b.branch_type as branch_type
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN branches b ON o.branch_id = b.id
        LEFT JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...params, pageSizeInt, offset];
      const orders = await sequelize.query(dataQuery, {
        replacements: dataParams,
        type: sequelize.QueryTypes.SELECT
      });

      // Ambil order details untuk setiap order dengan filter
      const orderIds = orders.map(order => order.id);
      if (orderIds.length > 0) {
        // Build filter untuk order_details
        // includeOtherOrderDetails = true -> due_date TIDAK difilter di sini,
        // jadi semua item milik order ikut terambil (item "lainnya").
        const orderDetailsFilter = this.buildOrderDetailsWhereClause(filter, {
          ignoreDueDate: includeOtherOrderDetails
        });

        // Nilai tanggal yang dipakai memfilter order. Dipakai untuk menandai
        // item mana yang benar-benar due pada tanggal tersebut.
        const filterDueDate = filter && filter['order_details.due_date'];
        const hasStringDueDate = typeof filterDueDate === 'string';
        const dueDateFlagSelect = includeOtherOrderDetails && hasStringDueDate
          ? `CASE WHEN od.due_date = ? THEN 1 ELSE 0 END as is_due_on_filter_date`
          : `0 as is_due_on_filter_date`;
        const dueDateFlagParams = includeOtherOrderDetails && hasStringDueDate ? [filterDueDate] : [];

        const orderDetailsQuery = `
          SELECT 
            od.id,
            od.order_id,
            od.employee_id,
            od.treatment_id,
            od.item_id,
            od.price,
            od.discount_id,
            od.process_time,
            od.process_time_cost,
            od.final_price,
            od.custom_price,
            od.custom_price_reason,
            od.status,
            od.due_date,
            od.description,
            od.serve_mode,
            od.options_json,
            od.pickup_method,
            od.delivery_date,
            od.delivery_time,
            od.courier_id,
            od.delivery_status,
            od.perfume,
            od.createdAt,
            od.updatedAt,
            od.deletedAt,
            i.name as item_name,
            i.brand,
            i.type as item_type,
            i.color,
            i.material,
            t.name as treatment_name,
            t.price as treatment_price,
            t.type_item,
            t.type_service,
            t.description as treatment_description,
            t.is_active,
            u.name as employee_name,
            u.email as employee_email,
            u.phone as employee_phone,
            u.address as employee_address,
            u.status as employee_status,
            u.role as employee_role,
            d.name as discount_name,
            d.type as discount_type,
            d.discount as discount_amount,
            d.is_active as discount_is_active,
            ${dueDateFlagSelect}
          FROM order_details od
          LEFT JOIN items i ON od.item_id = i.id
          LEFT JOIN treatment t ON od.treatment_id = t.id
          LEFT JOIN users u ON od.employee_id = u.id
          LEFT JOIN discounts d ON od.discount_id = d.id
          WHERE od.order_id IN (${orderIds.map(() => '?').join(',')})
          AND od.deletedAt IS NULL
          AND ${orderDetailsFilter.whereClause}
          ORDER BY od.order_id, od.id
        `;

        // Urutan replacements HARUS sama dengan urutan placeholder:
        // SELECT (flag due date) -> WHERE order_id IN -> WHERE filter
        const orderDetails = await sequelize.query(orderDetailsQuery, {
          replacements: [...dueDateFlagParams, ...orderIds, ...orderDetailsFilter.params],
          type: sequelize.QueryTypes.SELECT
        });

        // Group order details by order_id
        const orderDetailsMap = {};
        orderDetails.forEach(detail => {
          if (!orderDetailsMap[detail.order_id]) {
            orderDetailsMap[detail.order_id] = [];
          }

          const formattedDetail = {
            id: detail.id,
            order_id: detail.order_id,
            employee_id: detail.employee_id,
            treatment_id: detail.treatment_id,
            item_id: detail.item_id,
            price: detail.price,
            discount_id: detail.discount_id,
            process_time: detail.process_time,
            process_time_cost: detail.process_time_cost,
            final_price: detail.final_price,
            custom_price: detail.custom_price,
            custom_price_reason: detail.custom_price_reason,
            status: detail.status,
            due_date: detail.due_date,
            // true = item ini due pada tanggal yang dipilih di kalender.
            // false = item lain dari order yang sama (due date berbeda).
            is_due_on_filter_date: detail.is_due_on_filter_date === 1 || detail.is_due_on_filter_date === true,
            description: detail.description,
            serve_mode: detail.serve_mode,
            options_json: OrderRepositoryNew._parseJsonColumn(detail.options_json),
            pickup_method: detail.pickup_method,
            delivery_date: detail.delivery_date,
            delivery_time: detail.delivery_time,
            courier_id: detail.courier_id,
            delivery_status: detail.delivery_status,
            perfume: detail.perfume,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
            deletedAt: detail.deletedAt,
            item: {
              id: detail.item_id,
              name: detail.item_name,
              brand: detail.brand,
              type: detail.item_type,
              color: detail.color,
              material: detail.material,
              tenant_id: 1,
              createdAt: null,
              updatedAt: null,
              deletedAt: null
            },
            treatment: {
              id: detail.treatment_id,
              name: detail.treatment_name,
              price: detail.treatment_price,
              type_item: detail.type_item,
              type_service: detail.type_service,
              description: detail.treatment_description,
              tenant_id: 1,
              is_active: detail.is_active,
              createdAt: null,
              updatedAt: null,
              deletedAt: null
            },
            employee: {
              id: detail.employee_id,
              branch_id: 1,
              name: detail.employee_name,
              email: detail.employee_email,
              password: '',
              phone: detail.employee_phone,
              address: detail.employee_address,
              status: detail.employee_status,
              role: detail.employee_role,
              salary: null,
              salary_date: null,
              tenant_id: 1,
              createdAt: null,
              updatedAt: null,
              deletedAt: null
            },
            discount: {
              id: detail.discount_id,
              name: detail.discount_name,
              type: detail.discount_type,
              discount: detail.discount_amount,
              is_active: detail.discount_is_active,
              tenant_id: 1,
              createdAt: null,
              updatedAt: null,
              deletedAt: null
            },
            shoes_photos: [],
            courier: null,
            status_logs: []
          };

          orderDetailsMap[detail.order_id].push(formattedDetail);
        });

        // Ambil shoes_photos untuk setiap order detail
        const orderDetailIds = [...new Set(orderDetails.map(detail => detail.id))];
        if (orderDetailIds.length > 0) {
          const shoesPhotosQuery = `
            SELECT order_detail_id, id, url_photo, createdAt, updatedAt, deletedAt
            FROM shoes_photos
            WHERE order_detail_id IN (${orderDetailIds.map(() => '?').join(',')})
            AND deletedAt IS NULL
            ORDER BY order_detail_id, id
          `;

          const shoesPhotos = await sequelize.query(shoesPhotosQuery, {
            replacements: orderDetailIds,
            type: sequelize.QueryTypes.SELECT
          });

          // Group shoes photos by order_detail_id
          const shoesPhotosMap = {};
          shoesPhotos.forEach(photo => {
            if (!shoesPhotosMap[photo.order_detail_id]) {
              shoesPhotosMap[photo.order_detail_id] = [];
            }
            shoesPhotosMap[photo.order_detail_id].push({
              id: photo.id,
              order_detail_id: photo.order_detail_id,
              url_photo: photo.url_photo,
              createdAt: photo.createdAt,
              updatedAt: photo.updatedAt,
              deletedAt: photo.deletedAt
            });
          });

          // Ambil status_logs untuk setiap order detail
          const statusLogsQuery = `
            SELECT odsl.order_detail_id, odsl.id, odsl.old_status, odsl.new_status, 
                   odsl.updated_by, odsl.created_at, u.name as updated_by_name
            FROM order_detail_status_logs odsl
            LEFT JOIN users u ON odsl.updated_by = u.id
            WHERE odsl.order_detail_id IN (${orderDetailIds.map(() => '?').join(',')})
            ORDER BY odsl.order_detail_id, odsl.created_at
          `;

          const statusLogs = await sequelize.query(statusLogsQuery, {
            replacements: orderDetailIds,
            type: sequelize.QueryTypes.SELECT
          });

          // Group status logs by order_detail_id
          const statusLogsMap = {};
          statusLogs.forEach(log => {
            if (!statusLogsMap[log.order_detail_id]) {
              statusLogsMap[log.order_detail_id] = [];
            }
            statusLogsMap[log.order_detail_id].push({
              id: log.id,
              order_detail_id: log.order_detail_id,
              old_status: log.old_status,
              new_status: log.new_status,
              updated_by: log.updated_by,
              created_at: log.created_at,
              updated_by_name: log.updated_by_name
            });
          });

          // Update order details dengan shoes_photos dan status_logs
          Object.keys(orderDetailsMap).forEach(orderId => {
            orderDetailsMap[orderId].forEach(orderDetail => {
              orderDetail.shoes_photos = shoesPhotosMap[orderDetail.id] || [];
              orderDetail.status_logs = statusLogsMap[orderDetail.id] || [];
            });
          });
        }

        // Attach order details to orders
        orders.forEach(order => {
          order.order_details = orderDetailsMap[order.id] || [];
        });
      }

      // Ambil payment details untuk setiap order
      const paymentIds = orders.map(order => order.payment_id).filter(id => id);
      if (paymentIds.length > 0) {
        const paymentDetailsQuery = `
          SELECT 
            pd.id,
            pd.transaction_id,
            pd.payment_id,
            pd.method,
            pd.amount,
            pd.fee,
            pd.interest,
            pd.final_amount,
            pd.evidence_photo,
            pd.finance_account_id,
            pd.finance_category_id,
            pd.shift_id,
            pd.payment_method_id,
            pd.createdAt,
            pd.updatedAt,
            pd.deletedAt,
            fa.name as finance_account_name,
            fa.balance as finance_account_balance,
            fa.description as finance_account_description,
            fa.tenant_id as finance_account_tenant_id,
            fa.branch_id as finance_account_branch_id,
            fa.is_global as finance_account_is_global,
            fa.is_branch_specific as finance_account_is_branch_specific,
            fa.is_active as finance_account_is_active,
            fa.payment_method_id as finance_account_payment_method_id,
            pm.id as payment_method_id,
            pm.name as payment_method_name,
            pm.code as payment_method_code,
            pm.type as payment_method_type,
            pm.icon as payment_method_icon,
            pm.is_active as payment_method_is_active,
            pm.fee_percentage as payment_method_fee_percentage,
            pm.fee_fixed as payment_method_fee_fixed
          FROM payment_details pd
          LEFT JOIN finance_accounts fa ON pd.finance_account_id = fa.id
          LEFT JOIN payment_methods pm ON fa.payment_method_id = pm.id
          WHERE pd.payment_id IN (${paymentIds.map(() => '?').join(',')})
          ORDER BY pd.payment_id, pd.id
        `;

        const paymentDetails = await sequelize.query(paymentDetailsQuery, {
          replacements: paymentIds,
          type: sequelize.QueryTypes.SELECT
        });

        // Group payment details by payment_id
        const paymentDetailsMap = {};
        paymentDetails.forEach(detail => {
          if (!paymentDetailsMap[detail.payment_id]) {
            paymentDetailsMap[detail.payment_id] = [];
          }

          const formattedPaymentDetail = {
            id: detail.id,
            transaction_id: detail.transaction_id,
            payment_id: detail.payment_id,
            method: detail.method,
            amount: detail.amount,
            fee: detail.fee,
            interest: detail.interest,
            final_amount: detail.final_amount,
            evidence_photo: detail.evidence_photo,
            finance_account_id: detail.finance_account_id,
            finance_category_id: detail.finance_category_id,
            shift_id: detail.shift_id,
            payment_method_id: detail.payment_method_id,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
            deletedAt: detail.deletedAt,
            finance_account: detail.finance_account_id ? {
              id: detail.finance_account_id,
              name: detail.finance_account_name,
              balance: detail.finance_account_balance,
              description: detail.finance_account_description,
              tenant_id: detail.finance_account_tenant_id,
              branch_id: detail.finance_account_branch_id,
              is_global: detail.finance_account_is_global,
              is_branch_specific: detail.finance_account_is_branch_specific,
              is_active: detail.finance_account_is_active,
              payment_method_id: detail.finance_account_payment_method_id,
              createdAt: null,
              updatedAt: null,
              deletedAt: null
            } : null,
            payment_method: detail.payment_method_id ? {
              id: detail.payment_method_id,
              name: detail.payment_method_name,
              code: detail.payment_method_code,
              type: detail.payment_method_type,
              icon: detail.payment_method_icon,
              is_active: detail.payment_method_is_active,
              fee_percentage: detail.payment_method_fee_percentage,
              fee_fixed: detail.payment_method_fee_fixed,
              created_at: null,
              updated_at: null
            } : null
          };

          paymentDetailsMap[detail.payment_id].push(formattedPaymentDetail);
        });

        // Attach payment details to orders
        orders.forEach(order => {
          if (order.payment_id) {
            order.payment = {
              id: order.payment_id,
              code: order.payment_code,
              status: order.payment_status,
              final_price: order.payment_final_price,
              total_service: order.total_service,
              subtotal: order.subtotal,
              total_discount: order.total_discount,
              additional_cost: order.additional_cost,
              paid_amount: order.paid_amount,
              remaining_amount: order.remaining_amount,
              due_date: order.payment_due_date,
              notes: order.payment_notes,
              createdAt: order.payment_createdAt,
              updatedAt: order.payment_updatedAt,
              deletedAt: order.payment_deletedAt,
              method: order.payment_method,
              total_process_time_cost: order.total_process_time_cost,
              total_price: order.total_price,
              date: order.payment_date,
              money: order.money,
              change: order.change,
              evidence_photo: order.evidence_photo,
              tenant_id: order.payment_tenant_id,
              payment_details: paymentDetailsMap[order.payment_id] || []
            };
          }
        });
      }

      // Ambil creator info untuk setiap order
      const creatorIds = [...new Set(orders.map(order => order.created_by).filter(id => id))];
      if (creatorIds.length > 0) {
        const creatorQuery = `
          SELECT id, name, email
          FROM users
          WHERE id IN (${creatorIds.map(() => '?').join(',')})
        `;

        const creators = await sequelize.query(creatorQuery, {
          replacements: creatorIds,
          type: sequelize.QueryTypes.SELECT
        });

        const creatorMap = {};
        creators.forEach(creator => {
          creatorMap[creator.id] = creator;
        });

        // Attach creator info to orders
        orders.forEach(order => {
          order.creator = creatorMap[order.created_by] || null;
        });
      }

      // Attach customer info dengan data dari database
      orders.forEach(order => {
        order.customer = {
          id: order.customer_id,
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email,
          address: order.customer_address,
          gmaps: order.customer_gmaps,
          tenant_id: order.tenant_id,
          branch_id: order.branch_id,
          current_membership_id: null
        };
      });

      return { totalCount, orders };
    } catch (error) {
      console.error('❌ getAllOrderNewRawMinimal error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * NEW: Get all orders dengan Raw SQL Query - Complete Implementation dengan struktur response yang sama
   * @param {Object} params - { offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - { totalCount, orders }
   */
  static async getAllOrderNewRawComplete({ offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Extend branch ID if checking specific branch (handle mitra visibility)
      let targetBranchIds = user_branch_id;
      if (user_branch_id && !Array.isArray(user_branch_id)) {
        targetBranchIds = await this._getExtendedBranchIds(user_branch_id);
      }

      console.log('🔍 getAllOrderNewRawComplete - Input params:', { offset, pageSizeInt, filter, user_tenant_id, user_branch_id, targetBranchIds, user_role });

      const { whereClause, params } = this.buildWhereClause(filter, user_tenant_id, targetBranchIds, user_role);

      console.log('🔍 getAllOrderNewRawComplete - whereClause:', whereClause);
      console.log('🔍 getAllOrderNewRawComplete - params:', params);

      // Query untuk count total dengan relasi yang diperlukan
      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
      `;

      const countResult = await sequelize.query(countQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const totalCount = countResult[0].total_count;

      // Query untuk data orders
      const dataQuery = `
        SELECT DISTINCT 
          o.id,
          o.customer_id,
          o.branch_id,
          o.payment_id,
          o.entry_date,
          o.quantity,
          o.order_type,
          o.table_number,
          o.createdAt,
          o.updatedAt,
          o.created_by,
          o.shift_id,
          o.tenant_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          p.status as payment_status,
          p.method as payment_method,
          p.total_price,
          p.final_price,
          p.paid_amount,
          p.remaining_amount,
          b.name as branch_name,
          b.branch_type as branch_type
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN branches b ON o.branch_id = b.id
        LEFT JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...params, pageSizeInt, offset];
      const orders = await sequelize.query(dataQuery, {
        replacements: dataParams,
        type: sequelize.QueryTypes.SELECT
      });

      // Ambil order details untuk setiap order
      const orderIds = orders.map(order => order.id);
      if (orderIds.length > 0) {
        const orderDetailsQuery = `
          SELECT 
            od.id,
            od.order_id,
            od.item_id,
            od.treatment_id,
            od.employee_id,
            od.status,
            od.price,
            od.final_price,
            od.custom_price,
            od.custom_price_reason,
            od.discount_id,
            od.createdAt,
            od.updatedAt,
            i.name as item_name,
            t.name as treatment_name,
            u.name as employee_name,
            d.name as discount_name,
            d.discount as discount_amount,
            d.type as discount_type
          FROM order_details od
          LEFT JOIN items i ON od.item_id = i.id
          LEFT JOIN treatment t ON od.treatment_id = t.id
          LEFT JOIN users u ON od.employee_id = u.id
          LEFT JOIN discounts d ON od.discount_id = d.id
          WHERE od.order_id IN (${orderIds.map(() => '?').join(',')})
          ORDER BY od.order_id, od.id
        `;

        const orderDetails = await sequelize.query(orderDetailsQuery, {
          replacements: orderIds,
          type: sequelize.QueryTypes.SELECT
        });

        // Group order details by order_id
        const orderDetailsMap = {};
        orderDetails.forEach(detail => {
          if (!orderDetailsMap[detail.order_id]) {
            orderDetailsMap[detail.order_id] = [];
          }
          orderDetailsMap[detail.order_id].push(detail);
        });

        // Attach order details to orders
        orders.forEach(order => {
          order.order_details = orderDetailsMap[order.id] || [];
        });
      }

      // Ambil payment details untuk setiap order
      const paymentIds = orders.map(order => order.payment_id).filter(id => id);
      if (paymentIds.length > 0) {
        const paymentDetailsQuery = `
          SELECT 
            pd.id,
            pd.payment_id,
            pd.method,
            pd.amount,
            pd.final_amount,
            pd.status,
            pd.createdAt,
            pd.updatedAt
          FROM payment_details pd
          WHERE pd.payment_id IN (${paymentIds.map(() => '?').join(',')})
          ORDER BY pd.payment_id, pd.id
        `;

        const paymentDetails = await sequelize.query(paymentDetailsQuery, {
          replacements: paymentIds,
          type: sequelize.QueryTypes.SELECT
        });

        // Group payment details by payment_id
        const paymentDetailsMap = {};
        paymentDetails.forEach(detail => {
          if (!paymentDetailsMap[detail.payment_id]) {
            paymentDetailsMap[detail.payment_id] = [];
          }
          paymentDetailsMap[detail.payment_id].push(detail);
        });

        // Attach payment details to orders
        orders.forEach(order => {
          if (order.payment_id) {
            order.payment = {
              id: order.payment_id,
              status: order.payment_status,
              method: order.payment_method,
              total_price: order.total_price,
              final_price: order.final_price,
              paid_amount: order.paid_amount,
              remaining_amount: order.remaining_amount,
              payment_details: paymentDetailsMap[order.payment_id] || []
            };
          }
        });
      }

      // Attach customer info
      orders.forEach(order => {
        order.customer = {
          id: order.customer_id,
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email
        };
      });

      return { totalCount, orders };
    } catch (error) {
      console.error('❌ getAllOrderNewRawComplete error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * NEW: Get all orders dengan Raw SQL Query
   * @param {Object} params - { offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - { totalCount, orders }
   */
  static async getAllOrderNewRaw({ offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Extend branch ID if checking specific branch (handle mitra visibility)
      let targetBranchIds = user_branch_id;
      if (user_branch_id && !Array.isArray(user_branch_id)) {
        targetBranchIds = await this._getExtendedBranchIds(user_branch_id);
      }

      console.log('🔍 getAllOrderNewRaw - Input params:', { offset, pageSizeInt, filter, user_tenant_id, user_branch_id, targetBranchIds, user_role });

      const { whereClause, params } = this.buildWhereClause(filter, user_tenant_id, targetBranchIds, user_role);

      console.log('🔍 getAllOrderNewRaw - whereClause:', whereClause);
      console.log('🔍 getAllOrderNewRaw - params:', params);

      // Query untuk count total
      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
      `;

      const countResult = await sequelize.query(countQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      const totalCount = countResult[0].total_count;

      // Query untuk data orders
      const dataQuery = `
        SELECT DISTINCT 
          o.id,
          o.customer_id,
          o.branch_id,
          o.payment_id,
          o.entry_date,
          o.quantity,
          o.order_type,
          o.table_number,
          o.createdAt,
          o.updatedAt,
          o.created_by,
          o.shift_id,
          o.tenant_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          p.status as payment_status,
          p.method as payment_method,
          p.total_price,
          p.final_price,
          p.paid_amount,
          p.remaining_amount,
          b.name as branch_name,
          b.branch_type as branch_type
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN branches b ON o.branch_id = b.id
        LEFT JOIN order_details od ON o.id = od.order_id
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...params, pageSizeInt, offset];
      const orders = await sequelize.query(dataQuery, {
        replacements: dataParams,
        type: sequelize.QueryTypes.SELECT
      });

      // Ambil order details untuk setiap order
      const orderIds = orders.map(order => order.id);
      if (orderIds.length > 0) {
        const orderDetailsQuery = `
          SELECT 
            od.id,
            od.order_id,
            od.item_id,
            od.treatment_id,
            od.employee_id,
            od.status,
            od.price,
            od.final_price,
            od.custom_price,
            od.custom_price_reason,
            od.discount_id,
            od.createdAt,
            od.updatedAt,
            i.name as item_name,
            t.name as treatment_name,
            u.name as employee_name,
            d.name as discount_name,
            d.discount as discount_amount,
            d.type as discount_type
          FROM order_details od
          LEFT JOIN items i ON od.item_id = i.id
          LEFT JOIN treatment t ON od.treatment_id = t.id
          LEFT JOIN users u ON od.employee_id = u.id
          LEFT JOIN discounts d ON od.discount_id = d.id
          WHERE od.order_id IN (${orderIds.map(() => '?').join(',')})
          ORDER BY od.order_id, od.id
        `;

        const orderDetails = await sequelize.query(orderDetailsQuery, {
          replacements: orderIds,
          type: sequelize.QueryTypes.SELECT
        });

        // Group order details by order_id
        const orderDetailsMap = {};
        orderDetails.forEach(detail => {
          if (!orderDetailsMap[detail.order_id]) {
            orderDetailsMap[detail.order_id] = [];
          }
          orderDetailsMap[detail.order_id].push(detail);
        });

        // Attach order details to orders
        orders.forEach(order => {
          order.order_details = orderDetailsMap[order.id] || [];
        });
      }

      // Ambil payment details untuk setiap order
      const paymentIds = orders.map(order => order.payment_id).filter(id => id);
      if (paymentIds.length > 0) {
        const paymentDetailsQuery = `
          SELECT 
            pd.id,
            pd.payment_id,
            pd.method,
            pd.amount,
            pd.final_amount,
            pd.status,
            pd.createdAt,
            pd.updatedAt
          FROM payment_details pd
          WHERE pd.payment_id IN (${paymentIds.map(() => '?').join(',')})
          ORDER BY pd.payment_id, pd.id
        `;

        const paymentDetails = await sequelize.query(paymentDetailsQuery, {
          replacements: paymentIds,
          type: sequelize.QueryTypes.SELECT
        });

        // Group payment details by payment_id
        const paymentDetailsMap = {};
        paymentDetails.forEach(detail => {
          if (!paymentDetailsMap[detail.payment_id]) {
            paymentDetailsMap[detail.payment_id] = [];
          }
          paymentDetailsMap[detail.payment_id].push(detail);
        });

        // Attach payment details to orders
        orders.forEach(order => {
          if (order.payment_id) {
            order.payment = {
              id: order.payment_id,
              status: order.payment_status,
              method: order.payment_method,
              total_price: order.total_price,
              final_price: order.final_price,
              paid_amount: order.paid_amount,
              remaining_amount: order.remaining_amount,
              payment_details: paymentDetailsMap[order.payment_id] || []
            };
          }
        });
      }

      // Attach customer info
      orders.forEach(order => {
        order.customer = {
          id: order.customer_id,
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email
        };
      });

      return { totalCount, orders };
    } catch (error) {
      console.error('❌ getAllOrderNewRaw error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * NEW: Get statistics dengan Raw SQL Query
   * @param {Object} params - { filter, user_tenant_id, user_branch_id, user_role }
   * @returns {Object} - Statistics object
   */
  static async getStatisticsNewRaw({ filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // ✅ FIX: Statistics TIDAK extend ke droppoint - hanya branch yang diakses
      // Ini memastikan statistik hanya menghitung order dari cabang yang sedang dilihat
      // Tidak include order dari droppoint meskipun droppoint berada di bawah cabang ini
      const targetBranchIds = user_branch_id; // Langsung pakai tanpa extend

      console.log('🔍 getStatisticsNewRaw called with:', { filter, user_tenant_id, user_branch_id, targetBranchIds, user_role });
      console.log('📊 Statistics: NOT extending to droppoint branches (only current branch)');

      const { whereClause, params } = this.buildWhereClause(filter, user_tenant_id, targetBranchIds, user_role);

      console.log('🔍 getStatisticsNewRaw - whereClause:', whereClause);
      console.log('🔍 getStatisticsNewRaw - params:', params);

      // Query untuk mendapatkan semua data orders yang sesuai filter
      const ordersQuery = `
        SELECT DISTINCT
          o.id,
          o.entry_date,
          o.quantity,
          p.id as payment_id,
          p.total_price,
          p.final_price,
          p.status as payment_status,
          od.id as order_detail_id,
          od.status as order_detail_status,
          od.price as order_detail_price,
          od.is_product,
          od.item_id
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        -- ✅ od.deletedAt IS NULL harus di ON, bukan WHERE: order_details yang sudah
        --    dihapus tidak boleh ikut dihitung di count_services.
        LEFT JOIN order_details od ON o.id = od.order_id AND od.deletedAt IS NULL
        LEFT JOIN payments p ON o.payment_id = p.id
        LEFT JOIN payment_details pd ON p.id = pd.payment_id
        WHERE ${whereClause}
        ORDER BY o.id DESC
      `;

      const orders = await sequelize.query(ordersQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      // Ambil payment_ids dari orders yang sudah difilter
      const paymentIds = [...new Set(orders.map(order => order.payment_id).filter(id => id))];

      // Debug: Log payment IDs
      console.log('🔍 Payment IDs from orders:', paymentIds);

      let paymentDetails = [];
      if (paymentIds.length > 0) {
        // Query untuk mendapatkan payment_details dengan finance_account - menggunakan parameterized query
        const paymentDetailsQuery = `
          SELECT 
            pd.payment_id,
            pd.amount,
            pd.final_amount,
            fa.payment_method_id,
            pm.code as payment_method_code,
            pm.name as payment_method_name
          FROM payment_details pd
          LEFT JOIN finance_accounts fa ON pd.finance_account_id = fa.id
          LEFT JOIN payment_methods pm ON fa.payment_method_id = pm.id
          WHERE pd.payment_id IN (${paymentIds.map(() => '?').join(',')})
          AND pd.deletedAt IS NULL
        `;

        console.log('🔍 Payment Details Query:', paymentDetailsQuery);
        console.log('🔍 Payment Details Params:', paymentIds);
        console.log('🔍 Payment Details Params Length:', paymentIds.length);

        paymentDetails = await sequelize.query(paymentDetailsQuery, {
          replacements: paymentIds,
          type: sequelize.QueryTypes.SELECT
        });

        console.log('🔍 Payment Details Result Length:', paymentDetails.length);
        console.log('🔍 Payment Details Result:', paymentDetails);
      }

      // Debug: Log final payment details
      console.log('🔍 Final payment details for statistics:', paymentDetails);

      // Ambil semua order_details dari orders yang sudah difilter untuk service_status
      const orderIds = [...new Set(orders.map(order => order.id))];
      let allOrderDetails = [];

      if (orderIds.length > 0) {
        const allOrderDetailsQuery = `
          SELECT 
            od.status,
            od.order_id
          FROM order_details od
          WHERE od.order_id IN (${orderIds.map(() => '?').join(',')})
          AND od.deletedAt IS NULL
        `;

        console.log('🔍 All Order Details Query:', allOrderDetailsQuery);
        console.log('🔍 All Order Details Params:', orderIds);

        allOrderDetails = await sequelize.query(allOrderDetailsQuery, {
          replacements: orderIds,
          type: sequelize.QueryTypes.SELECT
        });

        console.log('🔍 All Order Details Result:', allOrderDetails);
      }

      // ✅ Breakdown per layanan (tiket, paket, resto, parkir) — relevan untuk Telaga
      let serviceBreakdown = [];
      try {
        const breakdownQuery = `
          SELECT
            x.treatment_id,
            t.name AS treatment_name,
            COUNT(*) AS qty,
            SUM(x.price) AS amount
          FROM (
            SELECT DISTINCT od.id, od.treatment_id, od.final_price AS price
            FROM order_details od
            INNER JOIN orders o ON od.order_id = o.id
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN payments p ON o.payment_id = p.id
            LEFT JOIN payment_details pd ON p.id = pd.payment_id
            WHERE ${whereClause}
            AND od.deletedAt IS NULL
          ) x
          LEFT JOIN treatment t ON x.treatment_id = t.id
          GROUP BY x.treatment_id, t.name
          ORDER BY qty DESC
        `;

        serviceBreakdown = await sequelize.query(breakdownQuery, {
          replacements: params,
          type: sequelize.QueryTypes.SELECT
        });
      } catch (breakdownError) {
        console.error('⚠️ Gagal menghitung breakdown layanan:', breakdownError.message);
      }

      // Hitung statistics
      const statistics = {
        count_transaction: 0,
        count_services: 0,
        count_visitors: 0,
        count_products: 0,
        quantity_items: 0,
        sum_revenue: 0,
        avg_transaction: 0,
        payment_status: { paid: 0, unpaid: 0, dp: 0 },
        payment_method: [],
        service_status: {
          not_yet: 0,
          antrian: 0,
          on_progress: 0,
          pengeringan: 0,
          siap: 0,
          siap_diambil: 0,
          siap_dikirim: 0,
          done: 0,
          selesai: 0,
          cancelled: 0
        },
        service_breakdown: [],
        payment_details: {
          total_order_paid: 0,      // Order lunas
          total_dp_paid: 0,          // Uang DP yang sudah masuk
          total_dp_remaining: 0,    // Sisa DP yang belum dibayar
          total_order_unpaid: 0,     // Order yang belum bayar sama sekali
          total_paid: 0,             // Total uang masuk (lunas + DP)
          total_outstanding: 0,      // Total tagihan belum tertagih
          methods: []
        }
      };

      // Process orders untuk statistics
      const processedOrderIds = new Set();
      const processedItemKeys = new Set(); // pasangan unik (order_id, item_id)
      const orderPaymentMap = {};

      // Debug: Log payment details
      console.log('🔍 Payment Details from query:', paymentDetails);

      // Group payment details by payment_id
      paymentDetails.forEach(pd => {
        if (!orderPaymentMap[pd.payment_id]) {
          orderPaymentMap[pd.payment_id] = [];
        }
        orderPaymentMap[pd.payment_id].push(pd);
      });

      // Debug: Log order payment map
      console.log('🔍 Order Payment Map:', orderPaymentMap);

      orders.forEach(order => {
        // Count transactions (unique orders)
        if (!processedOrderIds.has(order.id)) {
          processedOrderIds.add(order.id);
          statistics.count_transaction++;

          // ✅ Total Item = jumlah BARANG, bukan angka isian kasir.
          //    Satu sepatu walau dikerjakan 2 layanan tetap 1 item, tapi item_id
          //    yang sama di order berbeda dihitung terpisah → pasangan
          //    (order_id, item_id). Dikumpulkan di luar guard order unik;
          //    ⚠️ JANGAN pakai o.quantity: itu angka manual yang sering tidak akurat.

          // Sum revenue
          if (order.final_price) {
            statistics.sum_revenue += parseFloat(order.final_price);
          }

          // Payment method berdasarkan payment_details
          const paymentDetailsForOrder = orderPaymentMap[order.payment_id] || [];
          console.log(`🔍 Processing order ${order.id} with payment_id ${order.payment_id}, payment_details:`, paymentDetailsForOrder);

          // Payment status dan breakdown
          if (order.payment_status) {
            if (statistics.payment_status.hasOwnProperty(order.payment_status)) {
              statistics.payment_status[order.payment_status]++;
            }

            // Hitung breakdown payment berdasarkan status
            const finalPrice = parseFloat(order.final_price || 0);
            const totalPaid = paymentDetailsForOrder.reduce((total, pd) => total + parseFloat(pd.amount || 0), 0);

            if (order.payment_status === 'paid') {
              // Order lunas
              statistics.payment_details.total_order_paid += finalPrice;
            } else if (order.payment_status === 'unpaid') {
              // Order belum bayar sama sekali
              statistics.payment_details.total_order_unpaid += finalPrice;
            } else if (order.payment_status === 'dp') {
              // Order DP - hitung DP yang sudah masuk dan sisa DP
              statistics.payment_details.total_dp_paid += totalPaid;
              statistics.payment_details.total_dp_remaining += (finalPrice - totalPaid);
            }
          }

          paymentDetailsForOrder.forEach(pd => {
            if (pd.payment_method_code) {
              console.log(`🔍 Processing payment detail: ${pd.payment_method_code} - ${pd.amount}`);

              // Payment method - cari atau buat baru
              let existingPaymentMethod = statistics.payment_method.find(m => m.code === pd.payment_method_code);
              if (existingPaymentMethod) {
                existingPaymentMethod.count++;
                console.log(`🔍 Updated payment_method[${pd.payment_method_code}]: ${existingPaymentMethod.count}`);
              } else {
                statistics.payment_method.push({
                  code: pd.payment_method_code,
                  name: pd.payment_method_name || pd.payment_method_code,
                  count: 1
                });
                console.log(`🔍 Added new payment_method[${pd.payment_method_code}]: name=${pd.payment_method_name || pd.payment_method_code}`);
                console.log(`🔍 Added new payment_method[${pd.payment_method_code}]: 1`);
              }

              // Payment details methods - cari atau buat baru
              let existingMethod = statistics.payment_details.methods.find(m => m.code === pd.payment_method_code);
              if (existingMethod) {
                existingMethod.count++;
                existingMethod.amount += parseFloat(pd.amount || 0);
                console.log(`🔍 Updated payment_details.methods[${pd.payment_method_code}]: count=${existingMethod.count}, amount=${existingMethod.amount}`);
              } else {
                statistics.payment_details.methods.push({
                  code: pd.payment_method_code,
                  name: pd.payment_method_name || pd.payment_method_code,
                  count: 1,
                  amount: parseFloat(pd.amount || 0)
                });
                console.log(`🔍 Added new payment_details.methods[${pd.payment_method_code}]: name=${pd.payment_method_name || pd.payment_method_code}, count=1, amount=${pd.amount}`);
              }
            }

            // Total paid sudah dihitung di payment status breakdown
          });
        }

        // Count services (order details) - dari orders query yang sudah difilter
        if (order.order_detail_status) {
          statistics.count_services++;
          // Telaga: tiket/layanan (is_product = 0) dihitung sebagai pengunjung,
          // produk resto/merchandise dihitung terpisah.
          if (Number(order.is_product) === 1) {
            statistics.count_products++;
          } else {
            statistics.count_visitors++;
          }
        }

        // ✅ Kumpulkan pasangan unik (order_id, item_id) — di luar guard order unik
        if (order.item_id) {
          processedItemKeys.add(`${order.id}::${order.item_id}`);
        }
      });

      // Calculate total_unpaid sudah dihitung di payment status breakdown

      // Hitung service_status dari semua order_details yang sudah diambil
      allOrderDetails.forEach(detail => {
        if (detail.status && statistics.service_status.hasOwnProperty(detail.status)) {
          statistics.service_status[detail.status]++;
        }
      });

      // ✅ Total Item = jumlah pasangan unik (order_id, item_id)
      statistics.quantity_items = processedItemKeys.size;

      // ✅ Turunan untuk tampilan ringkasan
      statistics.avg_transaction = statistics.count_transaction > 0
        ? Math.round(statistics.sum_revenue / statistics.count_transaction)
        : 0;
      statistics.payment_details.total_paid =
        statistics.payment_details.total_order_paid + statistics.payment_details.total_dp_paid;
      statistics.payment_details.total_outstanding =
        statistics.payment_details.total_order_unpaid + statistics.payment_details.total_dp_remaining;

      statistics.payment_details.methods.sort((a, b) => b.amount - a.amount);

      statistics.service_breakdown = (serviceBreakdown || []).map(row => ({
        treatment_id: row.treatment_id,
        name: row.treatment_name || 'Layanan',
        qty: Number(row.qty) || 0,
        amount: Number(row.amount) || 0
      }));

      // Debug: Log final statistics
      console.log('🔍 Final statistics before return:', statistics);

      return statistics;
    } catch (error) {
      console.error('❌ getStatisticsNewRaw error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Export orders data untuk CSV
   * @param {Object} params - { filter, user_tenant_id, user_branch_id, user_role }
   * @returns {String} - CSV content dengan BOM
   */
  static async exportOrdersData({ filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Extend branch ID if checking specific branch (handle mitra visibility)
      let targetBranchIds = user_branch_id;
      if (user_branch_id && !Array.isArray(user_branch_id)) {
        targetBranchIds = await this._getExtendedBranchIds(user_branch_id);
      }

      const { whereClause, params } = this.buildWhereClause(filter, user_tenant_id, targetBranchIds, user_role);

      // Query utama: ambil order_details dengan semua join yang diperlukan
      // ORDER BY od.createdAt untuk urut dari terlama ke terbaru
      const orderDetailsQuery = `
        SELECT 
          o.id as order_id,
          o.entry_date,
          od.id as order_detail_id,
          od.item_id,
          od.status as item_status,
          od.due_date,
          od.final_price,
          c.name as customer_name,
          c.phone as customer_phone,
          p.code as payment_code,
          p.status as payment_status,
          p.final_price as total_payment,
          p.paid_amount,
          p.remaining_amount,
          p.id as payment_id,
          t.name as treatment_name,
          t.requires_tracking,
          i.name as item_name,
          i.type as item_type,
          i.brand as item_brand
        FROM order_details od
        INNER JOIN orders o ON od.order_id = o.id
        INNER JOIN customers c ON o.customer_id = c.id
        INNER JOIN treatment t ON od.treatment_id = t.id AND t.deletedAt IS NULL
        LEFT JOIN items i ON od.item_id = i.id
        LEFT JOIN payments p ON o.payment_id = p.id
        WHERE ${whereClause}
        AND od.deletedAt IS NULL
        ORDER BY od.createdAt ASC, od.id ASC
      `;

      const allOrderDetails = await sequelize.query(orderDetailsQuery, {
        replacements: params,
        type: sequelize.QueryTypes.SELECT
      });

      if (allOrderDetails.length === 0) {
        return '\uFEFFOrder ID,Customer,Customer HP,Tanggal Masuk,No Nota,Qty Item,Qty Layanan,Qty Produk/Lainnya,Total Harga,Total Dibayar,Sisa Bayar,Status Bayar,Metode Bayar,Treatment,Item (tipe brand),Status,Estimasi Selesai\n';
      }

      // Ambil payment_details untuk semua payments (filter NULL)
      const paymentIds = [...new Set(allOrderDetails.map(od => od.payment_id).filter(Boolean))];

      let paymentDetails = [];
      if (paymentIds.length > 0) {
        const paymentDetailsQuery = `
          SELECT 
            pd.payment_id,
            pd.createdAt as payment_created_at,
            pm.code as payment_method_code
          FROM payment_details pd
          INNER JOIN payment_methods pm ON pd.payment_method_id = pm.id
          WHERE pd.payment_id IN (${paymentIds.map(() => '?').join(',')})
          AND pd.deletedAt IS NULL
          ORDER BY pd.payment_id, pd.id
        `;

        paymentDetails = await sequelize.query(paymentDetailsQuery, {
          replacements: paymentIds,
          type: sequelize.QueryTypes.SELECT
        });
      }

      // Group payment methods by payment_id dengan tanggal
      const paymentMethodsMap = {};
      paymentDetails.forEach(pd => {
        if (!paymentMethodsMap[pd.payment_id]) {
          paymentMethodsMap[pd.payment_id] = [];
        }
        paymentMethodsMap[pd.payment_id].push({
          code: pd.payment_method_code,
          createdAt: pd.payment_created_at
        });
      });

      // Helper function untuk format tanggal (defined di sini untuk digunakan di dalam loop)
      const formatTanggal = (tanggal) => {
        if (!tanggal) return '';
        try {
          const date = new Date(tanggal);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (e) {
          return tanggal;
        }
      };

      // Group order_details by order_id
      const ordersMap = {};
      allOrderDetails.forEach(od => {
        if (!ordersMap[od.order_id]) {
          ordersMap[od.order_id] = {
            order_id: od.order_id,
            customer: od.customer_name,
            customer_hp: od.customer_phone,
            tanggal_masuk: od.entry_date,
            no_nota: od.payment_code || '',
            total_harga: od.total_payment || 0,
            total_dibayar: od.paid_amount || 0,
            sisa_bayar: od.remaining_amount || 0,
            status_bayar: od.payment_status || '',
            payment_id: od.payment_id,
            order_details: []
          };
        }
        ordersMap[od.order_id].order_details.push(od);
      });

      // Transform ke CSV rows - 1 order = 1 row
      const csvRows = [];
      Object.values(ordersMap).forEach((order, index) => {
        // Get payment details untuk order ini
        const paymentMethods = order.payment_id ? paymentMethodsMap[order.payment_id] || [] : [];
        const paymentMethodStr = paymentMethods.length > 0
          ? paymentMethods.map(item => {
            const codeWords = item.code.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            const formattedCode = codeWords.join(' ');
            const paymentDate = item.createdAt ? formatTanggal(item.createdAt) : '';
            return paymentDate ? `${formattedCode} (${paymentDate})` : formattedCode;
          }).join('\n')
          : '';

        // Format status bayar
        const statusBayarMap = {
          'paid': 'Lunas',
          'unpaid': 'Belum Bayar',
          'dp': 'Bayar Sebagian',
          'cancelled': 'Dibatalkan'
        };
        const statusBayar = order.status_bayar ? (statusBayarMap[order.status_bayar.toLowerCase()] || order.status_bayar) : '';

        // Format status order detail
        const statusOrderDetailMap = {
          'not_yet': 'Menunggu',
          'antrian': 'Antrian Kerja',
          'on_progress': 'Sedang Dikerjakan',
          'pengeringan': 'Sedang Dikeringkan',
          'siap': 'Siap Diambil',
          'siap_diambil': 'Siap Diambil',
          'siap_dikirim': 'Siap Dikirim',
          'done': 'Selesai',
          'selesai': 'Selesai',
          'cancelled': 'Dibatalkan',
          'not_ready': 'Tidak Lolos QC'
        };

        // Group treatment, item, status, estimasi_selesai dengan \n
        const treatmentList = [];
        const itemList = [];
        const statusList = [];
        const estimasiList = [];

        // Hitung QTY: Distinct item_id, count layanan, count produk/lainnya
        const distinctItemIds = new Set();
        let qtyLayanan = 0;
        let qtyProduk = 0;

        order.order_details.forEach(odDetail => {
          treatmentList.push(odDetail.treatment_name || '-');

          // Format item: brand + type (contoh: "Nike Air Force 1")
          const itemStr = odDetail.item_brand && odDetail.item_type
            ? `${odDetail.item_brand} ${odDetail.item_type}`
            : (odDetail.item_name || '-');
          itemList.push(itemStr);

          const statusDetail = odDetail.item_status ? (statusOrderDetailMap[odDetail.item_status.toLowerCase()] || odDetail.item_status) : '-';
          statusList.push(statusDetail);

          // Format due_date
          estimasiList.push(odDetail.due_date ? formatTanggal(odDetail.due_date) : '-');

          // Hitung distinct item_id (hanya yang tidak null)
          if (odDetail.item_id) {
            distinctItemIds.add(odDetail.item_id);
          }

          // Hitung QTY LAYANAN (requires_tracking = TRUE/1)
          if (odDetail.requires_tracking === true || odDetail.requires_tracking === 1) {
            qtyLayanan++;
          }

          // Hitung QTY PRODUK/LAINNYA (requires_tracking = FALSE/0)
          if (odDetail.requires_tracking === false || odDetail.requires_tracking === 0) {
            qtyProduk++;
          }
        });

        const qtyItem = distinctItemIds.size;

        csvRows.push({
          no: index + 1,
          order_id: order.order_id,
          customer: order.customer || '-',
          customer_hp: order.customer_hp || '-',
          tanggal_masuk: order.tanggal_masuk || '-',
          no_nota: order.no_nota || '-',
          qty_item: qtyItem,
          qty_layanan: qtyLayanan,
          qty_produk: qtyProduk,
          total_harga: order.total_harga || 0,
          total_dibayar: order.total_dibayar || 0,
          sisa_bayar: order.sisa_bayar || 0,
          status_bayar: statusBayar || '-',
          metode_bayar: paymentMethodStr || '-',
          treatment: treatmentList.join('\n'),
          item: itemList.join('\n'),
          status: statusList.join('\n'),
          estimasi_selesai: estimasiList.join('\n')
        });
      });

      // Hitung total untuk semua kolom angka
      const totals = {
        total_orders: csvRows.length,
        total_qty_item: 0,
        total_qty_layanan: 0,
        total_qty_produk: 0,
        total_harga: 0,
        total_dibayar: 0,
        total_sisa_bayar: 0
      };

      csvRows.forEach(row => {
        totals.total_qty_item += row.qty_item || 0;
        totals.total_qty_layanan += row.qty_layanan || 0;
        totals.total_qty_produk += row.qty_produk || 0;
        totals.total_harga += parseFloat(row.total_harga || 0);
        totals.total_dibayar += parseFloat(row.total_dibayar || 0);
        totals.total_sisa_bayar += parseFloat(row.sisa_bayar || 0);
      });

      // Tambahkan row total
      csvRows.push({
        no: 'TOTAL',
        order_id: totals.total_orders,
        customer: '',
        customer_hp: '',
        tanggal_masuk: '',
        no_nota: '',
        qty_item: totals.total_qty_item,
        qty_layanan: totals.total_qty_layanan,
        qty_produk: totals.total_qty_produk,
        total_harga: totals.total_harga,
        total_dibayar: totals.total_dibayar,
        sisa_bayar: totals.total_sisa_bayar,
        status_bayar: '',
        metode_bayar: '',
        treatment: '',
        item: '',
        status: '',
        estimasi_selesai: ''
      });

      // Helper function untuk format harga
      const formatHarga = (harga) => {
        if (!harga) return '0';
        const numHarga = typeof harga === 'string' ? parseFloat(harga) : harga;
        if (isNaN(numHarga)) return '0';
        return numHarga.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      };

      // Generate CSV content
      const csvHeader = 'Order ID,Customer,Customer HP,Tanggal Masuk,No Nota,Qty Item,Qty Layanan,Qty Produk/Lainnya,Total Harga,Total Dibayar,Sisa Bayar,Status Bayar,Metode Bayar,Treatment,Item (tipe brand),Status,Estimasi Selesai';
      const csvDataRows = csvRows.map(row => [
        row.no === 'TOTAL' ? `TOTAL (${row.order_id})` : row.order_id, // Order ID untuk total = "TOTAL (count total pesanan)"
        `"${row.customer || ''}"`,
        row.customer_hp,
        formatTanggal(row.tanggal_masuk),
        row.no_nota,
        row.qty_item || 0,
        row.qty_layanan || 0,
        row.qty_produk || 0,
        formatHarga(row.total_harga),
        formatHarga(row.total_dibayar),
        formatHarga(row.sisa_bayar),
        row.status_bayar,
        `"${row.metode_bayar || '-'}"`,
        `"${row.treatment || '-'}"`,
        `"${row.item || '-'}"`,
        `"${row.status || '-'}"`,
        `"${row.estimasi_selesai || '-'}"`
      ].join(','));

      const csvContent = [csvHeader, ...csvDataRows].join('\n');

      // Add BOM for UTF-8 encoding
      return '\uFEFF' + csvContent;
    } catch (error) {
      console.error('❌ exportOrdersData error:', error);
      throw new Error(error.message);
    }
  }
}

module.exports = OrderRepositoryNew;
