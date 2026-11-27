const { FinanceTransaction, FinanceCategory, FinanceAccount, PaymentDetail, Payment, Order, Customer, Expense, Op, sequelize } = require('../models');
const moment = require('moment');

class FinanceRepository {
    static async getDailyTransactions(filters = {}) {
        try {
            const { date, type, startDate, endDate, period, page = 1, limit = 20, tenant_id, branch_id } = filters;

            let whereClause = {};

            // Add tenant_id and branch_id filters
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }
            let includeClause = [
                {
                    model: FinanceCategory,
                    as: 'finance_category',
                    attributes: ['name', 'type'],
                    where: {}
                },
                {
                    model: FinanceAccount,
                    as: 'finance_account',
                    attributes: ['name'], // ✅ Keep only name - payment_method accessed via include
                    include: [
                        {
                            model: require('../models').PaymentMethod,
                            as: 'payment_method',
                            attributes: ['id', 'name', 'code', 'icon']
                        }
                    ]
                }
            ];

            // Filter by type (income/expense/all)
            if (type && type !== 'all') {
                // Map frontend type to database type
                let categoryType;
                if (type === 'income') {
                    categoryType = 'credit';
                } else if (type === 'expense') {
                    categoryType = 'debit';
                }

                if (categoryType) {
                    includeClause[0].where.type = categoryType;
                }
            }

            console.log('=== FILTER DEBUG ===');
            console.log('Type filter:', type);
            console.log('Where clause:', JSON.stringify(whereClause, null, 2));

            // Filter by period
            if (period === 'monthly' && date) {
                // For monthly, date should be in format YYYY-MM
                const startOfMonth = moment(date).startOf('month');
                const endOfMonth = moment(date).endOf('month');

                whereClause.date = {
                    [Op.between]: [
                        startOfMonth.toDate(),
                        endOfMonth.toDate()
                    ]
                };
            } else if (period === 'weekly' && date) {
                // For weekly, calculate start and end of week from the given date
                const startOfWeek = moment(date).startOf('week');
                const endOfWeek = moment(date).endOf('week');

                whereClause.date = {
                    [Op.between]: [
                        startOfWeek.toDate(),
                        endOfWeek.toDate()
                    ]
                };
            } else if (date) {
                // For daily, use specific date
                whereClause.date = {
                    [Op.between]: [
                        moment(date).startOf('day').toDate(),
                        moment(date).endOf('day').toDate()
                    ]
                };
            }

            // Add source details based on transaction type
            const incomeInclude = {
                model: PaymentDetail,
                as: 'payment_details',
                include: [
                    {
                        model: Payment,
                        include: [
                            {
                                model: Order,
                                as: 'order',
                                include: [
                                    {
                                        model: Customer,
                                        as: 'customer',
                                        attributes: ['id', 'name', 'phone']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const expenseInclude = {
                model: Expense,
                as: 'expenses',
                attributes: ['id', 'name', 'amount', 'description', 'finance_account_id']
            };

            // Add source includes conditionally
            // For income transactions, we need to include PaymentDetail but make it optional
            if (!type || type === 'all' || type === 'income') {
                includeClause.push({
                    ...incomeInclude,
                    required: false // Make it LEFT JOIN instead of INNER JOIN
                });
            }
            if (!type || type === 'all' || type === 'expense') {
                includeClause.push({
                    ...expenseInclude,
                    required: false // Make it LEFT JOIN instead of INNER JOIN
                });
            }


            // Get total count for pagination - simplify the count query
            const totalCount = await FinanceTransaction.count({
                where: whereClause,
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: [],
                        where: (() => {
                            if (type && type !== 'all') {
                                if (type === 'income') return { type: 'credit' };
                                if (type === 'expense') return { type: 'debit' };
                            }
                            return {};
                        })()
                    }
                ]
            });

            // Calculate pagination
            const offset = (page - 1) * limit;
            const totalPages = Math.ceil(totalCount / limit);


            // Simplify the main query to match the count query
            const result = await FinanceTransaction.findAll({
                where: whereClause,
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: ['name', 'type'], // ✅ FinanceCategory has name and type columns
                        where: (() => {
                            if (type && type !== 'all') {
                                if (type === 'income') return { type: 'credit' };
                                if (type === 'expense') return { type: 'debit' };
                            }
                            return {};
                        })()
                    },
                    ...includeClause, // Add the source includes
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['name'], // ✅ FinanceAccount only has name, balance, description, etc. - NO 'type' column
                        include: [
                            {
                                model: require('../models').PaymentMethod,
                                as: 'payment_method',
                                attributes: ['id', 'name', 'code', 'icon']
                            }
                        ]
                    },
                    // Always include PaymentDetail and Expense, but make them optional
                    {
                        model: PaymentDetail,
                        as: 'payment_details',
                        required: false,
                        include: [
                            {
                                model: Payment,
                                required: false,
                                include: [
                                    {
                                        model: Order,
                                        as: 'order',
                                        required: false,
                                        include: [
                                            {
                                                model: Customer,
                                                as: 'customer',
                                                attributes: ['id', 'name', 'phone']
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: Expense,
                        as: 'expenses',
                        required: false,
                        attributes: ['id', 'name', 'amount', 'description', 'finance_account_id']
                    }
                ],
                order: [['date', 'DESC']],
                limit: parseInt(limit),
                offset: offset
            });



            return {
                transactions: result,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDailySummary(filters = {}) {
        try {
            const { date, startDate, endDate, period, tenant_id, branch_id, is_active, filter_info } = filters;

            let whereClause = {};

            // Add tenant_id and branch_id filters
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Filter by period
            if (period === 'monthly' && date) {
                // For monthly, date should be in format YYYY-MM
                const startOfMonth = moment(date).startOf('month');
                const endOfMonth = moment(date).endOf('month');

                whereClause.date = {
                    [Op.between]: [
                        startOfMonth.toDate(),
                        endOfMonth.toDate()
                    ]
                };
            } else if (period === 'weekly' && date) {
                // For weekly, calculate start and end of week from the given date
                const startOfWeek = moment(date).startOf('week');
                const endOfWeek = moment(date).endOf('week');

                whereClause.date = {
                    [Op.between]: [
                        startOfWeek.toDate(),
                        endOfWeek.toDate()
                    ]
                };
            } else if (date) {
                // For daily, use specific date
                whereClause.date = {
                    [Op.between]: [
                        moment(date).startOf('day').toDate(),
                        moment(date).endOf('day').toDate()
                    ]
                };
            }

            // Get income transactions
            const incomeResult = await FinanceTransaction.findAll({
                where: {
                    ...whereClause
                },
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        where: { type: 'credit' },
                        attributes: []
                    }
                ],
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('finance_transactions.final_amount')), 'total_income'],
                    [sequelize.fn('COUNT', sequelize.col('finance_transactions.id')), 'count']
                ],
                raw: true
            });

            // Get expense transactions
            const expenseResult = await FinanceTransaction.findAll({
                where: {
                    ...whereClause
                },
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        where: { type: 'debit' },
                        attributes: []
                    }
                ],
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('finance_transactions.final_amount')), 'total_expense'],
                    [sequelize.fn('COUNT', sequelize.col('finance_transactions.id')), 'count']
                ],
                raw: true
            });

            const totalIncome = parseFloat(incomeResult[0]?.total_income || 0);
            const totalExpense = parseFloat(expenseResult[0]?.total_expense || 0);
            const profit = totalIncome - totalExpense;
            const profitPercentage = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

            // Get finance accounts with current balances
            const financeAccountsWhere = {
                tenant_id: tenant_id,
                is_active: is_active !== undefined ? is_active : true
            };

            // Apply branch filter if branch_id is provided
            if (branch_id) {
                financeAccountsWhere[Op.or] = [
                    { branch_id: branch_id },      // Branch-specific accounts
                    { branch_id: { [Op.is]: null } }, // Global accounts (no specific branch)
                    { is_global: true }            // Global accounts (explicitly marked)
                ];
            }

            const financeAccounts = await FinanceAccount.findAll({
                where: financeAccountsWhere,
                include: [
                    {
                        model: require('../models').PaymentMethod,
                        as: 'payment_method',
                        attributes: ['id', 'name', 'code', 'type', 'icon']
                    }
                ],
                attributes: ['id', 'name', 'balance', 'description', 'branch_id', 'is_global'],
                order: [['name', 'ASC']]
            });

            // Transform finance accounts data
            const accountsData = financeAccounts.map(account => ({
                id: account.id,
                name: account.name,
                balance: parseFloat(account.balance || 0),
                description: account.description,
                branch_id: account.branch_id,
                is_global: account.is_global,
                payment_method: account.payment_method ? {
                    id: account.payment_method.id,
                    name: account.payment_method.name,
                    code: account.payment_method.code,
                    type: account.payment_method.type,
                    icon: account.payment_method.icon
                } : null
            }));

            // Get branch name if specific branch filter is applied
            let branch_name = null;
            if (filter_info && filter_info.is_specific_branch && branch_id) {
                const branch = await require('../models').Branch.findOne({
                    where: { id: branch_id, tenant_id: tenant_id },
                    attributes: ['name']
                });
                branch_name = branch ? branch.name : 'Unknown Branch';
            }

            // Debug logging
            console.log('=== DAILY SUMMARY DEBUG ===');
            console.log('Filters:', filters);
            console.log('Where clause:', JSON.stringify(whereClause, null, 2));
            console.log('Income result:', JSON.stringify(incomeResult, null, 2));
            console.log('Expense result:', JSON.stringify(expenseResult, null, 2));
            console.log('Finance accounts:', accountsData.length, 'accounts');
            console.log('Calculated values:', {
                totalIncome,
                totalExpense,
                profit,
                profitPercentage
            });

            return {
                total_income: totalIncome,
                total_expense: totalExpense,
                profit: profit,
                profit_percentage: Math.round(profitPercentage * 100) / 100,
                transaction_count: {
                    income: parseInt(incomeResult[0]?.count || 0),
                    expense: parseInt(expenseResult[0]?.count || 0)
                },
                finance_accounts: accountsData,
                filter_info: {
                    ...filter_info,
                    branch_name: branch_name,
                    description: filter_info && filter_info.is_all_branches
                        ? 'Menampilkan semua akun keuangan (global + semua cabang)'
                        : `Menampilkan akun global + akun ${branch_name || 'cabang spesifik'}`
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getTransactionDetail(transactionId) {
        try {
            // First, let's get the basic transaction data
            const result = await FinanceTransaction.findOne({
                where: { id: transactionId },
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: ['name', 'type'] // ✅ Remove PaymentMethod include - FinanceCategory has no association with PaymentMethod
                    },
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['name'], // ✅ FinanceAccount only has name, balance, description, etc. - NO 'type' column
                        include: [
                            {
                                model: require('../models').PaymentMethod,
                                as: 'payment_method',
                                attributes: ['id', 'name', 'code', 'icon']
                            }
                        ]
                    },
                    {
                        model: PaymentDetail,
                        as: 'payment_details',
                        include: [
                            {
                                model: Payment,
                                include: [
                                    {
                                        model: Order,
                                        as: 'order',
                                        include: [
                                            {
                                                model: Customer,
                                                as: 'customer',
                                                attributes: ['id', 'name', 'phone']
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: Expense,
                        as: 'expenses',
                        attributes: ['id', 'name', 'amount', 'description', 'finance_account_id']
                    }
                ]
            });

            // Debug: Log the raw result to see what we're getting
            console.log('Raw transaction result:', JSON.stringify(result, null, 2));

            // Alternative: Let's also check if PaymentDetail exists for this transaction
            const paymentDetails = await PaymentDetail.findAll({
                where: { transaction_id: transactionId },
                include: [
                    {
                        model: Payment,
                        include: [
                            {
                                model: Order,
                                as: 'order',
                                include: [
                                    {
                                        model: Customer,
                                        as: 'customer',
                                        attributes: ['id', 'name', 'phone']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            console.log('PaymentDetails for transaction:', JSON.stringify(paymentDetails, null, 2));

            // Let's also check the structure of payment_details in the main result
            if (result && result.payment_details) {
                console.log('Payment details in main result:', JSON.stringify(result.payment_details, null, 2));
                console.log('Payment details length:', result.payment_details.length);

                if (result.payment_details.length > 0) {
                    const firstPaymentDetail = result.payment_details[0];
                    console.log('First payment detail structure:', Object.keys(firstPaymentDetail));
                    console.log('Payment in first payment detail:', firstPaymentDetail.Payment);
                }
            }

            // If no PaymentDetail found, let's check if this transaction is actually an income transaction
            if (!result.payment_details || result.payment_details.length === 0) {
                console.log('No PaymentDetail found for transaction:', transactionId);
                console.log('Transaction category type:', result.finance_category?.type);

                // Check if this is actually an income transaction
                if (result.finance_category?.type === 'credit') {
                    console.log('This is an income transaction but no PaymentDetail found');

                    // Let's check if there's a PaymentDetail with this transaction_id
                    const directPaymentDetail = await PaymentDetail.findOne({
                        where: { transaction_id: transactionId }
                    });

                    if (directPaymentDetail) {
                        console.log('Found PaymentDetail directly:', directPaymentDetail.id);
                    } else {
                        console.log('No PaymentDetail found with transaction_id:', transactionId);
                    }
                }
            }

            // If we have payment details from the separate query, use that instead
            if (paymentDetails && paymentDetails.length > 0) {
                // Merge the payment details into the result
                result.payment_details = paymentDetails;
                console.log('Merged payment details:', JSON.stringify(result.payment_details, null, 2));
            }

            return result;
        } catch (error) {
            console.error('Error in getTransactionDetail:', error);
            throw new Error(error.message);
        }
    }

    static async getAccountSummary(filters = {}) {
        try {
            const { date, startDate, endDate, period, type, tenant_id, branch_id } = filters;

            let whereClause = {};

            // Add tenant_id and branch_id filters
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Filter by period
            if (period === 'monthly' && date) {
                // For monthly, date should be in format YYYY-MM
                const startOfMonth = moment(date).startOf('month');
                const endOfMonth = moment(date).endOf('month');

                whereClause.date = {
                    [Op.between]: [
                        startOfMonth.toDate(),
                        endOfMonth.toDate()
                    ]
                };
            } else if (period === 'weekly' && date) {
                // For weekly, calculate start and end of week from the given date
                const startOfWeek = moment(date).startOf('week');
                const endOfWeek = moment(date).endOf('week');

                whereClause.date = {
                    [Op.between]: [
                        startOfWeek.toDate(),
                        endOfWeek.toDate()
                    ]
                };
            } else if (period === 'daily' && date) {
                // For daily, filter by specific date
                const startOfDay = moment(date).startOf('day');
                const endOfDay = moment(date).endOf('day');

                whereClause.date = {
                    [Op.between]: [
                        startOfDay.toDate(),
                        endOfDay.toDate()
                    ]
                };
            } else if (startDate && endDate) {
                // Custom date range
                whereClause.date = {
                    [Op.between]: [
                        moment(startDate).startOf('day').toDate(),
                        moment(endDate).endOf('day').toDate()
                    ]
                };
            }

            // Build include clause for category filtering
            let includeClause = [
                {
                    model: FinanceCategory,
                    as: 'finance_category',
                    attributes: ['name', 'type'],
                    where: {}
                },
                {
                    model: FinanceAccount,
                    as: 'finance_account',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: require('../models').PaymentMethod,
                            as: 'payment_method',
                            attributes: ['id', 'name', 'code', 'icon']
                        }
                    ]
                }
            ];

            // Filter by type (income/expense/all)
            if (type && type !== 'all') {
                // Map frontend type to database type
                let categoryType;
                if (type === 'income') {
                    categoryType = 'credit';
                } else if (type === 'expense') {
                    categoryType = 'debit';
                }

                if (categoryType) {
                    includeClause[0].where.type = categoryType;
                }
            }

            // Build the raw SQL query for better control
            let sqlQuery = `
                SELECT 
                    ft.account_id,
                    fa.name as account_name,
                    pm.name as payment_method_name,
                    SUM(ft.final_amount) as total_amount,
                    COUNT(ft.id) as transaction_count
                FROM finance_transactions ft
                JOIN finance_categories fc ON ft.category_id = fc.id
                JOIN finance_accounts fa ON ft.account_id = fa.id
                LEFT JOIN payment_methods pm ON fa.payment_method_id = pm.id
                WHERE ft.deletedAt IS NULL
            `;

            const queryParams = [];

            // Add tenant_id filter
            if (tenant_id) {
                sqlQuery += ` AND ft.tenant_id = ?`;
                queryParams.push(tenant_id);
            }

            // Add branch_id filter
            if (branch_id) {
                sqlQuery += ` AND ft.branch_id = ?`;
                queryParams.push(branch_id);
            }

            // Add type filter
            if (type && type !== 'all') {
                let categoryType;
                if (type === 'income') {
                    categoryType = 'credit';
                } else if (type === 'expense') {
                    categoryType = 'debit';
                }

                if (categoryType) {
                    sqlQuery += ` AND fc.type = ?`;
                    queryParams.push(categoryType);
                }
            }

            // Add date filter
            if (period === 'monthly' && date) {
                const startOfMonth = moment(date).startOf('month').format('YYYY-MM-DD');
                const endOfMonth = moment(date).endOf('month').format('YYYY-MM-DD');
                sqlQuery += ` AND DATE(ft.date) BETWEEN ? AND ?`;
                queryParams.push(startOfMonth, endOfMonth);
            } else if (period === 'weekly' && date) {
                const startOfWeek = moment(date).startOf('week').format('YYYY-MM-DD');
                const endOfWeek = moment(date).endOf('week').format('YYYY-MM-DD');
                sqlQuery += ` AND DATE(ft.date) BETWEEN ? AND ?`;
                queryParams.push(startOfWeek, endOfWeek);
            } else if (period === 'daily' && date) {
                sqlQuery += ` AND DATE(ft.date) = ?`;
                queryParams.push(moment(date).format('YYYY-MM-DD'));
            } else if (startDate && endDate) {
                sqlQuery += ` AND DATE(ft.date) BETWEEN ? AND ?`;
                queryParams.push(moment(startDate).format('YYYY-MM-DD'), moment(endDate).format('YYYY-MM-DD'));
            }

            sqlQuery += ` GROUP BY ft.account_id, fa.id, fa.name, pm.name ORDER BY total_amount DESC`;

            // Execute raw query
            const result = await sequelize.query(sqlQuery, {
                replacements: queryParams,
                type: sequelize.QueryTypes.SELECT
            });

            // Transform the result
            const accountSummary = result.map(item => ({
                account_id: item.account_id,
                account_name: item.account_name || 'Unknown Account',
                payment_method_name: item.payment_method_name || 'Unknown Method',
                total_amount: parseFloat(item.total_amount) || 0,
                transaction_count: parseInt(item.transaction_count) || 0
            }));

            return accountSummary;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAccountSummaryCounts(filters = {}) {
        try {
            const { date, startDate, endDate, period, type, tenant_id, branch_id } = filters;

            // Build the raw SQL query for counts only
            let sqlQuery = `
                SELECT 
                    pm.name as payment_method_name,
                    COUNT(ft.id) as transaction_count
                FROM finance_transactions ft
                JOIN finance_categories fc ON ft.category_id = fc.id
                JOIN finance_accounts fa ON ft.account_id = fa.id
                LEFT JOIN payment_methods pm ON fa.payment_method_id = pm.id
                WHERE ft.deletedAt IS NULL
            `;

            const queryParams = [];

            // Add tenant_id filter
            if (tenant_id) {
                sqlQuery += ` AND ft.tenant_id = ?`;
                queryParams.push(tenant_id);
            }

            // Add branch_id filter
            if (branch_id) {
                sqlQuery += ` AND ft.branch_id = ?`;
                queryParams.push(branch_id);
            }

            // Add type filter
            if (type && type !== 'all') {
                let categoryType;
                if (type === 'income') {
                    categoryType = 'credit';
                } else if (type === 'expense') {
                    categoryType = 'debit';
                }

                if (categoryType) {
                    sqlQuery += ` AND fc.type = ?`;
                    queryParams.push(categoryType);
                }
            }

            // Add date filter
            if (period === 'monthly' && date) {
                const startOfMonth = moment(date).startOf('month').format('YYYY-MM-DD');
                const endOfMonth = moment(date).endOf('month').format('YYYY-MM-DD');
                sqlQuery += ` AND DATE(ft.date) BETWEEN ? AND ?`;
                queryParams.push(startOfMonth, endOfMonth);
            } else if (period === 'weekly' && date) {
                const startOfWeek = moment(date).startOf('week').format('YYYY-MM-DD');
                const endOfWeek = moment(date).endOf('week').format('YYYY-MM-DD');
                sqlQuery += ` AND DATE(ft.date) BETWEEN ? AND ?`;
                queryParams.push(startOfWeek, endOfWeek);
            } else if (period === 'daily' && date) {
                sqlQuery += ` AND DATE(ft.date) = ?`;
                queryParams.push(moment(date).format('YYYY-MM-DD'));
            } else if (startDate && endDate) {
                sqlQuery += ` AND DATE(ft.date) BETWEEN ? AND ?`;
                queryParams.push(moment(startDate).format('YYYY-MM-DD'), moment(endDate).format('YYYY-MM-DD'));
            }

            sqlQuery += ` GROUP BY fa.id, fa.name ORDER BY fa.name`;

            // Execute raw query
            const result = await sequelize.query(sqlQuery, {
                replacements: queryParams,
                type: sequelize.QueryTypes.SELECT
            });

            // Transform the result to counts object
            const counts = {
                all: 0,
                qris: 0,
                bank: 0,
                cash: 0
            };

            result.forEach(item => {
                const count = parseInt(item.transaction_count) || 0;
                counts.all += count;

                // Use payment method name instead of account type
                if (item.payment_method_name) {
                    const methodName = item.payment_method_name.toLowerCase();
                    if (methodName.includes('qris')) {
                        counts.qris += count;
                    } else if (methodName.includes('bank') || methodName.includes('transfer')) {
                        counts.bank += count;
                    } else if (methodName.includes('cash') || methodName.includes('tunai')) {
                        counts.cash += count;
                    }
                }
            });

            return counts;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getPeriods() {
        try {
            const today = moment();
            const periods = {
                daily: [],
                weekly: [],
                monthly: []
            };

            // Generate daily periods (last 30 days)
            for (let i = 0; i < 30; i++) {
                const date = moment().subtract(i, 'days');
                periods.daily.push({
                    date: date.format('YYYY-MM-DD'),
                    label: date.format('DD MMM YYYY')
                });
            }

            // Generate weekly periods (last 12 weeks)
            // Menggunakan logika yang konsisten dengan reportService.js
            for (let i = 0; i < 12; i++) {
                let startDate, endDate;

                if (i === 0) {
                    // Minggu saat ini
                    startDate = moment().startOf('week');
                    endDate = moment().endOf('week');
                } else {
                    // Minggu-minggu sebelumnya
                    startDate = moment().subtract(i, 'weeks').startOf('week');
                    endDate = moment().subtract(i, 'weeks').endOf('week');
                }

                periods.weekly.push({
                    week: i + 1,
                    start_date: startDate.format('YYYY-MM-DD'),
                    end_date: endDate.format('YYYY-MM-DD'),
                    label: `${startDate.format('DD MMM')} - ${endDate.format('DD MMM YYYY')}`
                });
            }

            // Generate monthly periods (last 12 months)
            for (let i = 0; i < 12; i++) {
                const date = moment().subtract(i, 'months');
                periods.monthly.push({
                    month: date.format('YYYY-MM'),
                    name: date.format('MMMM YYYY')
                });
            }

            return periods;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Financial Report Method
    static async getFinancialReport(filters = {}) {
        try {
            const { month, year, tenant_id, branch_id } = filters;

            // ✅ FIX v3: Use toDate() like getDailyTransactions for proper date comparison
            const startDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).startOf('month').toDate();
            const endDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month').toDate();

            // ✅ FIX v2: Filter by branch_id, then include global account transactions via account.is_global
            let whereClause = {
                tenant_id: tenant_id,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            };

            // 🔍 DEBUG LOG
            console.log('=== getFinancialReport DEBUG ===');
            console.log('Filters:', { month, year, tenant_id, branch_id });
            console.log('Date range (toDate):', { startDate, endDate });


            // ✅ FIX v4: Filter by finance_transaction.branch_id (bukan account.branch_id)
            // Ini memastikan transaksi difilter berdasarkan branch tempat transaksi dibuat,
            // bukan berdasarkan akun keuangan yang digunakan
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Get all transactions for the month
            const transactions = await FinanceTransaction.findAll({
                where: whereClause,
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: ['id', 'name', 'type']
                    },
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['id', 'name', 'is_global', 'branch_id'],
                        include: [
                            {
                                model: require('../models').PaymentMethod,
                                as: 'payment_method',
                                attributes: ['id', 'name', 'code', 'icon']
                            }
                        ]
                    }
                ],
                order: [['date', 'DESC']]
            });

            // 🔍 DEBUG LOG
            console.log('Total transactions found:', transactions.length);
            const creditTrans = transactions.filter(t => t.finance_category.type === 'credit');
            const debitTrans = transactions.filter(t => t.finance_category.type === 'debit');
            console.log('Credit (income):', creditTrans.length);
            console.log('Debit (expense):', debitTrans.length);
            console.log('Account is_global values:', [...new Set(transactions.map(t => t.finance_account?.is_global))]);


            // Get membership revenue data
            const membershipRevenue = await this.getMembershipRevenue(tenant_id, branch_id, startDate, endDate);

            // Filter out transfer internal transactions
            const realTransactions = transactions.filter(transaction =>
                transaction.finance_category.type !== 'neutral'
            );

            // Calculate summary (only real transactions)
            let totalIncome = 0;
            let totalExpense = 0;
            let incomeTransactions = 0;
            let expenseTransactions = 0;

            // Category breakdown
            const categoryMap = new Map();
            // Payment method breakdown
            const methodMap = new Map();

            realTransactions.forEach(transaction => {
                const amount = parseFloat(transaction.final_amount || 0);

                if (transaction.finance_category.type === 'credit') {
                    totalIncome += amount;
                    incomeTransactions++;
                } else if (transaction.finance_category.type === 'debit') {
                    totalExpense += amount;
                    expenseTransactions++;
                }

                // Category breakdown (only real transactions)
                const categoryId = transaction.finance_category.id;
                if (!categoryMap.has(categoryId)) {
                    categoryMap.set(categoryId, {
                        category_id: categoryId,
                        category_name: transaction.finance_category.name,
                        category_type: transaction.finance_category.type,
                        total_amount: 0,
                        transaction_count: 0
                    });
                }
                const category = categoryMap.get(categoryId);
                category.total_amount += amount;
                category.transaction_count++;

                // Payment method breakdown (only real transactions)
                const paymentMethod = transaction.finance_account.payment_method;
                if (paymentMethod) {
                    const methodId = paymentMethod.id;
                    if (!methodMap.has(methodId)) {
                        methodMap.set(methodId, {
                            payment_method_id: methodId,
                            payment_method_name: paymentMethod.name,
                            payment_method_code: paymentMethod.code,
                            total_amount: 0,
                            transaction_count: 0,
                            type: 'mixed'
                        });
                    }
                    const method = methodMap.get(methodId);
                    method.total_amount += amount;
                    method.transaction_count++;
                }
            });

            // Calculate percentages for categories (only real transactions)
            const totalRealAmount = totalIncome + totalExpense;
            const categoryBreakdown = Array.from(categoryMap.values()).map(category => ({
                ...category,
                percentage: totalRealAmount > 0 ? (category.total_amount / totalRealAmount) * 100 : 0
            }));

            // Calculate percentages for payment methods (only real transactions)
            const paymentMethodBreakdown = Array.from(methodMap.values()).map(method => ({
                ...method,
                percentage: totalRealAmount > 0 ? (method.total_amount / totalRealAmount) * 100 : 0
            }));

            // Get top transactions (only real transactions, exclude transfer internal)
            // NOTE: .slice() before .sort() to avoid mutating realTransactions order
            const topTransactions = realTransactions
                .slice()
                .sort((a, b) => parseFloat(b.final_amount || 0) - parseFloat(a.final_amount || 0))
                .slice(0, 5)
                .map(transaction => ({
                    id: transaction.id,
                    date: transaction.date,
                    description: transaction.description,
                    amount: parseFloat(transaction.amount || 0),
                    final_amount: parseFloat(transaction.final_amount || 0),
                    category: {
                        id: transaction.finance_category.id,
                        name: transaction.finance_category.name,
                        type: transaction.finance_category.type
                    },
                    account: {
                        id: transaction.finance_account.id,
                        name: transaction.finance_account.name
                    },
                    payment_method: {
                        id: transaction.finance_account.payment_method?.id,
                        name: transaction.finance_account.payment_method?.name,
                        code: transaction.finance_account.payment_method?.code
                    }
                }));

            // Get all expense transactions (only real transactions, exclude transfer internal)
            const expenseTransactionsList = realTransactions
                .filter(transaction => transaction.finance_category?.type === 'debit')
                .map(transaction => ({
                    id: transaction.id,
                    date: transaction.date,
                    description: transaction.description,
                    amount: parseFloat(transaction.amount || 0),
                    final_amount: parseFloat(transaction.final_amount || 0),
                    category: {
                        id: transaction.finance_category?.id,
                        name: transaction.finance_category?.name,
                        type: transaction.finance_category?.type
                    },
                    account: {
                        id: transaction.finance_account?.id,
                        name: transaction.finance_account?.name
                    },
                    payment_method: {
                        id: transaction.finance_account?.payment_method?.id,
                        name: transaction.finance_account?.payment_method?.name,
                        code: transaction.finance_account?.payment_method?.code
                    }
                }));

            const hppSummary = await this.getHppSummary(tenant_id, branch_id, startDate, endDate);

            return {
                period: {
                    month: `${year}-${month.toString().padStart(2, '0')}`,
                    year: year,
                    month_name: moment(`${year}-${month.toString().padStart(2, '0')}-01`).format('MMMM'),
                    start_date: startDate,
                    end_date: endDate
                },
                summary: {
                    total_income: totalIncome,
                    total_expense: totalExpense,
                    net_balance: totalIncome - totalExpense,
                    transaction_count: transactions.length,
                    income_transactions: incomeTransactions,
                    expense_transactions: expenseTransactions,
                    membership_revenue: membershipRevenue.total_revenue,
                    membership_count: membershipRevenue.total_members,
                    // Laba kotor dari sisi produk (omzet item − HPP). Angka ini murni
                    // analisa margin, TIDAK dikurangkan lagi dari net_balance karena
                    // pembelian bahan sudah tercatat sebagai pengeluaran (cash basis).
                    sales_revenue: hppSummary.total_revenue,
                    hpp_total: hppSummary.total_hpp,
                    gross_profit: hppSummary.gross_profit,
                    gross_margin_percent: hppSummary.gross_margin_percent,
                    hpp_is_estimated: hppSummary.is_estimated
                },
                hpp_breakdown: hppSummary,
                category_breakdown: categoryBreakdown,
                payment_method_breakdown: paymentMethodBreakdown,
                membership_breakdown: membershipRevenue.membership_breakdown,
                account_balances: await this.calculateAccountBalances(tenant_id, branch_id, startDate, endDate),
                monthly_trend: [], // Simplified for now
                daily_summary: [], // Simplified for now
                top_transactions: topTransactions,
                expense_transactions_list: expenseTransactionsList,
                comparison: {}, // Simplified for now
                metadata: {
                    generated_at: new Date().toISOString(),
                    tenant_id: tenant_id,
                    branch_id: branch_id,
                    currency: 'IDR',
                    data_accuracy: '100%'
                }
            };

        } catch (error) {
            throw new Error(`Failed to get financial report: ${error.message}`);
        }
    }

    static async calculateAccountBalances(tenant_id, branch_id, startDate, endDate) {
        try {
            const query = `
                SELECT 
                    fa.id as account_id,
                    fa.name as account_name,
                    fa.balance as current_balance,
                    0 as opening_balance,
                    fa.balance as monthly_change,
                    COUNT(ft.id) as transaction_count,
                    pm.id as payment_method_id,
                    pm.name as payment_method_name,
                    pm.code as payment_method_code
                FROM finance_accounts fa
                LEFT JOIN payment_methods pm ON fa.payment_method_id = pm.id
                LEFT JOIN finance_transactions ft ON fa.id = ft.account_id 
                    AND ft.tenant_id = :tenant_id 
                    AND (:branch_id IS NULL OR ft.branch_id = :branch_id)
                    AND ft.date BETWEEN :startDate AND :endDate
                    AND ft.deletedAt IS NULL
                    AND ft.category_id NOT IN (
                        SELECT id FROM finance_categories 
                        WHERE type = 'neutral' AND tenant_id = :tenant_id
                    )
                WHERE fa.tenant_id = :tenant_id 
                    AND (:branch_id IS NULL OR fa.branch_id = :branch_id OR fa.branch_id IS NULL)
                    AND fa.is_active = 1
                GROUP BY fa.id, fa.name, fa.balance, pm.id, pm.name, pm.code
                ORDER BY fa.balance DESC
            `;

            const results = await sequelize.query(query, {
                replacements: { tenant_id, branch_id, startDate, endDate },
                type: sequelize.QueryTypes.SELECT
            });

            return results.map(row => ({
                account_id: row.account_id,
                account_name: row.account_name,
                current_balance: parseFloat(row.current_balance || 0),
                opening_balance: parseFloat(row.opening_balance || 0),
                monthly_change: parseFloat(row.monthly_change || 0),
                transaction_count: parseInt(row.transaction_count || 0),
                payment_method: {
                    id: row.payment_method_id,
                    name: row.payment_method_name,
                    code: row.payment_method_code
                }
            }));

        } catch (error) {
            throw new Error(`Failed to calculate account balances: ${error.message}`);
        }
    }

    /**
     * Ringkasan HPP untuk Laporan Keuangan.
     *
     * Basis tanggal `orders.createdAt` (tanggal transaksi dibuat), bukan
     * `entry_date` dan bukan `finance_transactions.date`. Omzet di sini adalah
     * nilai jual item (`order_details.final_price`, sudah dipotong diskon item),
     * sehingga **tidak sama** dengan "Uang Masuk" yang berbasis kas.
     *
     * `cost_price` NULL = HPP belum diisi di katalog → item tetap dihitung
     * omzetnya tapi HPP-nya 0, dan jumlah item seperti itu dilaporkan lewat
     * `items_without_hpp` supaya angkanya tidak dipercaya mentah-mentah.
     */
    static async getHppSummary(tenant_id, branch_id, startDate, endDate) {
        try {
            const baseJoin = (extraJoin = '') => `
                FROM order_details od
                INNER JOIN orders o ON od.order_id = o.id
                ${extraJoin}
                WHERE o.tenant_id = :tenant_id
                  AND o.deletedAt IS NULL
                  AND od.deletedAt IS NULL
                  AND o.createdAt >= :startDate
                  AND o.createdAt < DATE_ADD(:endDate, INTERVAL 1 DAY)
                  AND (:branch_id IS NULL OR o.branch_id = :branch_id)
            `;

            const replacements = {
                tenant_id,
                branch_id,
                startDate: moment(startDate).format('YYYY-MM-DD'),
                endDate: moment(endDate).format('YYYY-MM-DD')
            };

            const totals = await sequelize.query(`
                SELECT
                    COALESCE(SUM(od.final_price), 0) AS total_revenue,
                    COALESCE(SUM(od.cost_price), 0) AS total_hpp,
                    COUNT(od.id) AS total_items,
                    SUM(CASE WHEN od.cost_price IS NULL THEN 1 ELSE 0 END) AS items_without_hpp
                ${baseJoin()}
            `, { replacements, type: sequelize.QueryTypes.SELECT });

            const row = totals[0] || {};
            const totalRevenue = parseFloat(row.total_revenue || 0);
            const totalHpp = parseFloat(row.total_hpp || 0);
            const totalItems = parseInt(row.total_items || 0);
            const itemsWithoutHpp = parseInt(row.items_without_hpp || 0);
            const grossProfit = totalRevenue - totalHpp;

            const byProduct = await sequelize.query(`
                SELECT
                    t.id AS treatment_id,
                    t.name AS treatment_name,
                    t.unit AS unit,
                    COUNT(od.id) AS qty,
                    COALESCE(SUM(od.final_price), 0) AS revenue,
                    COALESCE(SUM(od.cost_price), 0) AS hpp,
                    SUM(CASE WHEN od.cost_price IS NULL THEN 1 ELSE 0 END) AS items_without_hpp
                ${baseJoin('INNER JOIN treatment t ON od.treatment_id = t.id')}
                GROUP BY t.id, t.name, t.unit
                ORDER BY revenue DESC
                LIMIT 20
            `, { replacements, type: sequelize.QueryTypes.SELECT });

            return {
                total_revenue: totalRevenue,
                total_hpp: totalHpp,
                gross_profit: grossProfit,
                gross_margin_percent: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
                total_items: totalItems,
                items_without_hpp: itemsWithoutHpp,
                is_estimated: itemsWithoutHpp > 0,
                by_product: byProduct.map((item) => {
                    const revenue = parseFloat(item.revenue || 0);
                    const hpp = parseFloat(item.hpp || 0);
                    return {
                        treatment_id: item.treatment_id,
                        treatment_name: item.treatment_name,
                        unit: item.unit,
                        qty: parseInt(item.qty || 0),
                        revenue,
                        hpp,
                        gross_profit: revenue - hpp,
                        gross_margin_percent: revenue > 0 ? ((revenue - hpp) / revenue) * 100 : 0,
                        items_without_hpp: parseInt(item.items_without_hpp || 0)
                    };
                })
            };
        } catch (error) {
            throw new Error(`Failed to get HPP summary: ${error.message}`);
        }
    }

    /**
     * Uang Masuk per cabang — dibaca dari BUKU BESAR (`finance_transactions`),
     * definisinya sengaja dibuat sama dengan kartu "Uang Masuk" di
     * Laporan Keuangan owner (`getFinancialReport` / `getDailySummary`):
     *
     *   SUM(finance_transactions.final_amount)
     *   WHERE finance_categories.type = 'credit'
     *
     * Kategori 'neutral' (transfer antar akun internal) bukan uang masuk baru,
     * kategori 'debit' = uang keluar → keduanya otomatis tidak terhitung karena
     * hanya 'credit' yang diambil. Sumber angkanya sudah termasuk DP/termin,
     * pembayaran membership, dan pendapatan di luar order.
     *
     * ⚠️ Basis tanggal `finance_transactions.date` (tanggal uang diterima), BUKAN
     *    `orders.entry_date`. Kolom ini bertipe DATETIME, jadi ujung periode dibuat
     *    eksklusif (`< endDate + 1 hari`) supaya transaksi di hari terakhir periode
     *    tetap ikut terhitung.
     *
     * @param {number} tenant_id
     * @param {string} startDate format YYYY-MM-DD
     * @param {string} endDate   format YYYY-MM-DD
     * @returns {Promise<Object>} { [branch_id]: nominal }
     */
    static async getCashInByBranch(tenant_id, startDate, endDate) {
        try {
            const cashInQuery = `
                SELECT
                    ft.branch_id,
                    COALESCE(SUM(ft.final_amount), 0) AS cash_in
                FROM finance_transactions ft
                INNER JOIN finance_categories fc ON ft.category_id = fc.id
                WHERE ft.tenant_id = :tenant_id
                AND ft.date >= :startDate
                AND ft.date < DATE_ADD(:endDate, INTERVAL 1 DAY)
                AND ft.deletedAt IS NULL
                AND fc.type = 'credit'
                GROUP BY ft.branch_id
            `;

            const results = await sequelize.query(cashInQuery, {
                replacements: { tenant_id, startDate, endDate },
                type: sequelize.QueryTypes.SELECT
            });

            const cashInByBranch = {};
            results.forEach((row) => {
                // Transaksi tanpa cabang tidak bisa dipetakan ke cabang mana pun
                if (row.branch_id === null || row.branch_id === undefined) return;
                cashInByBranch[row.branch_id] = parseFloat(row.cash_in || 0);
            });

            return cashInByBranch;
        } catch (error) {
            throw new Error(`Failed to get cash in by branch: ${error.message}`);
        }
    }

    /**
     * Get membership revenue data for financial report
     */
    static async getMembershipRevenue(tenant_id, branch_id, startDate, endDate) {
        try {
            const { CustomerMembership, Membership, Payment, sequelize } = require('../models');

            let branchCondition = '';
            let branchParams = {};

            if (branch_id) {
                branchCondition = 'AND cm.branch_id = :branch_id';
                branchParams.branch_id = branch_id;
            }

            const membershipRevenueQuery = `
                SELECT 
                    m.id as membership_id,
                    m.name as membership_name,
                    m.price as membership_price,
                    COUNT(cm.id) as total_members,
                    COALESCE(SUM(p.final_price), 0) as total_revenue,
                    COUNT(CASE WHEN cm.status = 'active' THEN 1 END) as active_members
                FROM customer_memberships cm
                INNER JOIN memberships m ON cm.membership_id = m.id
                LEFT JOIN payments p ON cm.payment_id = p.id
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

            const results = await sequelize.query(membershipRevenueQuery, {
                replacements: params,
                type: sequelize.QueryTypes.SELECT
            });

            // Calculate total membership revenue
            const totalMembershipRevenue = results.reduce((sum, item) => sum + parseFloat(item.total_revenue || 0), 0);
            const totalMembershipCount = results.reduce((sum, item) => sum + parseInt(item.total_members || 0), 0);

            return {
                total_revenue: totalMembershipRevenue,
                total_members: totalMembershipCount,
                membership_breakdown: results.map(membership => ({
                    membership_id: membership.membership_id,
                    membership_name: membership.membership_name,
                    membership_price: parseFloat(membership.membership_price || 0),
                    total_members: parseInt(membership.total_members || 0),
                    total_revenue: parseFloat(membership.total_revenue || 0),
                    active_members: parseInt(membership.active_members || 0)
                }))
            };

        } catch (error) {
            console.error('Error getting membership revenue:', error);
            return {
                total_revenue: 0,
                total_members: 0,
                membership_breakdown: []
            };
        }
    }
}

module.exports = FinanceRepository;
