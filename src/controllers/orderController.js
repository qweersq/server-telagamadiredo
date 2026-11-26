const OrderService = require('../services/orderService');
const { ResponseHelper } = require('../helpers');
const moment = require('moment');
const { Payment, Order, PaymentDetail, OrderDetail, Op, ShoePhoto } = require('../models');

// Normalisasi tipe pesanan: offline/online (lama) + dine-in/takeaway (cafe Telaga)
const ORDER_TYPE_ALIASES = {
  'dine-in': 'dine-in',
  'dinein': 'dine-in',
  'dine_in': 'dine-in',
  'makan di tempat': 'dine-in',
  'takeaway': 'takeaway',
  'take-away': 'takeaway',
  'take_away': 'takeaway',
  'bawa pulang': 'takeaway',
  'mixed': 'mixed',
  'campur': 'mixed',
};

const normalizeOrderType = (value) => {
  if (!value) return 'offline';
  const key = String(value).trim().toLowerCase();
  return ORDER_TYPE_ALIASES[key] || key;
};

class OrderController {
  static async create(req, res) {
    try {
      // Konversi format tanggal dari ISO ke YYYY-MM-DD
      const entryDate = req.body.entry_date ? moment(req.body.entry_date).format('YYYY-MM-DD') : null;

      // Validasi format tanggal
      if (entryDate && !moment(entryDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).send(ResponseHelper.errorResponse('Format tanggal tidak valid. Gunakan format YYYY-MM-DD'));
      }

      const raw = {
        user_id: req.user.id,
        customer_id: req.body.customer_id || null,
        customer_name: req.body.customer_name ? String(req.body.customer_name).trim() : null,
        branch_id: req.body.branch_id,
        payment_id: req.body.payment_id,
        // collaboration_id: req.body.collaboration_id,
        entry_date: entryDate,
        quantity: req.body.quantity,
        order_type: normalizeOrderType(req.body.order_type),
        table_number: req.body.table_number ? String(req.body.table_number).trim() : null,
        shift_id: req.body.shift_id || null, // Gunakan dari request body, fallback ke null
        created_by: req.body.created_by || req.user.id, // Gunakan dari request body, fallback ke user yang sedang login
        tenant_id: req.user.tenant_id, // Always use JWT token for data isolation (security)
        referred_by_phone: req.body.referred_by_phone || null, // Nomor HP referrer yang diinput customer
        customer_note: req.body.customer_note ? String(req.body.customer_note).trim() : null // Catatan dari customer
      };

      let paymentData = req.body.payment;
      let orderProductDetails = req.body.order_details;

      const data = await OrderService.create(raw, paymentData, orderProductDetails);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getAllWithOption(req, res) {
    try {
      const data = await OrderService.getAllWithOption();

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getAll(req, res) {
    try {
      const raw = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 10,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        dueStartDate: req.query.dueStartDate,
        dueEndDate: req.query.dueEndDate,
        paymentStartDate: req.query.paymentStartDate,
        paymentEndDate: req.query.paymentEndDate,
      };

      // Add user context for data isolation
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;

      const data = await OrderService.getAll(raw, user_tenant_id, user_branch_id, user_role);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getAllNew(req, res) {
    try {
      // Ambil pagination
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 10;

      // Ambil filter dinamis dari query (bisa dari filter[field]=value atau filter sebagai JSON string)
      let filter = {};
      if (req.query.filter) {
        if (typeof req.query.filter === 'string') {
          // Support ?filter={...} (JSON string)
          try {
            filter = JSON.parse(req.query.filter);
          } catch (e) {
            // Support ?filter[field]=value
            filter = req.query.filter;
          }
        } else {
          filter = req.query.filter;
        }
      }

      // Support legacy: jika ada startDate, endDate, dst, masukkan ke filter
      const legacyFields = ['startDate', 'endDate', 'dueStartDate', 'dueEndDate', 'paymentStartDate', 'paymentEndDate', 'paymentDetailStartDate', 'paymentDetailEndDate', 'search'];
      legacyFields.forEach((f) => {
        if (req.query[f]) filter[f] = req.query[f];
      });

      const raw = {
        page,
        pageSize,
        filter,
      };

      // Add user context for data isolation (security: always use JWT token)
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : req.user.branch_id;
      const user_role = req.user.role;

      const data = await OrderService.getAllNew(raw, user_tenant_id, user_branch_id, user_role);
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Add user context for data isolation
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;
      
      const order = await OrderService.getById(id, user_tenant_id, user_branch_id, user_role);

      return res.status(200).send(ResponseHelper.successResponse(order));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (!orderId || isNaN(orderId)) {
        return res.status(400).send(ResponseHelper.errorResponse('ID Order tidak valid'));
      }

      const entryDate = req.body.entry_date ? moment(req.body.entry_date).format('YYYY-MM-DD') : null;

      const raw = {
        id: parseInt(req.params.id, 10),
        customer_id: req.body.customer_id,
        branch_id: req.body.branch_id,
        payment_id: req.body.payment_id,
        entry_date: entryDate,
        quantity: req.body.quantity,
        order_type: normalizeOrderType(req.body.order_type),
        table_number: req.body.table_number ? String(req.body.table_number).trim() : null,
        shift_id: req.body.shift_id || null,
        created_by: req.body.created_by || req.user.id,
        tenant_id: req.user.tenant_id, // Tambahkan tenant_id
        user_id: req.user.id, // Tambahkan user_id untuk context
        referred_by: req.body.referred_by || null, // Referral customer ID
        referred_by_phone: req.body.referred_by_phone || null, // Referral phone number
        customer_note: req.body.customer_note !== undefined
          ? (req.body.customer_note ? String(req.body.customer_note).trim() : null)
          : undefined // Catatan dari customer
      };

      let paymentData = req.body.payment;
      let orderProductDetails = req.body.order_details;

      const data = await OrderService.update(raw, paymentData, orderProductDetails);
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error("Error in controller:", error.message);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      
      console.log('🗑️ OrderController.delete - Deleting order:', {
        id,
        user_tenant_id,
        user_branch_id
      });

      const result = await OrderService.delete(id, user_tenant_id, user_branch_id);

      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      console.error('❌ OrderController.delete - Error:', error.message);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };




  static async assignTagNumbers(req, res) {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (!orderId || isNaN(orderId)) {
        return res.status(400).send(ResponseHelper.errorResponse('ID Order tidak valid'));
      }

      // tenant/branch diambil dari order itu sendiri (bukan dari user login),
      // supaya counter nomor antrian selalu milik cabang order tersebut.
      const data = await OrderService.assignTagNumbers(orderId);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error('❌ OrderController.assignTagNumbers - Error:', error.message);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };




  // MIGRASI PAYMENT
  static async migrateOldPayments(req, res) {
    try {
      // 1. Ambil semua order yang memiliki payment tapi belum ada payment_details
      const orders = await Order.findAll({
        where: {
          payment_id: {
            [Op.ne]: null
          }
        },
        include: [
          {
            model: Payment,
            as: 'payment',
            required: true,
            where: {
              status: {
                [Op.or]: ['dp', 'paid']
              }
            },
            include: [
              {
                model: PaymentDetail,
                as: 'payment_details',
                required: false
              }
            ]
          },
          {
            model: OrderDetail,
            as: 'order_details',
            required: true,
            include: [
              {
                model: ShoePhoto,
                required: true
              }
            ]
          }
        ]
      });


      const getAccountId = (method) => {
        switch (method?.toLowerCase()) {
          case 'bank_transfer':
            return 1;
          case 'cash':
            return 2;
          case 'qris':
            return 3;
          default:
            return 1;
        }
      };

      const methodPayment = (method) => {
        switch (method?.toLowerCase()) {
          case 'bank_transfer':
            return 'bank_transfer';
          case 'cash':
            return 'cash';
          case 'qris':
            return 'qris';
          default:
            return 'cash';
        }
      };

      // 2. Filter orders yang payment-nya belum memiliki payment_details
      const ordersToMigrate = orders.filter(order =>
        order.payment && (!order.payment.payment_details || order.payment.payment_details.length === 0)
      );


      // 3. Proses setiap order
      for (const order of ordersToMigrate) {
        const payment = order.payment;

        // Prepare payment details
        const paymentDetail = {
          payment_id: payment?.id || null,
          method: methodPayment(payment?.method) || 'cash',
          amount: Math.round(payment?.status === 'dp' ? payment?.money : payment?.final_price || 0),
          fee: 0,
          interest: 0,
          final_amount: Math.round(payment?.status === 'dp' ? payment?.money : payment?.final_price || 0),
          evidence_photo: payment?.evidence_photo || null,
          account_id: getAccountId(payment?.method) || 1
        };

        const updateDataPayment = {
          id: payment?.id || null,
          method: methodPayment(payment?.method) || 'cash',
          status: payment?.status || 'paid',
          money: Math.round(payment?.money || 0),
          final_price: Math.round(payment?.final_price || 0),
          evidence_photo: payment?.evidence_photo || null,
          subtotal: Math.round(payment?.final_price || 0),
          total_service: order.order_details.length || 0,
          paid_amount: Math.round(payment?.status === 'dp' ? payment?.money : payment?.final_price || 0),
          remaining_amount: Math.round(payment?.status === 'dp' ? payment?.final_price - payment?.money : 0),
          additional_cost: 0,
          due_date: null,
          notes: null,
          payment_details: [paymentDetail]
        };

        // Prepare data for update
        const raw = {
          id: order.id,
          customer_id: order.customer_id,
          branch_id: order.branch_id,
          payment_id: payment?.id || null,
          entry_date: order.entry_date,
          quantity: order.quantity,
          order_type: order.order_type,
          payment: updateDataPayment,
          order_details: order.order_details
        };

        // 4. Update menggunakan OrderService
        await OrderService.update(raw, updateDataPayment, order.order_details);

      }


      return res.status(200).send(ResponseHelper.successResponse({
        message: `Successfully migrated ${ordersToMigrate.length} orders with payments`,
        count: ordersToMigrate.length
      }));

    } catch (error) {
      console.error("Error in migration:", error.message);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  static async markNotified(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id);
      if (!order) return res.status(404).send(ResponseHelper.errorResponse('Order not found', 404));

      await order.update({
        is_notified: true,
        notified_at: new Date(),
      });

      return res.status(200).send(ResponseHelper.successResponse({
        id: order.id,
        is_notified: order.is_notified,
        notified_at: order.notified_at,
      }, 'Order marked as notified'));
    } catch (error) {
      console.error('❌ markNotified error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }


};

module.exports = OrderController;