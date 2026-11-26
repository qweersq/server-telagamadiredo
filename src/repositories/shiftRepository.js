const { Customer, Expense, Order, OrderDetail, Payment, PaymentDetail, Shift, User, Branch, FinanceAccount, PaymentMethod, sequelize, Op } = require('../models');

class ShiftRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            // ✅ Lock check untuk prevent race condition (SELECT FOR UPDATE)
            const existingActive = await Shift.findOne({
                where: {
                    branch_id: data.branch_id,
                    tenant_id: data.tenant_id,
                    end_time: null
                },
                lock: true,
                transaction
            });
            
            if (existingActive) {
                await transaction.rollback();
                throw new Error('There is already an active shift for this branch');
            }
            
            const result = await Shift.create(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async calculateData(start, end = new Date(), shiftId = null, tenantId = null, branchId = null) {
        try {
            console.log('🔍 ShiftRepository.calculateData - Starting calculation:', { start, end, shiftId, tenantId, branchId });

            // Fetch finance accounts untuk tenant (semua branch)
            console.log('🔍 ShiftRepository.calculateData - Fetching finance accounts with:', { tenantId, branchId });
            console.log('🚨 DEBUG: About to query FinanceAccount.findAll - this might be where the error occurs');
            const financeAccounts = await FinanceAccount.findAll({
                where: {
                    tenant_id: tenantId,
                    is_active: true
                },
                attributes: ['id', 'name', 'branch_id', 'payment_method_id'],
                include: [
                    {
                        model: require('../models').PaymentMethod,
                        as: 'payment_method',
                        attributes: ['id', 'name', 'code', 'type', 'icon']
                    }
                ]
            });
            console.log('✅ ShiftRepository.calculateData - Finance accounts found:', financeAccounts.length);
            console.log('🔍 ShiftRepository.calculateData - Finance accounts:', financeAccounts.map(acc => ({
                id: acc.id,
                name: acc.name,
                payment_method: acc.payment_method?.name || 'No Payment Method',
                branch_id: acc.branch_id
            })));

            // Initialize account breakdown
            const accountBreakdown = {};
            financeAccounts.forEach(account => {
                accountBreakdown[account.id] = {
                    account_id: account.id,
                    account_name: account.name,
                    payment_method_name: account.payment_method?.name || 'General',
                    payment_method_code: account.payment_method?.code || 'general',
                    inflow: 0,
                    outflow: 0,
                    transactions: []
                };
            });

            console.log('🔍 ShiftRepository.calculateData - Initial accountBreakdown:', {
                keys: Object.keys(accountBreakdown),
                count: Object.keys(accountBreakdown).length,
                sample: Object.keys(accountBreakdown).length > 0 ? accountBreakdown[Object.keys(accountBreakdown)[0]] : null
            });

            console.log('🚨 DEBUG: About to query PaymentDetail.findAll - this might be where the error occurs');
            const paymentDetails = await PaymentDetail.findAll({
                where: {
                    shift_id: shiftId, // ✅ Direct filtering by shift_id
                    // Removed createdAt filter because payment_details.createdAt might be different from shift time range
                },
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                        include: [
                            {
                                model: Order,
                                as: 'order',
                                include: [
                                    {
                                        model: Customer,
                                        as: 'customer',
                                        attributes: ['id', 'name']
                                    }
                                ]
                            },
                            {
                                model: require('../models').CustomerMembership,
                                as: 'customer_memberships',
                                include: [
                                    {
                                        model: Customer,
                                        as: 'customer',
                                        attributes: ['id', 'name']
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['id', 'name', 'payment_method_id'],
                        include: [
                            {
                                model: require('../models').PaymentMethod,
                                as: 'payment_method',
                                attributes: ['id', 'name', 'code', 'type', 'icon']
                            }
                        ]
                    }
                ]
            });

            console.log('🔍 ShiftRepository.calculateData - Payment details query executed with shift_id:', shiftId);
            console.log('🔍 ShiftRepository.calculateData - Payment details query executed with date range:', { start, end });
            console.log('✅ ShiftRepository.calculateData - Payment details found:', paymentDetails.length);
            console.log('🔍 ShiftRepository.calculateData - Payment details sample:', paymentDetails.slice(0, 2).map(pd => ({
                id: pd.id,
                method: pd.method,
                amount: pd.amount,
                shift_id: pd.shift_id,
                finance_account_id: pd.finance_account_id,
                finance_account: pd.finance_account ? { id: pd.finance_account.id, name: pd.finance_account.name } : null,
                has_order: !!pd.payment?.order,
                has_customer_memberships: !!pd.payment?.customer_memberships?.length,
                order_id: pd.payment?.order?.id || null,
                membership_customer: pd.payment?.customer_memberships?.[0]?.customer?.name || null
            })));

            const orderWhereClause = {};

            if (shiftId) {
                orderWhereClause.shift_id = shiftId;
            } else {
                orderWhereClause.createdAt = {
                    [Op.between]: [start, end],
                };
            }

            if (tenantId) {
                orderWhereClause.tenant_id = tenantId;
            }

            if (branchId) {
                orderWhereClause.branch_id = branchId;
            }

            const orders = await Order.findAll({
                where: orderWhereClause,
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                    },
                    {
                        model: OrderDetail,
                        as: 'order_details',
                    },
                    {
                        model: Customer,
                        as: 'customer',
                    }
                ],
            });
            console.log('✅ ShiftRepository.calculateData - Orders found:', orders.length);

            const expenses = await Expense.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [start, end],
                    },
                    shift_id: shiftId
                },
            });
            console.log('✅ ShiftRepository.calculateData - Expenses found:', expenses.length);

            let statistics = {
                transaction: 0,
                item: 0,
                service: 0,
                total_revenue: 0,

                // ✅ Cash-focused calculations for shift management
                cash_expected: 0,
                cash_actual: 0,
                cash_inflow: 0,    // ✅ Uang masuk cash
                cash_outflow: 0,   // ✅ Uang keluar cash
                cash_balance: 0,   // ✅ Saldo akhir cash (auto-calculated)

                // ✅ Payment method breakdown
                bank_transfer: 0,
                qris: 0,
                ewallet: 0,
                paid: 0,
                unpaid: 0,
                dp: 0,

                payment_methods: {
                    cash: { count: 0, amount: 0 },
                    bank_transfer: { count: 0, amount: 0 },
                    qris: { count: 0, amount: 0 },
                    ewallet: { count: 0, amount: 0 }
                },
                payment_details: {
                    cash: [],
                    bank_transfer: [],
                    qris: [],
                    ewallet: []
                },

                total_expenses: 0,
                expenses: []
            };

            let membershipRevenue = 0;
            let membershipTransactions = 0;
            let orderRevenue = 0;

            // Process payment details dengan finance_account_id
            paymentDetails.forEach(detail => {
                try {
                    const amount = parseFloat(detail.final_amount || 0);
                    const accountId = detail.finance_account_id;

                    // ✅ Handle 3 jenis payment: Order, Membership, Expense
                    let order = null;
                    let customer = null;
                    let paymentType = 'unknown';

                    // Check if it's order payment
                    if (detail.payment?.order) {
                        order = detail.payment.order;
                        customer = order.customer;
                        paymentType = 'order';
                    }
                    // Check if it's membership payment
                    else if (detail.payment?.customer_memberships?.[0]) {
                        customer = detail.payment.customer_memberships[0].customer;
                        paymentType = 'membership';
                    }
                    // Otherwise it's expense or other payment (no customer info needed)
                    else {
                        paymentType = 'expense';
                    }

                    const paymentInfo = {
                        id: detail.id,
                        order_id: order?.id || null,
                        customer_id: customer?.id || null,
                        customer_name: customer?.name || '',
                        amount: amount,
                        method: detail.method,
                        time: detail.createdAt,
                        evidence_photo: detail.evidence_photo,
                        payment_type: paymentType // ✅ Add payment type for debugging
                    };

                    // Add to account breakdown
                    if (accountId && accountBreakdown[accountId]) {
                        accountBreakdown[accountId].inflow += amount;
                        accountBreakdown[accountId].transactions.push(paymentInfo);
                        
                        // ✅ Debug logging for account breakdown
                        console.log(`🔍 Account Breakdown - Payment ${detail.id}:`, {
                            account_id: accountId,
                            payment_type: paymentType,
                            customer_name: customer?.name || 'No Customer',
                            order_id: order?.id || 'No Order',
                            amount: amount
                        });
                    }

                    // ✅ Catat pendapatan membership (order akan dihitung terpisah)
                    if (paymentType === 'membership') {
                        membershipRevenue += amount;
                        membershipTransactions += 1;
                    }

                    // ✅ Cash-focused calculations for shift management
                    // Filter berdasarkan finance account payment method = 'cash'
                    if (detail.finance_account?.payment_method?.code === 'cash') {
                        statistics.cash_inflow += amount; // ✅ Uang masuk cash
                        statistics.cash_expected += amount;
                    }

                    // ✅ Payment method breakdown
                    if (detail.method) {
                        // Initialize payment method if it doesn't exist
                        if (!statistics.payment_methods[detail.method]) {
                            statistics.payment_methods[detail.method] = { count: 0, amount: 0 };
                            statistics.payment_details[detail.method] = [];
                        }
                        
                        statistics.payment_methods[detail.method].count++;
                        statistics.payment_methods[detail.method].amount += amount;
                        statistics.payment_details[detail.method].push(paymentInfo);

                        switch (detail.method) {
                            case 'cash':
                                statistics.cash_expected += amount;
                                break;
                            case 'bank_transfer':
                                statistics.bank_transfer += amount;
                                break;
                            case 'qris':
                                statistics.qris += amount;
                                break;
                            case 'ewallet':
                                statistics.ewallet += amount;
                                break;
                        }
                    }
                } catch (error) {
                    console.error('❌ Error processing payment detail:', detail.id, error.message);
                    // Continue processing other details
                }
            });

            statistics.transaction = orders.length;

            orders.forEach(order => {
                statistics.item += order.quantity || 0;
                statistics.service += order.order_details.length;
                orderRevenue += parseFloat(order.payment?.final_price || 0);

                const totalPaid = order.payment?.payment_details?.reduce(
                    (total, detail) => total + parseFloat(detail.final_amount || 0),
                    0
                ) || 0;

                if (totalPaid >= parseFloat(order.payment?.final_price || 0)) {
                    statistics.paid += parseFloat(order.payment?.final_price || 0);
                } else if (totalPaid === 0) {
                    statistics.unpaid += parseFloat(order.payment?.final_price || 0);
                } else {
                    statistics.dp += totalPaid;
                }
            });

            statistics.total_revenue = orderRevenue + membershipRevenue;
            statistics.transaction += membershipTransactions;

            // Process expenses dengan finance_account_id
            // Process expenses
            expenses.forEach(expense => {
                const amount = parseFloat(expense.amount || 0);
                const accountId = expense.finance_account_id;
                
                // ✅ Check if expense is cash (finance account with payment method 'cash')
                const account = accountBreakdown[accountId];
                if (account && account.payment_method_code === 'cash') {
                    statistics.cash_outflow += amount; // ✅ Uang keluar cash
                }

                statistics.total_expenses += amount;
                statistics.expenses.push({
                    id: expense.id,
                    name: expense.name,
                    description: expense.description,
                    amount: amount,
                    time: expense.createdAt,
                    receipt: expense.receipt
                });

                // Add to account breakdown
                if (accountId && accountBreakdown[accountId]) {
                    accountBreakdown[accountId].outflow += amount;
                }
            });

            const formatNumber = (num) => parseFloat(num).toFixed(2);

            // ✅ Auto-calculate cash balance: Saldo Awal + Uang Masuk Cash - Uang Keluar Cash
            // Note: cash_initial akan di-set dari shift data di getShiftDetail
            statistics.cash_balance = statistics.cash_inflow - statistics.cash_outflow;

            // Calculate difference: Kas Akhir - (Kas Awal + Revenue Cash - Pengeluaran Cash)
            // Note: cash_actual should be passed from the shift data, not calculated here
            // This is just for the calculation logic
            const expectedCashFlow = statistics.cash_expected - statistics.total_expenses;

            const result = {
                transaction: statistics.transaction,
                item: statistics.item,
                service: statistics.service,
                total_revenue: formatNumber(statistics.total_revenue),

                // ✅ Cash-focused calculations for shift management
                cash_expected: formatNumber(statistics.cash_expected),
                cash_actual: formatNumber(statistics.cash_actual),
                cash_inflow: formatNumber(statistics.cash_inflow),    // ✅ Uang masuk cash
                cash_outflow: formatNumber(statistics.cash_outflow), // ✅ Uang keluar cash
                cash_balance: formatNumber(statistics.cash_balance),  // ✅ Saldo akhir cash (auto-calculated)

                // ✅ Payment method breakdown
                bank_transfer: formatNumber(statistics.bank_transfer),
                qris: formatNumber(statistics.qris),
                ewallet: formatNumber(statistics.ewallet),
                difference: formatNumber(statistics.cash_actual - statistics.cash_expected), // This will be recalculated in getShiftDetail
                paid: formatNumber(statistics.paid),
                unpaid: formatNumber(statistics.unpaid),
                dp: formatNumber(statistics.dp),

                payment_methods: (() => {
                    const result = {};
                    Object.keys(statistics.payment_methods).forEach(method => {
                        result[method] = {
                            count: statistics.payment_methods[method].count,
                            amount: formatNumber(statistics.payment_methods[method].amount),
                            transactions: statistics.payment_details[method].sort((a, b) =>
                                new Date(b.time) - new Date(a.time)
                            )
                        };
                    });
                    return result;
                })(),

                total_expenses: formatNumber(statistics.total_expenses),
                expenses: statistics.expenses.sort((a, b) => new Date(b.time) - new Date(a.time)),
                account_breakdown: (() => {
                    // Filter out accounts with no inflow and no outflow
                    const filteredBreakdown = {};

                    Object.keys(accountBreakdown).forEach(accountId => {
                        const account = accountBreakdown[accountId];
                        if (account.inflow > 0 || account.outflow > 0) {
                            filteredBreakdown[accountId] = {
                                account_id: account.account_id,
                                account_name: account.account_name,
                                payment_method_name: account.payment_method_name,
                                payment_method_code: account.payment_method_code,
                                inflow: formatNumber(account.inflow),
                                outflow: formatNumber(account.outflow),
                                transactions: account.transactions.sort((a, b) => new Date(b.time) - new Date(a.time))
                            };
                        }
                    });

                    return Object.keys(filteredBreakdown).length > 0 ? filteredBreakdown : {};
                })()
            };

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getShiftNow(id) {
        try {
            console.log('🔍 ShiftRepository.getShiftNow - Searching for active shift in branch:', id);

            const shift = await Shift.findOne({
                where: {
                    branch_id: id,
                    end_time: null,
                }
            });

            if (!shift) {
                console.log('ℹ️ ShiftRepository.getShiftNow - No active shift found for branch:', id);
                return shift;
            }

            console.log('✅ ShiftRepository.getShiftNow - Active shift found:', { id: shift.id, branch_id: shift.branch_id, start_time: shift.start_time });

            const calculateShiftData = await ShiftRepository.calculateData(shift.start_time);

            await Shift.update(calculateShiftData, {
                where: {
                    id: shift.id,
                },
            });

            const shiftData = await Shift.findByPk(
                shift.id,
                {
                    include: [
                        {
                            model: User,
                            as: 'employee_shift',
                            attributes: ['id', 'name'],
                        },
                    ],
                },
            );

            return shiftData;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(branch_id, user_tenant_id = null, user_role = null, page = 1, limit = 10, dateFilters = {}) {
        try {
            console.log('🔍 ShiftRepository.getAll - Starting with params:', { branch_id, user_tenant_id, user_role, page, limit, dateFilters });

            let whereClause = {
                branch_id: branch_id,
            };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
                console.log('ℹ️ ShiftRepository.getAll - Using superapp-superadmin access (no tenant filter)');
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
                console.log('ℹ️ ShiftRepository.getAll - Using superadmin access with tenant filter:', user_tenant_id);
            } else {
                whereClause.tenant_id = user_tenant_id;
                console.log('ℹ️ ShiftRepository.getAll - Using regular user access with tenant filter:', user_tenant_id);
            }

            // Apply date filtering
            let startDate, endDate;
            
            if (dateFilters.date_filter) {
                const now = new Date();

                switch (dateFilters.date_filter) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                        break;
                    case '7days':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        endDate = now;
                        break;
                    case '30days':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        endDate = now;
                        break;
                    case 'custom':
                        if (dateFilters.start_date && dateFilters.end_date) {
                            startDate = new Date(dateFilters.start_date);
                            endDate = new Date(dateFilters.end_date);
                        }
                        break;
                }
            } else if (dateFilters.start_date && dateFilters.end_date) {
                // Handle direct start_date and end_date without date_filter
                startDate = new Date(dateFilters.start_date);
                startDate.setHours(0, 0, 0, 0); // Set to start of day
                
                endDate = new Date(dateFilters.end_date);
                endDate.setHours(23, 59, 59, 999); // Set to end of day
            }

            if (startDate && endDate) {
                whereClause.start_time = {
                    [Op.between]: [startDate, endDate]
                };
                console.log('ℹ️ ShiftRepository.getAll - Applied date filter:', { startDate, endDate });
            }

            console.log('🔍 ShiftRepository.getAll - Final where clause:', whereClause);

            const offset = (page - 1) * limit;

            const { count, rows } = await Shift.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'employee_shift',
                        attributes: ['id', 'name']
                    },
                ],
                order: [['start_time', 'DESC']],
                limit: limit,
                offset: offset
            });

            console.log('✅ ShiftRepository.getAll - Found shifts:', count);

            return {
                shifts: rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('❌ ShiftRepository.getAll - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null) {
        try {
            console.log('🔍 ShiftRepository.getById - Searching for shift:', { id, user_tenant_id, user_role });

            let whereClause = {
                id: id
            };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
                console.log('ℹ️ ShiftRepository.getById - Using superapp-superadmin access (no tenant filter)');
            } else if (user_role === 'superadmin' && user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
                console.log('ℹ️ ShiftRepository.getById - Using superadmin access with tenant filter:', user_tenant_id);
            } else if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
                console.log('ℹ️ ShiftRepository.getById - Using regular user access with tenant filter:', user_tenant_id);
            } else {
                console.log('ℹ️ ShiftRepository.getById - No tenant filter applied (no user_tenant_id provided)');
            }

            console.log('🔍 ShiftRepository.getById - Where clause:', whereClause);

            const result = await Shift.findOne({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'employee_shift',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Expense,
                        as: 'expenses',
                        attributes: ['id', 'name', 'amount', 'description', 'receipt', 'createdAt'],
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
                        ],
                        where: user_tenant_id ? {
                            tenant_id: user_tenant_id
                        } : {},
                        required: false
                    }
                ]
            });

            console.log('✅ ShiftRepository.getById - Result:', result ? { id: result.id, branch_id: result.branch_id, tenant_id: result.tenant_id } : 'null');
            
            // 🔍 Debug expenses dengan finance_account
            if (result && result.expenses) {
                console.log('🔍 Debug expenses count:', result.expenses.length);
                result.expenses.forEach((expense, index) => {
                    console.log(`🔍 Expense ${index + 1}:`, {
                        id: expense.id,
                        name: expense.name,
                        finance_account_id: expense.finance_account_id,
                        has_finance_account: !!expense.finance_account,
                        finance_account: expense.finance_account ? {
                            id: expense.finance_account.id,
                            name: expense.finance_account.name,
                            has_payment_method: !!expense.finance_account.payment_method,
                            payment_method_code: expense.finance_account.payment_method?.code
                        } : null
                    });
                });
            }
            
            return result;
        } catch (error) {
            console.error('❌ ShiftRepository.getById - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // ✅ Get active shift (lightweight for get-profile)
    static async getActive(branch_id, tenant_id) {
        try {
            console.log('🔍 ShiftRepository.getActive - Getting active shift for branch:', branch_id, 'tenant:', tenant_id);
            
            const result = await Shift.findOne({
                where: {
                    branch_id: branch_id,
                    tenant_id: tenant_id,
                    end_time: null
                },
                include: [
                    {
                        model: User,
                        as: 'employee_shift',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['start_time', 'DESC']]
            });

            if (!result) {
                console.log('ℹ️ ShiftRepository.getActive - No active shift found');
                return null;
            }

            console.log('✅ ShiftRepository.getActive - Active shift found:', { id: result.id, branch_id: result.branch_id });

            // ✅ Lightweight calculation - only cash data
            const calculateShiftData = await ShiftRepository.calculateData(result.start_time, result.end_time || new Date(), result.id, result.tenant_id, result.branch_id);

            const activeShift = {
                id: result.id,
                employee_id: result.employee_id,
                branch_id: result.branch_id,
                start_time: result.start_time,
                end_time: result.end_time,
                cash_initial: result.cash_initial,
                cash_inflow: calculateShiftData.cash_inflow,
                cash_outflow: calculateShiftData.cash_outflow,
                cash_balance: parseFloat(result.cash_initial || 0) + parseFloat(calculateShiftData.cash_inflow || 0) - parseFloat(calculateShiftData.cash_outflow || 0),
                is_active: !result.end_time,
                employee_shift: result.employee_shift
            };

            console.log('✅ ShiftRepository.getActive - Lightweight shift data created:', { 
                id: activeShift.id, 
                cash_balance: activeShift.cash_balance,
                is_active: activeShift.is_active 
            });

            return activeShift;
        } catch (error) {
            console.error('❌ ShiftRepository.getActive - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Shift.findByPk(id);

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    // ✅ Update dengan WHERE condition (untuk prevent double end shift)
    static async updateWithCondition(id, data, whereCondition) {
        const transaction = await sequelize.transaction();
        try {
            const [updatedCount] = await Shift.update(data, {
                where: {
                    id: id,
                    ...whereCondition
                },
                transaction
            });

            if (updatedCount === 0) {
                await transaction.rollback();
                throw new Error('Shift not found or condition not met');
            }

            const result = await Shift.findByPk(id, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Shift.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getActiveBranches(tenant_id) {
        try {
            const branches = await Branch.findAll({
                where: {
                    tenant_id: tenant_id,
                    status: 'active'
                },
                attributes: ['id', 'name', 'address'],
                order: [['name', 'ASC']]
            });

            return branches;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getShiftDetail(id, user_tenant_id = null, user_role = null) {
        try {
            console.log('🔍 ShiftRepository.getShiftDetail - Getting shift detail:', { id, user_tenant_id, user_role });

            let whereClause = {
                id: id
            };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
                console.log('ℹ️ ShiftRepository.getShiftDetail - Using superapp-superadmin access (no tenant filter)');
            } else if (user_role === 'superadmin' && user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
                console.log('ℹ️ ShiftRepository.getShiftDetail - Using superadmin access with tenant filter:', user_tenant_id);
            } else if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
                console.log('ℹ️ ShiftRepository.getShiftDetail - Using regular user access with tenant filter:', user_tenant_id);
            } else {
                console.log('ℹ️ ShiftRepository.getShiftDetail - No tenant filter applied (no user_tenant_id provided)');
            }

            const shift = await Shift.findOne({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'employee_shift',
                        attributes: ['id', 'name', 'email', 'phone']
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: Expense,
                        as: 'expenses',
                        attributes: ['id', 'name', 'amount', 'description', 'receipt', 'createdAt', 'finance_account_id'],
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
                        ],
                        where: user_tenant_id ? {
                            tenant_id: user_tenant_id
                        } : {},
                        required: false,
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });

            if (!shift) {
                console.log('❌ ShiftRepository.getShiftDetail - Shift not found');
                return null;
            }

            console.log('✅ ShiftRepository.getShiftDetail - Shift found with expenses:', shift.expenses?.length || 0);
            console.log('🔍 ShiftRepository.getShiftDetail - Shift data:', {
                id: shift.id,
                tenant_id: shift.tenant_id,
                branch_id: shift.branch_id,
                start_time: shift.start_time,
                end_time: shift.end_time
            });

            // Calculate shift statistics dengan tenant_id dan branch_id
            const calculateShiftData = await ShiftRepository.calculateData(shift.start_time, shift.end_time || new Date(), shift.id, shift.tenant_id, shift.branch_id);

            console.log('🔍 ShiftRepository.getShiftDetail - calculateShiftData keys:', Object.keys(calculateShiftData));
            console.log('🔍 ShiftRepository.getShiftDetail - account_breakdown from calculateShiftData:', calculateShiftData.account_breakdown);
            
            // 🔍 Debug expenses dari shift
            if (shift && shift.expenses) {
                console.log('🔍 Debug shift.expenses count:', shift.expenses.length);
                shift.expenses.forEach((expense, index) => {
                    console.log(`🔍 Shift Expense ${index + 1}:`, {
                        id: expense.id,
                        name: expense.name,
                        finance_account_id: expense.finance_account_id,
                        has_finance_account: !!expense.finance_account,
                        finance_account: expense.finance_account ? {
                            id: expense.finance_account.id,
                            name: expense.finance_account.name,
                            has_payment_method: !!expense.finance_account.payment_method,
                            payment_method_code: expense.finance_account.payment_method?.code
                        } : null
                    });
                });
            }

            // Calculate correct difference: Kas Akhir - (Kas Awal + Revenue Cash - Pengeluaran Cash)
            const cashInitial = parseFloat(shift.cash_initial || 0);
            const cashActual = parseFloat(shift.cash_actual || 0);
            const cashExpected = parseFloat(calculateShiftData.cash_expected || 0);
            const totalExpenses = parseFloat(calculateShiftData.total_expenses || 0);

            // Selisih = Kas Akhir - (Kas Awal + Revenue Cash - Pengeluaran Cash)
            const correctDifference = cashActual - (cashInitial + cashExpected - totalExpenses);

            const shiftDetail = {
                id: shift.id,
                employee_id: shift.employee_id,
                branch_id: shift.branch_id,
                start_time: shift.start_time,
                end_time: shift.end_time,
                sales: calculateShiftData.total_revenue, // Use calculated revenue instead of stored sales
                cash_initial: shift.cash_initial,
                cash_expected: calculateShiftData.cash_expected, // Use calculated cash_expected
                cash_actual: shift.cash_actual,
                bank_transfer: calculateShiftData.bank_transfer, // Use calculated bank_transfer
                qris: calculateShiftData.qris, // Use calculated qris
                transaction: calculateShiftData.transaction,
                delivery: shift.delivery,
                item: calculateShiftData.item,
                service: calculateShiftData.service,
                difference: correctDifference.toFixed(2), // Use correct difference calculation
                paid: calculateShiftData.paid,
                unpaid: calculateShiftData.unpaid,
                expense: calculateShiftData.total_expenses, // Use calculated total_expenses
                createdAt: shift.createdAt,
                updatedAt: shift.updatedAt,
                employee_shift: shift.employee_shift,
                branch: shift.branch,
                expenses: shift.expenses || [],
                // ✅ Cash-focused calculated data
                cash_inflow: calculateShiftData.cash_inflow,    // ✅ Uang masuk cash
                cash_outflow: calculateShiftData.cash_outflow,  // ✅ Uang keluar cash
                cash_balance: parseFloat(shift.cash_initial || 0) + parseFloat(calculateShiftData.cash_inflow || 0) - parseFloat(calculateShiftData.cash_outflow || 0), // ✅ Saldo akhir cash
                
                // Other calculated data
                total_revenue: calculateShiftData.total_revenue,
                total_expenses: calculateShiftData.total_expenses,
                dp: calculateShiftData.dp,
                account_breakdown: calculateShiftData.account_breakdown || {}
            };

            return shiftDetail;
        } catch (error) {
            console.error('❌ ShiftRepository.getShiftDetail - Error:', error.message);
            throw new Error(error.message);
        }
    }
};

module.exports = ShiftRepository;