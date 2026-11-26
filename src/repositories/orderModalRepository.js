const { Customer, Discount, Item, Order, OrderDetail, OrderDetailStatusLog, Payment, PaymentDetail, ShoePhoto, Treatment, User, sequelize, Op, FinanceTransaction, FinanceAccount } = require('../models');

class OrderModalRepository {
  /**
   * Get orders by payment status for modal display
   */
  static async getPaymentStatusOrders({ status, startDate, endDate, page, pageSize, search, user_tenant_id, user_branch_id, user_role }) {
    try {
      console.log('🔍 OrderModalRepository.getPaymentStatusOrders - Starting:', {
        status, startDate, endDate, page, pageSize, search, user_tenant_id, user_branch_id, user_role
      });

      // Build where clause for Order
      let orderWhere = {};
      let paymentWhere = {};
      let include = [];

      // Add data isolation based on user role
      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        orderWhere.tenant_id = user_tenant_id;
        if (user_branch_id) {
          orderWhere.branch_id = user_branch_id;
        }
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya
        orderWhere.tenant_id = user_tenant_id;
        orderWhere.branch_id = user_branch_id;
      }

      // Add date filter
      if (startDate && endDate) {
        if (startDate === endDate) {
          orderWhere.entry_date = {
            [Op.gte]: startDate + ' 00:00:00',
            [Op.lte]: startDate + ' 23:59:59'
          };
        } else {
          orderWhere.entry_date = {
            [Op.gte]: startDate + ' 00:00:00',
            [Op.lte]: endDate + ' 23:59:59'
          };
        }
      }

      // Add search filter
      if (search && search.trim()) {
        orderWhere[Op.or] = [
          { '$customer.name$': { [Op.like]: `%${search.trim()}%` } },
          { '$customer.phone$': { [Op.like]: `%${search.trim()}%` } },
          { id: { [Op.like]: `%${search.trim()}%` } }
        ];
      }

      // Add payment status filter
      if (status === 'paid') {
        // Orders where remaining_amount = 0 AND paid_amount > 0 (fully paid)
        paymentWhere = {
          [Op.and]: [
            { remaining_amount: 0 },
            { paid_amount: { [Op.gt]: 0 } }
          ]
        };
      } else if (status === 'unpaid') {
        // Orders where paid_amount = 0 (not paid at all)
        paymentWhere = {
          paid_amount: 0
        };
      } else if (status === 'dp') {
        // Orders where 0 < paid_amount AND remaining_amount > 0 (partial payment)
        paymentWhere = {
          [Op.and]: [
            { paid_amount: { [Op.gt]: 0 } },
            { remaining_amount: { [Op.gt]: 0 } }
          ]
        };
      }

      console.log('🔍 Payment filtering conditions:', {
        status,
        paymentWhere,
        hasPaymentWhere: Object.keys(paymentWhere).length > 0
      });

      // Build include array - OPTIMIZED for Payment Status Modal
      include.push({
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'phone'], // Hanya field yang dibutuhkan untuk modal
        required: true
      });

      include.push({
        model: Payment,
        as: 'payment',
        attributes: ['id', 'final_price', 'paid_amount', 'remaining_amount'], // Include final_price untuk referensi
        required: true,
        where: paymentWhere,
        include: [] // Tidak perlu payment_details untuk modal
      });

      // Order details tidak dibutuhkan untuk payment status modal
      // include.push({ model: OrderDetail, ... });

      // Creator tidak dibutuhkan untuk modal
      // include.push({ model: User, as: 'creator', ... });

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const pageSizeInt = parseInt(pageSize, 10);

      // Get total count
      const totalCount = await Order.count({
        where: orderWhere,
        include,
        distinct: true
      });

      // Get orders
      const orders = await Order.findAll({
        where: orderWhere,
        include,
        limit: pageSizeInt,
        offset,
        order: [['id', 'DESC']],
        distinct: true
      });

      // Add account_id to payment_details
      orders.forEach(order => {
        if (order.payment && order.payment.payment_details) {
          order.payment.payment_details.forEach(pd => {
            if (pd.transaction) {
              pd.account_id = pd.transaction.account_id;
              pd.account_name = pd.transaction?.finance_account?.name;
              pd.account_type = pd.transaction?.finance_account?.payment_method?.name || 'General';
            }
          });
        }
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / pageSizeInt);
      const currentPage = page;
      const hasNextPage = currentPage < totalPages;
      const hasPrevPage = currentPage > 1;

      const pagination = {
        currentPage,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: pageSizeInt,
        hasNextPage,
        hasPrevPage
      };

      console.log('✅ OrderModalRepository.getPaymentStatusOrders - Completed:', {
        ordersCount: orders.length,
        totalCount,
        pagination
      });

      return { orders, pagination };
    } catch (error) {
      console.error('❌ OrderModalRepository.getPaymentStatusOrders - Error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get orders by service status for modal display
   */
  static async getServiceStatusOrders({ status, startDate, endDate, page, pageSize, search, user_tenant_id, user_branch_id, user_role }) {
    try {
      console.log('🔍 OrderModalRepository.getServiceStatusOrders - Starting:', {
        status, startDate, endDate, page, pageSize, search, user_tenant_id, user_branch_id, user_role
      });

      // Build where clause for Order
      let orderWhere = {};
      let orderDetailWhere = {};
      let include = [];

      // Add data isolation based on user role
      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        orderWhere.tenant_id = user_tenant_id;
        if (user_branch_id) {
          orderWhere.branch_id = user_branch_id;
        }
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya
        orderWhere.tenant_id = user_tenant_id;
        orderWhere.branch_id = user_branch_id;
      }

      // Add date filter
      if (startDate && endDate) {
        if (startDate === endDate) {
          orderWhere.entry_date = {
            [Op.gte]: startDate + ' 00:00:00',
            [Op.lte]: startDate + ' 23:59:59'
          };
        } else {
          orderWhere.entry_date = {
            [Op.gte]: startDate + ' 00:00:00',
            [Op.lte]: endDate + ' 23:59:59'
          };
        }
      }

      // Add search filter
      if (search && search.trim()) {
        orderWhere[Op.or] = [
          { '$customer.name$': { [Op.like]: `%${search.trim()}%` } },
          { '$customer.phone$': { [Op.like]: `%${search.trim()}%` } },
          { id: { [Op.like]: `%${search.trim()}%` } }
        ];
      }

      // Add service status filter
      orderDetailWhere.status = status;

      // Build include array - OPTIMIZED for Service Status Modal
      include.push({
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'phone'], // Hanya field yang dibutuhkan untuk modal
        required: true
      });

      include.push({
        model: Payment,
        as: 'payment',
        attributes: ['id'], // Hanya ID untuk reference
        required: true,
        include: [] // Tidak perlu payment_details untuk modal
      });

      include.push({
        model: OrderDetail,
        as: 'order_details',
        required: true,
        where: orderDetailWhere,
        attributes: ['id', 'status'], // Hanya field yang dibutuhkan
        include: [
          { 
            model: Treatment, 
            as: 'treatment',
            attributes: ['id', 'name'] // Hanya field yang dibutuhkan untuk getTreatmentNames
          }
        ]
      });

      // Creator tidak dibutuhkan untuk modal
      // include.push({ model: User, as: 'creator', ... });

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const pageSizeInt = parseInt(pageSize, 10);

      // Get total count
      const totalCount = await Order.count({
        where: orderWhere,
        include,
        distinct: true
      });

      // Get orders
      const orders = await Order.findAll({
        where: orderWhere,
        include,
        limit: pageSizeInt,
        offset,
        order: [['id', 'DESC']],
        distinct: true
      });

      // Add account_id to payment_details
      orders.forEach(order => {
        if (order.payment && order.payment.payment_details) {
          order.payment.payment_details.forEach(pd => {
            if (pd.transaction) {
              pd.account_id = pd.transaction.account_id;
              pd.account_name = pd.transaction?.finance_account?.name;
              pd.account_type = pd.transaction?.finance_account?.payment_method?.name || 'General';
            }
          });
        }
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / pageSizeInt);
      const currentPage = page;
      const hasNextPage = currentPage < totalPages;
      const hasPrevPage = currentPage > 1;

      const pagination = {
        currentPage,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: pageSizeInt,
        hasNextPage,
        hasPrevPage
      };

      console.log('✅ OrderModalRepository.getServiceStatusOrders - Completed:', {
        ordersCount: orders.length,
        totalCount,
        pagination
      });

      return { orders, pagination };
    } catch (error) {
      console.error('❌ OrderModalRepository.getServiceStatusOrders - Error:', error);
      throw new Error(error.message);
    }
  }
}

module.exports = OrderModalRepository;
