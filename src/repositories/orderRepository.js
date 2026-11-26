const { Customer, CustomerMembership, Membership, Discount, Item, Order, OrderDetail, OrderDetailStatusLog, Payment, PaymentDetail, ShoePhoto, Treatment, User, Branch, sequelize, Op, FinanceTransaction, FinanceAccount, PaymentMethod } = require('../models');
const { getAccessibleBranchIds } = require('../helpers/branchAccessHelper');

class OrderRepository {
  static async create(data, transaction) {
    try {
      const result = await Order.create(data, { transaction });

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getAllWithOption(oneMonthAgo) {
    try {
      const data = await Order.findAll({
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: { exclude: ['password'] },
            required: true,
          },
          {
            model: Payment,
            as: 'payment',
            required: true,
          },
          {
            model: OrderDetail,
            as: 'order_details',
            include: [
              {
                model: Item,
                as: 'item',
              },
              {
                model: Treatment,
                as: 'treatment',
              },
              {
                model: User,
                as: 'employee',
              },
              {
                model: Discount,
                as: 'discount',
              },
              {
                model: ShoePhoto,
                as: 'shoes_photos',
              },
              {
                model: User,
                as: 'courier',
                attributes: ['id', 'name'],
              }
            ],
          },
        ],
        where: {
          createdAt: {
            [Op.gte]: oneMonthAgo
          }
        },
        order: [['id', 'DESC']],
      });

      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getTotalCount({ startDate, endDate, search, dueStartDate, dueEndDate, paymentStartDate, paymentEndDate, user_tenant_id, user_branch_id, user_role }) {
    try {
      let dateFilter = {
        entry_date: {
          [Op.between]: [startDate, endDate],
        },
      };

      // Add data isolation based on user role
      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        dateFilter.tenant_id = user_tenant_id;
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya
        dateFilter.tenant_id = user_tenant_id;
        dateFilter.branch_id = user_branch_id;
      }

      const searchFilter = search
        ? {
          [Op.or]: [
            { '$customer.name$': { [Op.substring]: search } },
            { '$customer.phone$': { [Op.substring]: search } },
            { '$payment.code$': { [Op.substring]: search } },
            { '$payment.status$': { [Op.substring]: search } },
          ],
        }
        : {};

      const whereFilter = { ...dateFilter, ...searchFilter };
      let totalCount = 0;

      if (startDate && endDate) {
        totalCount = await Order.count(
          {
            include: [
              {
                model: Customer,
                as: 'customer',
                attributes: { exclude: ['password'] },
                required: true,
              },
              {
                model: Payment,
                as: 'payment',
                required: true,
              },
            ],
            where: whereFilter,
          }
        );
      } else if (dueStartDate && dueEndDate) {
        const orderDetails = await OrderDetail.findAll({
          where: {
            due_date: {
              [Op.between]: [dueStartDate, dueEndDate],
            },
          },
        });
        totalCount = orderDetails.length;
      } else if (paymentStartDate && paymentEndDate) {

        const paymentDetails = await PaymentDetail.findAll({
          where: {
            createdAt: {
              [Op.between]: [paymentStartDate, paymentEndDate],
            },
          },
        });
        totalCount = paymentDetails.length;

      } else {
        totalCount = await Order.count();
      }

      return totalCount;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  static async getAllOrder({ offset, pageSizeInt, startDate, endDate, search, dueStartDate, dueEndDate, paymentStartDate, paymentEndDate, user_tenant_id, user_branch_id, user_role }) {
    try {
      let dateFilter = {
        entry_date: {
          [Op.between]: [startDate, endDate],
        },
      };

      // Add data isolation based on user role
      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        dateFilter.tenant_id = user_tenant_id;
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya
        dateFilter.tenant_id = user_tenant_id;
        dateFilter.branch_id = user_branch_id;
      }

      const searchFilter = search
        ? {
          [Op.or]: [
            { '$customer.name$': { [Op.substring]: search } },
            { '$customer.phone$': { [Op.substring]: search } },
            { '$payment.code$': { [Op.substring]: search } },
            { '$payment.status$': { [Op.substring]: search } },
          ],
        }
        : {};

      const whereFilter = { ...dateFilter, ...searchFilter };

      let orders = [];

      if (startDate && endDate) {
        orders = await Order.findAll({
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: { exclude: ['password'] },
              required: true,
            },
            {
              model: Payment,
              as: 'payment',
              required: true,
              include: [
                {
                  model: PaymentDetail,
                  as: 'payment_details',
                  include: [
                    {
                      model: FinanceTransaction,
                      as: 'transaction',
                      attributes: ['id', 'account_id'],
                      include: [
                        {
                          model: FinanceAccount,
                          as: 'finance_account',
                          attributes: ['id', 'name', 'payment_method_id'],
                          include: [
                            {
                              model: PaymentMethod,
                              as: 'payment_method',
                              attributes: ['id', 'name', 'code', 'type', 'icon']
                            }
                          ]
                        }
                      ]
                    },
                    {
                      model: PaymentMethod,
                      as: 'payment_method',
                      attributes: ['id', 'name', 'code', 'type', 'icon']
                    }
                  ]
                }
              ]
            },
            {
              model: OrderDetail,
              as: 'order_details',
              include: [
                {
                  model: Item,
                  as: 'item',
                },
                {
                  model: Treatment,
                  as: 'treatment',
                },
                {
                  model: User,
                  as: 'employee',
                },
                {
                  model: Discount,
                  as: 'discount',
                },
                {
                  model: ShoePhoto,
                  as: 'shoes_photos',
                },
                {
                  model: User,
                  as: 'courier',
                  attributes: ['id', 'name'],
                }
              ],
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email'],
              required: false
            },
          ],
          where: whereFilter,
          limit: pageSizeInt,
          offset: offset,
          order: [['id', 'DESC']],
        });
      } else if (dueStartDate && dueEndDate) {
        const orderDetails = await OrderDetail.findAll({
          where: {
            due_date: {
              [Op.between]: [dueStartDate, dueEndDate],
            },
          },
        });

        orders = await Order.findAll({
          where: [
            { id: orderDetails.map((orderDetail) => orderDetail.order_id) },
            searchFilter,
          ],
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: { exclude: ['password'] },
              required: true,
            },
            {
              model: Payment,
              as: 'payment',
              required: true,
              include: [
                {
                  model: PaymentDetail,
                  as: 'payment_details',
                  include: [
                    {
                      model: FinanceTransaction,
                      as: 'transaction',
                      attributes: ['id', 'account_id'],
                      include: [
                        {
                          model: FinanceAccount,
                          as: 'finance_account',
                          attributes: ['id', 'name', 'payment_method_id'],
                          include: [
                            {
                              model: PaymentMethod,
                              as: 'payment_method',
                              attributes: ['id', 'name', 'code', 'type', 'icon']
                            }
                          ]
                        }
                      ]
                    },
                    {
                      model: PaymentMethod,
                      as: 'payment_method',
                      attributes: ['id', 'name', 'code', 'type', 'icon']
                    }
                  ]
                }
              ]
            },
            {
              model: OrderDetail,
              as: 'order_details',
              required: true,
              include: [
                {
                  model: Item,
                  as: 'item',
                },
                {
                  model: Treatment,
                  as: 'treatment',
                },
                {
                  model: User,
                  as: 'employee',
                },
                {
                  model: Discount,
                  as: 'discount',
                },
                {
                  model: ShoePhoto,
                  as: 'shoes_photos',
                },
                {
                  model: User,
                  as: 'courier',
                  attributes: ['id', 'name'],
                }
              ],
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email'],
              required: false
            },
          ],
          limit: pageSizeInt,
          offset: offset,
          order: [['id', 'ASC']],
        });
      } else if (paymentStartDate && paymentEndDate) {
        // Sesuaikan format tanggal
        const startDateTime = new Date(paymentStartDate);
        startDateTime.setHours(0, 0, 0, 0);

        const endDateTime = new Date(paymentEndDate);
        endDateTime.setHours(23, 59, 59, 999);

        const paymentDetails = await PaymentDetail.findAll({
          where: {
            createdAt: {
              [Op.between]: [startDateTime, endDateTime],
            },
          },
        });

        // Debug log untuk melihat hasil payment details

        const paymentIds = [...new Set(paymentDetails.map(pd => pd.payment_id))];


        orders = await Order.findAll({
          where: {
            ...searchFilter,
            payment_id: {
              [Op.in]: paymentIds
            }
          },
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: { exclude: ['password'] },
              required: true,
            },
            {
              model: Payment,
              as: 'payment',
              required: true,
              include: [
                {
                  model: PaymentDetail,
                  as: 'payment_details',
                  include: [
                    {
                      model: FinanceTransaction,
                      as: 'transaction',
                      attributes: ['id', 'account_id'],
                      include: [
                        {
                          model: FinanceAccount,
                          as: 'finance_account',
                          attributes: ['id', 'name', 'payment_method_id'],
                          include: [
                            {
                              model: PaymentMethod,
                              as: 'payment_method',
                              attributes: ['id', 'name', 'code', 'type', 'icon']
                            }
                          ]
                        }
                      ]
                    },
                    {
                      model: PaymentMethod,
                      as: 'payment_method',
                      attributes: ['id', 'name', 'code', 'type', 'icon']
                    }
                  ]
                }
              ]
            },
            {
              model: OrderDetail,
              as: 'order_details',
              include: [
                {
                  model: Item,
                  as: 'item',
                },
                {
                  model: Treatment,
                  as: 'treatment',
                },
                {
                  model: User,
                  as: 'employee',
                },
                {
                  model: Discount,
                  as: 'discount',
                },
                {
                  model: ShoePhoto,
                  as: 'shoes_photos',
                },
                {
                  model: User,
                  as: 'courier',
                  attributes: ['id', 'name'],
                }
              ],
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email'],
              required: false
            },
          ],
          limit: pageSizeInt,
          offset: offset,
          order: [['entry_date', 'DESC']],
        });

      }

      // tambahkan account_id, account_name, account_type, dan payment_method data ke payment_details
      orders.forEach(order => {
        order.payment.payment_details.forEach(paymentDetail => {
          paymentDetail.account_id = paymentDetail.transaction?.account_id;
          paymentDetail.account_name = paymentDetail.transaction?.finance_account?.name;
          paymentDetail.account_type = paymentDetail.transaction?.finance_account?.payment_method?.name || 'General';
          // Tambahkan payment method data
          paymentDetail.payment_method_name = paymentDetail.payment_method?.name;
          paymentDetail.payment_method_code = paymentDetail.payment_method?.code;
          paymentDetail.payment_method_type = paymentDetail.payment_method?.type;
          paymentDetail.payment_method_icon = paymentDetail.payment_method?.icon;
        });
      });

      return orders;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getAllOrderNew({ offset, pageSizeInt, filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Default where untuk Order
      let orderWhere = {};
      let orderDetailWhere = {};
      let paymentWhere = {};
      let paymentDetailWhere = {};
      let include = [];

      // Add data isolation based on user role
      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        // Tapi jika ada branch_id yang dipilih, filter berdasarkan branch tersebut
        orderWhere.tenant_id = user_tenant_id;
        if (user_branch_id) {
          // Get accessible branch IDs (include mitra if main branch)
          const accessibleBranchIds = await getAccessibleBranchIds(user_branch_id, user_tenant_id);
          orderWhere.branch_id = accessibleBranchIds.length > 1
            ? { [Op.in]: accessibleBranchIds }
            : user_branch_id;
        }
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya + mitra (if applicable)
        orderWhere.tenant_id = user_tenant_id;
        // Get accessible branch IDs (include mitra if main branch)
        const accessibleBranchIds = await getAccessibleBranchIds(user_branch_id, user_tenant_id);
        orderWhere.branch_id = accessibleBranchIds.length > 1
          ? { [Op.in]: accessibleBranchIds }
          : user_branch_id;
      }

      // Debug log untuk melihat where clause yang digunakan
      console.log('OrderRepository.getAllOrderNew - orderWhere:', JSON.stringify(orderWhere, null, 2));
      console.log('OrderRepository.getAllOrderNew - user_tenant_id:', user_tenant_id);
      console.log('OrderRepository.getAllOrderNew - user_branch_id:', user_branch_id);
      console.log('OrderRepository.getAllOrderNew - user_role:', user_role);

      // Helper: parsing filter dinamis
      if (filter) {
        for (const key in filter) {
          const value = filter[key];
          // Relasi: order_details.status, payment.status, dst
          if (key.startsWith('order_details.')) {
            const field = key.replace('order_details.', '');
            if (Array.isArray(value)) {
              orderDetailWhere[field] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              // Support range: { gte: x, lte: y }
              orderDetailWhere[field] = {};
              if (value.gte) orderDetailWhere[field][Op.gte] = value.gte;
              if (value.lte) orderDetailWhere[field][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (field === 'due_date' || field === 'created_at' || field === 'createdAt') {
                orderDetailWhere[field] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                orderDetailWhere[field] = value;
              }
            }
          } else if (key.startsWith('payment.')) {
            const field = key.replace('payment.', '');
            if (Array.isArray(value)) {
              paymentWhere[field] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              paymentWhere[field] = {};
              if (value.gte) paymentWhere[field][Op.gte] = value.gte;
              if (value.lte) paymentWhere[field][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (field === 'createdAt' || field === 'created_at' || field === 'updatedAt' || field === 'updated_at') {
                paymentWhere[field] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                paymentWhere[field] = value;
              }
            }
          } else if (key.startsWith('payment_details.')) {
            const field = key.replace('payment_details.', '');
            // Convert snake_case to camelCase for createdAt
            const actualField = field === 'created_at' ? 'createdAt' : field;
            console.log('Field:', field, 'Actual Field:', actualField, 'Value:', value);
            if (Array.isArray(value)) {
              paymentDetailWhere[actualField] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              paymentDetailWhere[actualField] = {};
              if (value.gte) paymentDetailWhere[actualField][Op.gte] = value.gte;
              if (value.lte) paymentDetailWhere[actualField][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (field === 'created_at' || field === 'createdAt') {
                paymentDetailWhere[actualField] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                paymentDetailWhere[actualField] = value;
              }
            }
          } else if (key === 'paymentDetailStartDate' || key === 'paymentDetailEndDate') {
            // Legacy: payment detail createdAt range
            if (!paymentDetailWhere.createdAt) paymentDetailWhere.createdAt = {};
            if (filter.paymentDetailStartDate) paymentDetailWhere.createdAt[Op.gte] = filter.paymentDetailStartDate;
            if (filter.paymentDetailEndDate) paymentDetailWhere.createdAt[Op.lte] = filter.paymentDetailEndDate;
          } else if (key === 'search') {
            // Search global (nama customer, kode payment, dst)
            include.push({
              model: Customer,
              as: 'customer',
              attributes: { exclude: ['password'] },
              required: true,
              where: {
                [Op.or]: [
                  { name: { [Op.substring]: value } },
                  { phone: { [Op.substring]: value } },
                  { email: { [Op.substring]: value } },
                ]
              }
            });
          } else if (key === 'startDate' || key === 'endDate') {
            // Legacy: entry_date range
            if (!orderWhere.entry_date) orderWhere.entry_date = {};
            if (filter.startDate) orderWhere.entry_date[Op.gte] = filter.startDate;
            if (filter.endDate) orderWhere.entry_date[Op.lte] = filter.endDate;
          } else if (key === 'dueStartDate' || key === 'dueEndDate') {
            // Legacy: due_date range (order detail)
            if (!orderDetailWhere.due_date) orderDetailWhere.due_date = {};
            if (filter.dueStartDate) orderDetailWhere.due_date[Op.gte] = filter.dueStartDate;
            if (filter.dueEndDate) orderDetailWhere.due_date[Op.lte] = filter.dueEndDate;
          } else if (key === 'paymentStartDate' || key === 'paymentEndDate') {
            // Legacy: payment createdAt range
            if (!paymentWhere.createdAt) paymentWhere.createdAt = {};
            if (filter.paymentStartDate) paymentWhere.createdAt[Op.gte] = filter.paymentStartDate;
            if (filter.paymentEndDate) paymentWhere.createdAt[Op.lte] = filter.paymentEndDate;
          } else if (key === 'paymentDetailStartDate' || key === 'paymentDetailEndDate') {
            // Legacy: payment detail createdAt range
            if (!paymentDetailWhere.createdAt) paymentDetailWhere.createdAt = {};
            if (filter.paymentDetailStartDate) paymentDetailWhere.createdAt[Op.gte] = filter.paymentDetailStartDate;
            if (filter.paymentDetailEndDate) paymentDetailWhere.createdAt[Op.lte] = filter.paymentDetailEndDate;
          } else {
            // Field di Order
            if (Array.isArray(value)) {
              orderWhere[key] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              orderWhere[key] = {};
              if (value.gte) orderWhere[key][Op.gte] = value.gte;
              if (value.lte) orderWhere[key][Op.lte] = value.lte;

              // Jika tidak ada gte/lte, hapus object kosong
              if (Object.keys(orderWhere[key]).length === 0) {
                delete orderWhere[key];
              }
            } else {
              // Handle single date string - convert to range for that specific date
              if (key === 'entry_date' || key === 'createdAt' || key === 'created_at' || key === 'updatedAt' || key === 'updated_at') {
                orderWhere[key] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                orderWhere[key] = value;
              }
            }
          }
        }
      }

      // Include relasi utama
      if (!include.find(i => i.as === 'customer')) {
        include.push({
          model: Customer,
          as: 'customer',
          attributes: { exclude: ['password'] },
          required: true,
        });
      }
      // Debug log
      if (Object.keys(paymentDetailWhere).length > 0) {
        console.log('PaymentDetailWhere:', JSON.stringify(paymentDetailWhere, null, 2));
      }

      include.push({
        model: Payment,
        as: 'payment',
        required: true,
        where: Object.keys(paymentWhere).length ? paymentWhere : undefined,
        include: [
          {
            model: PaymentDetail,
            as: 'payment_details',
            where: Object.keys(paymentDetailWhere).length ? paymentDetailWhere : undefined,
            include: [
              {
                model: FinanceTransaction,
                as: 'transaction',
                attributes: ['id', 'account_id'],
                include: [
                  {
                    model: FinanceAccount,
                    as: 'finance_account',
                    attributes: ['id', 'name', 'payment_method_id'],
                    include: [
                      {
                        model: PaymentMethod,
                        as: 'payment_method',
                        attributes: ['id', 'name', 'code', 'type', 'icon']
                      }
                    ]
                  }
                ]
              },
              {
                model: PaymentMethod,
                as: 'payment_method',
                attributes: ['id', 'name', 'code', 'type', 'icon']
              }
            ]
          }
        ]
      });
      include.push({
        model: OrderDetail,
        as: 'order_details',
        where: Object.keys(orderDetailWhere).length ? orderDetailWhere : undefined,
        include: [
          { model: Item, as: 'item' },
          { model: Treatment, as: 'treatment' },
          { model: User, as: 'employee' },
          { model: Discount, as: 'discount' },
          { model: ShoePhoto, as: 'shoes_photos' },
          { model: User, as: 'courier', attributes: ['id', 'name'] },
          {
            model: OrderDetailStatusLog,
            as: 'status_logs',
            attributes: ['new_status', 'updated_by', 'created_at'],
            order: [['created_at', 'DESC']]
          },
        ]
      });

      // Include created_by user
      include.push({
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
        required: false
      });

      // Hitung totalCount
      console.log('🔍 getAllOrderNew - orderWhere:', JSON.stringify(orderWhere, null, 2));
      console.log('🔍 getAllOrderNew - include length:', include.length);
      console.log('🔍 getAllOrderNew - include:', JSON.stringify(include, null, 2));

      let totalCount = 0;
      try {
        // Gunakan include yang sama dengan query data untuk konsistensi pagination
        totalCount = await Order.count({
          where: orderWhere,
          include: include,
          distinct: true
        });
        console.log('🔍 getAllOrderNew - totalCount:', totalCount);
      } catch (countError) {
        console.error('🔍 getAllOrderNew - count error:', countError);
        throw countError;
      }

      // Ambil data orders
      const orders = await Order.findAll({
        where: orderWhere,
        include,
        limit: pageSizeInt,
        offset,
        order: [['id', 'DESC']],
        distinct: true
      });

      // Tambahkan account_id, account_name, account_type, dan payment_method data ke payment_details
      orders.forEach(order => {
        order.payment.payment_details.forEach(paymentDetail => {
          paymentDetail.account_id = paymentDetail.transaction?.account_id;
          paymentDetail.account_name = paymentDetail.transaction?.finance_account?.name;
          paymentDetail.account_type = paymentDetail.transaction?.finance_account?.payment_method?.name || 'General';
          // Tambahkan payment method data
          paymentDetail.payment_method_name = paymentDetail.payment_method?.name;
          paymentDetail.payment_method_code = paymentDetail.payment_method?.code;
          paymentDetail.payment_method_type = paymentDetail.payment_method?.type;
          paymentDetail.payment_method_icon = paymentDetail.payment_method?.icon;
        });
      });

      return { totalCount, orders };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async funcGetOrderById(orderId, user_tenant_id = null, user_branch_id = null, user_role = null, transaction = null) {
    try {
      console.log('🔍 funcGetOrderById - orderId:', orderId);
      console.log('🔍 funcGetOrderById - user_tenant_id:', user_tenant_id);
      console.log('🔍 funcGetOrderById - user_branch_id:', user_branch_id);
      console.log('🔍 funcGetOrderById - user_role:', user_role);

      // Add data isolation based on user role
      let whereClause = { id: orderId };

      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
        console.log('🔍 funcGetOrderById - using superapp-superadmin filter');
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        whereClause.tenant_id = user_tenant_id;
        console.log('🔍 funcGetOrderById - using superadmin filter with tenant_id:', user_tenant_id);
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya
        whereClause.tenant_id = user_tenant_id;
        whereClause.branch_id = user_branch_id;
        console.log('🔍 funcGetOrderById - using employee/admin filter with tenant_id:', user_tenant_id, 'branch_id:', user_branch_id);
      }

      console.log('🔍 funcGetOrderById - whereClause:', JSON.stringify(whereClause, null, 2));

      const order = await Order.findOne({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: { exclude: ['password'] },
            include: [
              {
                model: CustomerMembership,
                as: 'current_membership',
                attributes: ['id', 'status', 'start_date', 'end_date'],
                include: [{
                  model: Membership,
                  as: 'membership',
                  attributes: ['id', 'name', 'discount_percentage']
                }]
              }
            ]
          },
          {
            model: Payment,
            as: 'payment',
            include: [
              {
                model: Discount,
                as: 'discount',
                attributes: ['id', 'name', 'type', 'discount', 'is_active']
              },
              {
                model: PaymentDetail,
                as: 'payment_details',
                include: [
                  {
                    model: FinanceTransaction,
                    as: 'transaction',
                    attributes: ['id', 'account_id'],
                    include: [
                      {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['id', 'name', 'payment_method_id'],
                        include: [
                          {
                            model: PaymentMethod,
                            as: 'payment_method',
                            attributes: ['id', 'name', 'code', 'type', 'icon']
                          }
                        ]
                      }
                    ]
                  },
                  {
                    model: PaymentMethod,
                    as: 'payment_method',
                    attributes: ['id', 'name', 'code', 'type', 'icon']
                  }
                ]
              }
            ]
          },
          {
            model: OrderDetail,
            as: 'order_details',
            include: [
              {
                model: Item,
                as: 'item',
              },
              {
                model: Treatment,
                as: 'treatment',
              },
              {
                model: User,
                as: 'employee',
              },
              {
                model: Discount,
                as: 'discount',
              },
              {
                model: ShoePhoto,
                as: 'shoes_photos',
              },
              {
                model: User,
                as: 'courier',
                attributes: ['id', 'name'],
              },
              {
                // Dapur tempat item diproduksi (outlet penjual atau dapur pusat)
                model: Branch,
                as: 'productionBranch',
                attributes: ['id', 'name'],
                required: false,
              }
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          },
          {
            model: Customer,
            as: 'referrer',
            attributes: ['id', 'name', 'phone'],
            required: false
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'branch_type'],
            required: false
          },
        ],
      }, { transaction });

      console.log('🔍 funcGetOrderById - order found:', order ? 'YES' : 'NO');
      if (order) {
        console.log('🔍 funcGetOrderById - order id:', order.id);
        console.log('🔍 funcGetOrderById - order customer:', order.customer ? 'found' : 'not found');
        console.log('🔍 funcGetOrderById - order payment:', order.payment ? 'found' : 'not found');
      }

      return order;
    } catch (error) {
      console.error('❌ funcGetOrderById error:', error);
      throw new Error(error.message);
    }
  }

  static async getById(id) {
    try {
      const result = await Order.findByPk(id);

      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async update(id, data, transaction) {
    try {
      if (!id) throw new Error('ID Order tidak boleh kosong');

      const result = await Order.findByPk(id);
      if (!result) throw new Error(`Order dengan ID ${id} tidak ditemukan`);

      // Prepare update data, include referral fields
      const updateData = {
        customer_id: data.customer_id,
        branch_id: data.branch_id,
        payment_id: data.payment_id,
        entry_date: data.entry_date,
        quantity: data.quantity,
        order_type: data.order_type,
        table_number: data.table_number !== undefined ? data.table_number : result.table_number,
        shift_id: data.shift_id,
        created_by: data.created_by,
        tenant_id: data.tenant_id,
        referred_by: data.referred_by !== undefined ? data.referred_by : result.referred_by, // Referral customer ID
        referred_by_phone: data.referred_by_phone !== undefined ? data.referred_by_phone : result.referred_by_phone, // Referral phone number
        customer_note: data.customer_note !== undefined ? data.customer_note : result.customer_note // Catatan dari customer
      };

      await result.update(updateData, { transaction });
      return result;
    } catch (error) {
      throw new Error(`Gagal mengupdate order: ${error.message}`);
    }
  }

  static async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const result = await Order.findByPk(id);

      await result.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw new Error(error.message);
    }
  }

  static async getStatisticsNew({ filter, user_tenant_id, user_branch_id, user_role }) {
    try {
      // Default where untuk Order
      let orderWhere = {};
      let orderDetailWhere = {};
      let paymentWhere = {};
      let paymentDetailWhere = {};
      let include = [];

      // Add data isolation based on user role
      if (user_role === 'superapp-superadmin') {
        // Super App Super Admin bisa lihat semua data
      } else if (user_role === 'superadmin') {
        // Superadmin (per tenant) bisa lihat data tenant-nya
        orderWhere.tenant_id = user_tenant_id;
      } else {
        // Employee/Admin hanya bisa lihat data branch-nya
        orderWhere.tenant_id = user_tenant_id;
        orderWhere.branch_id = user_branch_id;
      }

      // Helper: parsing filter dinamis (sama seperti getAllOrderNew)
      if (filter) {
        for (const key in filter) {
          const value = filter[key];
          // Relasi: order_details.status, payment.status, dst
          if (key.startsWith('order_details.')) {
            const field = key.replace('order_details.', '');
            if (Array.isArray(value)) {
              orderDetailWhere[field] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              // Support range: { gte: x, lte: y }
              orderDetailWhere[field] = {};
              if (value.gte) orderDetailWhere[field][Op.gte] = value.gte;
              if (value.lte) orderDetailWhere[field][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (field === 'due_date' || field === 'created_at' || field === 'createdAt') {
                orderDetailWhere[field] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                orderDetailWhere[field] = value;
              }
            }
          } else if (key.startsWith('payment.')) {
            const field = key.replace('payment.', '');
            if (Array.isArray(value)) {
              paymentWhere[field] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              paymentWhere[field] = {};
              if (value.gte) paymentWhere[field][Op.gte] = value.gte;
              if (value.lte) paymentWhere[field][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (field === 'createdAt' || field === 'created_at' || field === 'updatedAt' || field === 'updated_at') {
                paymentWhere[field] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                paymentWhere[field] = value;
              }
            }
          } else if (key.startsWith('payment_details.')) {
            const field = key.replace('payment_details.', '');
            // Convert snake_case to camelCase for createdAt
            const actualField = field === 'created_at' ? 'createdAt' : field;
            if (Array.isArray(value)) {
              paymentDetailWhere[actualField] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              paymentDetailWhere[actualField] = {};
              if (value.gte) paymentDetailWhere[actualField][Op.gte] = value.gte;
              if (value.lte) paymentDetailWhere[actualField][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (field === 'created_at' || field === 'createdAt') {
                paymentDetailWhere[actualField] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                paymentDetailWhere[actualField] = value;
              }
            }
          } else if (key === 'paymentDetailStartDate' || key === 'paymentDetailEndDate') {
            // Legacy: payment detail createdAt range
            if (!paymentDetailWhere.createdAt) paymentDetailWhere.createdAt = {};
            if (filter.paymentDetailStartDate) paymentDetailWhere.createdAt[Op.gte] = filter.paymentDetailStartDate;
            if (filter.paymentDetailEndDate) paymentDetailWhere.createdAt[Op.lte] = filter.paymentDetailEndDate;
          } else if (key === 'search') {
            // Search global (nama customer, kode payment, dst)
            include.push({
              model: Customer,
              as: 'customer',
              attributes: { exclude: ['password'] },
              required: true,
              where: {
                [Op.or]: [
                  { name: { [Op.substring]: value } },
                  { phone: { [Op.substring]: value } },
                  { email: { [Op.substring]: value } },
                ]
              }
            });
          } else if (key === 'startDate' || key === 'endDate') {
            // Legacy: entry_date range
            if (!orderWhere.entry_date) orderWhere.entry_date = {};
            if (filter.startDate) orderWhere.entry_date[Op.gte] = filter.startDate;
            if (filter.endDate) orderWhere.entry_date[Op.lte] = filter.endDate;
          } else if (key === 'dueStartDate' || key === 'dueEndDate') {
            // Legacy: due_date range (order detail)
            if (!orderDetailWhere.due_date) orderDetailWhere.due_date = {};
            if (filter.dueStartDate) orderDetailWhere.due_date[Op.gte] = filter.dueStartDate;
            if (filter.dueEndDate) orderDetailWhere.due_date[Op.lte] = filter.dueEndDate;
          } else if (key === 'paymentStartDate' || key === 'paymentEndDate') {
            // Legacy: payment createdAt range
            if (!paymentWhere.createdAt) paymentWhere.createdAt = {};
            if (filter.paymentStartDate) paymentWhere.createdAt[Op.gte] = filter.paymentStartDate;
            if (filter.paymentEndDate) paymentWhere.createdAt[Op.lte] = filter.paymentEndDate;
          } else {
            // Field di Order
            if (Array.isArray(value)) {
              orderWhere[key] = { [Op.in]: value };
            } else if (typeof value === 'object' && value !== null) {
              orderWhere[key] = {};
              if (value.gte) orderWhere[key][Op.gte] = value.gte;
              if (value.lte) orderWhere[key][Op.lte] = value.lte;
            } else {
              // Handle single date string - convert to range for that specific date
              if (key === 'entry_date' || key === 'createdAt' || key === 'created_at' || key === 'updatedAt' || key === 'updated_at') {
                orderWhere[key] = {
                  [Op.gte]: value + ' 00:00:00',
                  [Op.lte]: value + ' 23:59:59'
                };
              } else {
                orderWhere[key] = value;
              }
            }
          }
        }
      }

      // Include relasi utama untuk statistics
      if (!include.find(i => i.as === 'customer')) {
        include.push({
          model: Customer,
          as: 'customer',
          attributes: { exclude: ['password'] },
          required: true,
        });
      }

      include.push({
        model: Payment,
        as: 'payment',
        required: true,
        where: Object.keys(paymentWhere).length ? paymentWhere : undefined,
        include: [
          {
            model: PaymentDetail,
            as: 'payment_details',
            where: Object.keys(paymentDetailWhere).length ? paymentDetailWhere : undefined,
          }
        ]
      });

      include.push({
        model: OrderDetail,
        as: 'order_details',
        where: Object.keys(orderDetailWhere).length ? orderDetailWhere : undefined,
      });

      // Ambil semua data untuk statistics (tanpa pagination)
      const allOrders = await Order.findAll({
        where: orderWhere,
        include,
        order: [['id', 'DESC']],
        distinct: true
      });

      // Hitung statistics dari seluruh dataset
      let statistics = {
        count_transaction: allOrders.length,
        count_services: 0,
        sum_revenue: 0,
        paid_revenue: 0,
        unpaid_revenue: 0,
        dp_revenue: 0,
        quantity_items: 0,
        payment_status: { paid: 0, unpaid: 0, dp: 0 },
        payment_method: { cash: 0, bank_transfer: 0, qris: 0 },
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
        payment_details: {
          total_paid: 0,
          methods: {
            cash: { count: 0, amount: 0 },
            bank_transfer: { count: 0, amount: 0 },
            qris: { count: 0, amount: 0 }
          }
        }
      };

      allOrders.forEach((order) => {
        statistics.count_services += order.order_details.length;
        // ✅ Total Item = jumlah BARANG unik per order (item_id yang sama dipakai
        //    2 layanan tetap 1 item). ⚠️ JANGAN pakai order.quantity — itu angka
        //    isian kasir yang sering tidak akurat.
        const distinctItemIds = new Set();
        order.order_details.forEach((detail) => {
          if (detail.item_id) distinctItemIds.add(detail.item_id);
        });
        statistics.quantity_items += distinctItemIds.size;
        const finalPrice = parseFloat(order.payment.final_price);
        statistics.sum_revenue += finalPrice;
        const totalPaid = order.payment.payment_details?.reduce((total, detail) => {
          const amount = parseFloat(detail.final_amount || 0);
          if (detail.method && statistics.payment_details.methods[detail.method]) {
            statistics.payment_details.methods[detail.method].count++;
            statistics.payment_details.methods[detail.method].amount += amount;
          }
          return total + amount;
        }, 0) || 0;
        statistics.payment_details.total_paid += totalPaid;
        if (totalPaid >= finalPrice) {
          statistics.paid_revenue += finalPrice;
          statistics.payment_status.paid++;
        } else if (totalPaid === 0) {
          statistics.unpaid_revenue += finalPrice;
          statistics.payment_status.unpaid++;
        } else {
          statistics.dp_revenue += totalPaid;
          statistics.unpaid_revenue += (finalPrice - totalPaid);
          statistics.payment_status.dp++;
        }
        order.order_details.forEach((detail) => {
          if (detail.status && statistics.service_status.hasOwnProperty(detail.status)) {
            statistics.service_status[detail.status]++;
          }
        });
      });

      Object.keys(statistics.payment_details.methods).forEach(method => {
        statistics.payment_method[method] = statistics.payment_details.methods[method].count;
      });

      return statistics;
    } catch (error) {
      throw new Error(error.message);
    }
  }
};

module.exports = OrderRepository;