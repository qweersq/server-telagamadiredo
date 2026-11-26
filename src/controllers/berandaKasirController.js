const { Order, OrderDetail, Payment, Customer, Branch, Tenant, Treatment, Item, ShoePhoto, Op } = require('../models');
const { getAccessibleBranchIds } = require('../helpers/branchAccessHelper');

class BerandaKasirController {
  // Get counts for tabs (Antrian, Progress, Lainnya)
  static async getCounts(req, res) {
    try {
      const { startDate, endDate, tenant_id, branch_id } = req.query;

      // Validate required parameters
      if (!startDate || !endDate || !tenant_id) {
        return res.status(400).json({
          success: false,
          message: 'startDate, endDate, dan tenant_id harus diisi'
        });
      }

      // Build date filter
      let dateFilter = {};
      if (startDate === endDate) {
        dateFilter.entry_date = startDate;
      } else {
        dateFilter.entry_date = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      }

      // Build base where clause
      const whereClause = {
        ...dateFilter,
        tenant_id: parseInt(tenant_id),
        deletedAt: null
      };

      // Add branch filter with accessible branch IDs for droppoint support
      if (branch_id) {
        const accessibleBranchIds = await getAccessibleBranchIds(parseInt(branch_id), parseInt(tenant_id));
        whereClause.branch_id = accessibleBranchIds.length > 1
          ? { [Op.in]: accessibleBranchIds }
          : parseInt(branch_id);
      }

      console.log('🔍 BerandaKasir - Count Query Where:', whereClause);

      // Get all orders with order_details and payment for counting
      const orders = await Order.findAll({
        where: whereClause,
        include: [
          {
            model: OrderDetail,
            as: 'order_details',
            where: { deletedAt: null },
            required: true,
            attributes: ['status', 'delivery_status', 'pickup_method']
          },
          {
            model: Payment,
            as: 'payment',
            where: { deletedAt: null },
            required: false,
            attributes: ['status', 'paid_amount', 'remaining_amount']
          }
        ],
        attributes: ['id']
      });

      console.log('📊 BerandaKasir - Found orders:', orders.length);

      // Count by status
      let not_yet = 0;
      let antrian = 0;
      let progress = 0;
      let pengeringan = 0;
      let lainnya = 0;

      // Detailed counts for modal
      let siap_diambil = 0; // Gabungan siap + siap_diambil
      let siap_dikirim = 0;
      let done = 0;
      let cancelled = 0;
      let not_ready = 0;

      // Payment status counts
      let belum_bayar = 0;
      let dp_dibayar = 0;
      let lunas = 0;
      let siap_belum_lunas = 0;

      // Service type counts
      let penjemputan = 0;
      let pengantaran = 0;

      orders.forEach(order => {
        // Count order status
        if (order.order_details && Array.isArray(order.order_details)) {
          order.order_details.forEach(detail => {
            const status = detail.status;
            if (status === 'not_yet') {
              not_yet++;
            } else if (status === 'antrian') {
              antrian++;
            } else if (status === 'on_progress') {
              progress++;
            } else if (status === 'pengeringan') {
              pengeringan++;
            } else if (['siap', 'siap_diambil'].includes(status)) {
              siap_diambil++;
              lainnya++;
            } else if (status === 'siap_dikirim') {
              siap_dikirim++;
              lainnya++;
            } else if (['done', 'selesai'].includes(status)) {
              done++;
              lainnya++;
            } else if (status === 'cancelled') {
              cancelled++;
              lainnya++;
            } else if (status === 'not_ready') {
              not_ready++;
              lainnya++;
            }

            // Count service types
            if (detail.pickup_method === 'pickup' && status === 'not_yet') {
              penjemputan++;
            } else if (detail.pickup_method === 'delivery') {
              pengantaran++;
            }
          });
        }

        // Count payment status
        if (order.payment) {
          const { status, paid_amount, remaining_amount } = order.payment;

          // Convert to number untuk comparison yang benar
          const paidAmount = Number(paid_amount) || 0;
          const remainingAmount = Number(remaining_amount) || 0;

          if ((status === 'belum_bayar' || status === 'unpaid') && paidAmount === 0) {
            belum_bayar++;
          } else if (status === 'dp_dibayar' || status === 'dp' || (paidAmount > 0 && remainingAmount > 0)) {
            dp_dibayar++;
          } else if (status === 'lunas' || status === 'paid' || remainingAmount === 0) {
            lunas++;
          }

          // Check for siap_belum_lunas
          const hasSiapStatus = order.order_details && order.order_details.some(detail =>
            ['siap', 'siap_diambil', 'siap_dikirim'].includes(detail.status)
          );
          if (hasSiapStatus && remainingAmount > 0) {
            siap_belum_lunas++;
          }
        }
      });

      console.log('📈 BerandaKasir - Counts:', {
        not_yet, antrian, progress, pengeringan, lainnya,
        siap_diambil, siap_dikirim, done, cancelled, not_ready,
        belum_bayar, dp_dibayar, lunas, siap_belum_lunas,
        penjemputan, pengantaran
      });

      res.json({
        success: true,
        data: {
          not_yet,
          antrian,
          progress,
          pengeringan,
          lainnya,
          // Detailed counts for modal
          siap_diambil, // Gabungan siap + siap_diambil
          siap_dikirim,
          done,
          cancelled,
          not_ready,
          // Payment status counts
          belum_bayar,
          dp_dibayar,
          lunas,
          siap_belum_lunas,
          // Service type counts
          penjemputan,
          pengantaran
        }
      });

    } catch (error) {
      console.error('❌ BerandaKasir - Error getting counts:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting counts',
        error: error.message
      });
    }
  }

  // Get orders list based on filter
  static async getOrders(req, res) {
    try {
      const {
        filter,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        branch_id
      } = req.query;

      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!filter || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'filter, startDate, dan endDate harus diisi'
        });
      }

      // Build date filter
      let dateFilter = {};
      if (startDate === endDate) {
        dateFilter.entry_date = startDate;
      } else {
        dateFilter.entry_date = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      }

      // Build base where clause
      const whereClause = {
        ...dateFilter,
        tenant_id: tenant_id,
        deletedAt: null
      };

      // Add branch filter with accessible branch IDs for droppoint support
      if (branch_id) {
        const accessibleBranchIds = await getAccessibleBranchIds(parseInt(branch_id), tenant_id);
        whereClause.branch_id = accessibleBranchIds.length > 1
          ? { [Op.in]: accessibleBranchIds }
          : parseInt(branch_id);
      }

      // Build order_details filter based on filter type
      let orderDetailsWhere = { deletedAt: null };

      switch (filter) {
        case 'not_yet':
          orderDetailsWhere.status = 'not_yet';
          break;
        case 'antrian':
          orderDetailsWhere.status = 'antrian';
          break;
        case 'progress':
          orderDetailsWhere.status = 'on_progress';
          break;
        case 'pengeringan':
          orderDetailsWhere.status = 'pengeringan';
          break;
        case 'siap_diambil':
          orderDetailsWhere.status = { [Op.in]: ['siap', 'siap_diambil'] };
          break;
        case 'siap_dikirim':
          orderDetailsWhere.status = 'siap_dikirim';
          break;
        case 'done':
          orderDetailsWhere.status = { [Op.in]: ['done', 'selesai'] };
          break;
        case 'cancelled':
          orderDetailsWhere.status = 'cancelled';
          break;
        case 'not_ready':
          orderDetailsWhere.status = 'not_ready';
          break;
        case 'penjemputan':
          orderDetailsWhere.pickup_method = 'pickup';
          orderDetailsWhere.status = 'not_yet';
          break;
        case 'pengantaran':
          orderDetailsWhere.pickup_method = 'delivery';
          break;
        case 'siap_belum_lunas':
          orderDetailsWhere.status = { [Op.in]: ['siap', 'siap_diambil', 'siap_dikirim'] };
          break;
        default:
          // For payment status filters, we need to check payment table
          break;
      }

      // Calculate offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let orders;
      let totalCount;

      // Handle payment status filters differently
      if (['belum_bayar', 'dp_dibayar', 'lunas', 'siap_belum_lunas'].includes(filter)) {
        // Build payment WHERE clause for SQL-level filtering (not JS post-filter)
        let paymentWhere = { deletedAt: null };

        switch (filter) {
          case 'belum_bayar':
            paymentWhere.status = { [Op.in]: ['belum_bayar', 'unpaid'] };
            paymentWhere[Op.or] = [
              { paid_amount: null },
              { paid_amount: 0 }
            ];
            break;
          case 'dp_dibayar':
            paymentWhere[Op.or] = [
              { status: { [Op.in]: ['dp_dibayar', 'dp'] } },
              { paid_amount: { [Op.gt]: 0 }, remaining_amount: { [Op.gt]: 0 } }
            ];
            break;
          case 'lunas':
            paymentWhere[Op.or] = [
              { status: { [Op.in]: ['lunas', 'paid'] } },
              { remaining_amount: 0 }
            ];
            break;
          case 'siap_belum_lunas':
            paymentWhere.remaining_amount = { [Op.gt]: 0 };
            break;
        }

        // Query orders with payment information
        const { count, rows } = await Order.findAndCountAll({
          where: whereClause,
          distinct: true,
          col: 'id',
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'name', 'phone']
            },
            {
              model: Payment,
              as: 'payment',
              where: paymentWhere,
              required: true,
              attributes: ['id', 'status', 'final_price', 'paid_amount', 'remaining_amount']
            },
            {
              model: OrderDetail,
              as: 'order_details',
              where: orderDetailsWhere,
              required: true,
              attributes: ['id', 'item_id', 'treatment_id', 'status', 'delivery_status', 'pickup_method', 'final_price', 'custom_price', 'custom_price_reason', 'due_date'],
              include: [
                {
                  model: Treatment,
                  as: 'treatment',
                  attributes: ['id', 'name', 'type_service', 'type_item']
                },
                {
                  model: Item,
                  as: 'item',
                  required: false,
                  where: { deletedAt: null },
                  attributes: ['id', 'name', 'brand', 'type', 'color']
                },
                {
                  model: ShoePhoto,
                  required: false,
                  attributes: ['id', 'url_photo']
                }
              ]
            },
            {
              model: Branch,
              as: 'branch',
              attributes: ['id', 'name', 'branch_type'],
              required: false
            }
          ],
          attributes: ['id', 'entry_date', 'createdAt', 'branch_id'],
          limit: parseInt(limit),
          offset: offset,
          order: [['createdAt', 'DESC']]
        });

        orders = rows;
        totalCount = count;

      } else {
        // Query orders with order_details filter
        const { count, rows } = await Order.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'name', 'phone']
            },
            {
              model: Payment,
              as: 'payment',
              where: { deletedAt: null },
              required: false,
              attributes: ['id', 'status', 'final_price', 'paid_amount', 'remaining_amount']
            },
            {
              model: OrderDetail,
              as: 'order_details',
              where: orderDetailsWhere,
              required: true,
              attributes: ['id', 'item_id', 'treatment_id', 'status', 'delivery_status', 'pickup_method', 'final_price', 'custom_price', 'custom_price_reason', 'due_date'],
              include: [
                {
                  model: Treatment,
                  as: 'treatment',
                  attributes: ['id', 'name', 'type_service', 'type_item']
                },
                {
                  model: Item,
                  as: 'item',
                  required: false,
                  where: { deletedAt: null },
                  attributes: ['id', 'name', 'brand', 'type', 'color']
                },
                {
                  model: ShoePhoto,
                  required: false,
                  attributes: ['id', 'url_photo']
                }
              ]
            },
            {
              model: Branch,
              as: 'branch',
              attributes: ['id', 'name', 'branch_type'],
              required: false
            }
          ],
          attributes: ['id', 'entry_date', 'createdAt', 'branch_id'],
          limit: parseInt(limit),
          offset: offset,
          order: [['createdAt', 'DESC']]
        });

        orders = rows;
        totalCount = count;
      }

      console.log('📋 BerandaKasir - Found orders:', orders.length);
      console.log('📋 BerandaKasir - Total count:', totalCount);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        data: {
          orders: orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('❌ BerandaKasir - Error getting orders:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting orders',
        error: error.message
      });
    }
  }
}

module.exports = BerandaKasirController;
