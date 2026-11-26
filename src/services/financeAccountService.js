const FinanceAccountRepository = require('../repositories/financeAccountRepository');
const { FinanceAccount, FinanceTransaction, FinanceCategory, Op } = require('../models');

const moment = require('moment');

class FinanceAccountService {
    static async create(name, balance, description, tenant_id, branch_id = null, is_active = true, payment_method_id = null, requires_payment_proof = false) {
        try {
            // ✅ Validasi: Cek apakah sudah ada finance account dengan payment method cash di cabang yang sama
            if (payment_method_id) {
                // Ambil payment method untuk cek apakah ini adalah cash
                const { PaymentMethod } = require('../models');
                const paymentMethod = await PaymentMethod.findByPk(payment_method_id);

                if (paymentMethod && paymentMethod.code === 'cash') {
                    console.log('🔍 FinanceAccountService.create - Checking for existing cash account in branch:', branch_id);

                    // Cek apakah sudah ada finance account dengan payment method cash di cabang yang sama
                    const existingCashAccount = await FinanceAccount.findOne({
                        where: {
                            tenant_id: tenant_id,
                            branch_id: branch_id,
                            payment_method_id: payment_method_id,
                            is_active: true
                        }
                    });

                    if (existingCashAccount) {
                        console.error('❌ FinanceAccountService.create - Cash account already exists for this branch:', {
                            existing_account_id: existingCashAccount.id,
                            existing_account_name: existingCashAccount.name,
                            branch_id: branch_id,
                            payment_method_id: payment_method_id
                        });
                        throw new Error(`Sudah ada akun keuangan dengan metode pembayaran cash untuk cabang ini. Akun yang sudah ada: ${existingCashAccount.name}`);
                    }

                    console.log('✅ FinanceAccountService.create - No existing cash account found, proceeding with creation');
                }
            }

            const financeAccount = await FinanceAccountRepository.create(name, balance, description, tenant_id, branch_id, is_active, payment_method_id, requires_payment_proof);

            return financeAccount;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id, branch_id = null, is_active = true) {
        try {
            console.log('🔍 FinanceAccountService.getAll - Parameters:', { tenant_id, branch_id, is_active });

            const financeAccounts = await FinanceAccountRepository.getAll(tenant_id, branch_id, is_active);

            console.log('✅ FinanceAccountService.getAll - Repository returned:', financeAccounts.length, 'accounts');

            return financeAccounts;
        } catch (error) {
            console.error('❌ FinanceAccountService.getAll - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id, branch_id = null) {
        try {
            const financeAccount = await FinanceAccountRepository.getById(id, tenant_id, branch_id);

            return financeAccount;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, name, balance, description, tenant_id, branch_id = null, is_active = true, payment_method_id = null, requires_payment_proof = false) {
        try {
            // ✅ Validasi: Cek apakah sudah ada finance account dengan payment method cash di cabang yang sama (kecuali akun yang sedang diupdate)
            if (payment_method_id) {
                // Ambil payment method untuk cek apakah ini adalah cash
                const { PaymentMethod } = require('../models');
                const paymentMethod = await PaymentMethod.findByPk(payment_method_id);

                if (paymentMethod && paymentMethod.code === 'cash') {
                    console.log('🔍 FinanceAccountService.update - Checking for existing cash account in branch:', branch_id);

                    // Cek apakah sudah ada finance account dengan payment method cash di cabang yang sama (kecuali akun yang sedang diupdate)
                    const existingCashAccount = await FinanceAccount.findOne({
                        where: {
                            id: { [Op.ne]: id }, // Exclude current account being updated
                            tenant_id: tenant_id,
                            branch_id: branch_id,
                            payment_method_id: payment_method_id,
                            is_active: true
                        }
                    });

                    if (existingCashAccount) {
                        console.error('❌ FinanceAccountService.update - Cash account already exists for this branch:', {
                            existing_account_id: existingCashAccount.id,
                            existing_account_name: existingCashAccount.name,
                            branch_id: branch_id,
                            payment_method_id: payment_method_id,
                            updating_account_id: id
                        });
                        throw new Error(`Sudah ada akun keuangan dengan metode pembayaran cash untuk cabang ini. Akun yang sudah ada: ${existingCashAccount.name}`);
                    }

                    console.log('✅ FinanceAccountService.update - No existing cash account found, proceeding with update');
                }
            }

            const financeAccount = await FinanceAccountRepository.update(id, name, balance, description, tenant_id, branch_id, is_active, payment_method_id, null, requires_payment_proof);

            return financeAccount;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id, branch_id = null) {
        try {
            const financeAccount = await FinanceAccountRepository.delete(id, tenant_id, branch_id);

            return financeAccount;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAccountName(id, tenant_id = null, branch_id = null) {
        try {
            // Jika tenant_id tidak disediakan, coba ambil tanpa filter tenant
            let financeAccount;
            if (tenant_id) {
                financeAccount = await FinanceAccountRepository.getById(id, tenant_id, branch_id);
            } else {
                // Fallback: ambil finance account tanpa filter tenant untuk backward compatibility
                financeAccount = await FinanceAccount.findByPk(id);
            }

            if (!financeAccount) {
                throw new Error(`Finance account with id ${id} not found`);
            }

            return financeAccount.name;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getBalanceAllAccount(tenant_id, branch_id = null) {
        try {
            // Build where clause for tenant and branch filtering
            const whereClause = { tenant_id };
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { is_global: true }
                ];
            }

            // Get all accounts with their latest transaction
            const accounts = await FinanceAccount.findAll({
                where: whereClause,
                include: [{
                    model: FinanceTransaction,
                    as: 'finance_transactions',
                    attributes: ['createdAt', 'amount'],
                    required: false,
                    order: [['createdAt', 'DESC']],
                    separate: true,
                }],
                order: [['type', 'ASC']]
            });

            if (!accounts) {
                return {
                    summary: {
                        id: 1,
                        title: 'Total Balance',
                        amount: 'Rp 0',
                        percentage: '0%',
                        trend: 'up',
                        color: 'sky',
                        icon: ''
                    },
                    details: []
                };
            }

            // Get yesterday's balances
            const yesterday = moment().subtract(1, 'days').startOf('day');
            const yesterdayBalances = await FinanceAccount.findAll({
                include: [{
                    model: FinanceTransaction,
                    as: 'finance_transactions',
                    where: {
                        createdAt: {
                            [Op.lt]: yesterday
                        }
                    },
                    attributes: ['amount'],
                    required: false
                }],
                attributes: ['id', 'balance']
            });

            // Calculate total balances
            const totalCurrentBalance = accounts.reduce((sum, account) =>
                sum + parseFloat(account.balance || 0), 0
            );

            const totalYesterdayBalance = yesterdayBalances.reduce((sum, account) =>
                sum + parseFloat(account.balance || 0), 0
            );

            // Calculate total percentage change
            const totalPercentageChange = totalYesterdayBalance !== 0
                ? ((totalCurrentBalance - totalYesterdayBalance) / totalYesterdayBalance) * 100
                : 0;

            // Create summary object
            const summary = {
                id: 1,
                title: 'Total Balance',
                amount: `Rp ${totalCurrentBalance.toLocaleString('id-ID')}`,
                percentage: `${totalPercentageChange >= 0 ? '+' : ''}${totalPercentageChange.toFixed(1)}%`,
                trend: totalPercentageChange >= 0 ? 'up' : 'down',
                color: 'sky',
                icon: ''
            };

            // Create yesterday's balances map
            const yesterdayBalanceMap = yesterdayBalances?.reduce((acc, account) => {
                acc[account.id] = parseFloat(account.balance || 0);
                return acc;
            }, {}) || {};

            // Transform accounts data
            const transformedAccounts = accounts.map(account => {
                const transactions = account.FinanceTransactions || [];
                const lastTransaction = transactions[0];

                const yesterdayBalance = yesterdayBalanceMap[account.id] || 0;
                const currentBalance = parseFloat(account.balance || 0);

                const percentageChange = yesterdayBalance !== 0
                    ? ((currentBalance - yesterdayBalance) / yesterdayBalance) * 100
                    : 0;

                // Use payment method for icon instead of account type
                let icon = {
                    path: "",
                    color: "text-gray-600"
                };

                // Get payment method from account
                const paymentMethod = account.payment_method;
                if (paymentMethod) {
                    switch (paymentMethod.code) {
                        case 'bank_transfer':
                        case 'bank':
                            icon = {
                                path: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
                                color: "text-sky-600"
                            };
                            break;
                        case 'qris':
                            icon = {
                                path: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
                                color: "text-yellow-600"
                            };
                            break;
                        case 'cash':
                            icon = {
                                path: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                                color: "text-green-600"
                            };
                            break;
                        case 'ewallet':
                        case 'gopay':
                        case 'ovo':
                        case 'shopee':
                            icon = {
                                path: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
                                color: "text-purple-600"
                            };
                            break;
                        default:
                            icon = {
                                path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                                color: "text-gray-600"
                            };
                    }
                }

                return {
                    id: account.id,
                    title: account.name || 'Unnamed Account',
                    subtitle: account.description || `${paymentMethod ? paymentMethod.name : 'General'} Account`,
                    amount: `Rp ${(currentBalance).toLocaleString('id-ID')}`,
                    rawAmount: currentBalance,
                    percentage: `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`,
                    trend: percentageChange >= 0 ? 'up' : 'down',
                    lastTransaction: lastTransaction
                        ? moment(lastTransaction.createdAt).fromNow()
                        : 'No transactions',
                    icon: {
                        svg: {
                            path: icon.path,
                            color: icon.color
                        }
                    }
                };
            });

            // Return both summary and details
            return {
                summary,
                details: transformedAccounts
            };

        } catch (error) {
            console.error('Error in getBalanceAllAccount:', error);
            throw new Error('Failed to fetch account balances');
        }
    }

    static async calculateAccountBalance(accountId, tenant_id) {
        try {
            console.log('🔍 FinanceAccountService.calculateAccountBalance - Calculating balance for account:', accountId);

            // Get account
            const account = await FinanceAccountRepository.getById(accountId, tenant_id);
            if (!account) {
                throw new Error('Account not found');
            }

            // Get all transactions for this account
            const transactions = await FinanceTransaction.findAll({
                where: {
                    finance_account_id: accountId,
                    tenant_id: tenant_id // ✅ Fix: Isolasi tenant_id
                },
                include: [{
                    model: FinanceCategory,
                    as: 'finance_category',
                    attributes: ['type']
                }],
                order: [['createdAt', 'ASC']]
            });

            // Calculate balance based on transactions
            let calculatedBalance = parseFloat(account.balance || 0);

            transactions.forEach(transaction => {
                const amount = parseFloat(transaction.amount || 0);
                const categoryType = transaction.finance_category?.type;

                // Credit = Income (add to balance), Debit = Expense (subtract from balance)
                if (categoryType === 'credit') {
                    calculatedBalance += amount;
                } else if (categoryType === 'debit') {
                    calculatedBalance -= amount;
                }
            });

            // Update account balance
            await FinanceAccountRepository.updateBalance(accountId, calculatedBalance, tenant_id);

            console.log('✅ FinanceAccountService.calculateAccountBalance - Balance updated:', {
                accountId,
                oldBalance: account.balance,
                newBalance: calculatedBalance,
                transactionCount: transactions.length
            });

            return {
                accountId,
                oldBalance: parseFloat(account.balance || 0),
                newBalance: calculatedBalance,
                transactionCount: transactions.length
            };
        } catch (error) {
            console.error('❌ FinanceAccountService.calculateAccountBalance - Error:', error);
            throw new Error(error.message);
        }
    }

    static async calculateAllAccountBalances(tenant_id, branch_id = null) {
        try {
            console.log('🔍 FinanceAccountService.calculateAllAccountBalances - Calculating balances for tenant:', tenant_id);

            // Get all accounts
            const accounts = await FinanceAccountRepository.getAll(tenant_id, branch_id);

            const results = [];

            for (const account of accounts) {
                try {
                    const result = await this.calculateAccountBalance(account.id, tenant_id);
                    results.push(result);
                } catch (error) {
                    console.error(`❌ Error calculating balance for account ${account.id}:`, error);
                    results.push({
                        accountId: account.id,
                        error: error.message
                    });
                }
            }

            console.log('✅ FinanceAccountService.calculateAllAccountBalances - Completed:', results.length, 'accounts processed');

            return results;
        } catch (error) {
            console.error('❌ FinanceAccountService.calculateAllAccountBalances - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getFinanceAccountTrends(year, tenant_id, branch_id = null) {
        try {
            // Validasi year
            if (!year || isNaN(year)) {
                year = moment().year();
            }

            // Format tanggal dengan benar
            const startDate = moment().year(year).startOf('year').format('YYYY-MM-DD HH:mm:ss');
            const endDate = moment().year(year).endOf('year').format('YYYY-MM-DD HH:mm:ss');
            const currentDate = moment();

            // Determine how many months to show
            let monthsToShow;
            const yearInt = parseInt(year);

            if (yearInt < currentDate.year()) {
                monthsToShow = 12;
            } else if (yearInt > currentDate.year()) {
                monthsToShow = 0;
            } else {
                monthsToShow = currentDate.month() + 1;
            }

            // Build where clause for tenant and branch filtering
            const whereClause = {
                tenant_id,
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            };
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Get all transactions for the year
            const transactions = await FinanceTransaction.findAll({
                where: whereClause,
                include: [{
                    model: FinanceAccount,
                    as: 'finance_account',
                    attributes: ['type', 'name']
                },
                {
                    model: FinanceCategory,
                    as: 'finance_category',
                    attributes: ['name', 'type']
                }],
                order: [['createdAt', 'ASC']]
            });

            // Get months labels
            const months = Array.from({ length: monthsToShow }, (_, i) =>
                moment().month(i).format('MMM')
            );

            // Initialize monthly data
            const monthlyData = {
                income: Array(monthsToShow).fill(0),
                expenses: Array(monthsToShow).fill(0)
            };

            // Process transactions based on category type
            transactions.forEach(transaction => {
                const month = moment(transaction.createdAt).month();
                if (month < monthsToShow) {
                    const amount = parseFloat(transaction.amount || 0);
                    // Credit = Income, Debit = Expense
                    if (transaction.finance_category?.type === 'credit') {
                        monthlyData.income[month] += amount;
                    } else if (transaction.finance_category?.type === 'debit') {
                        monthlyData.expenses[month] += amount;
                    }
                }
            });

            // Calculate totals and averages
            const incomeSummary = {
                data: monthlyData.income,
                total: monthlyData.income.reduce((a, b) => a + b, 0),
                average: monthlyData.income.reduce((a, b) => a + b, 0) / monthsToShow || 0
            };

            const expensesSummary = {
                data: monthlyData.expenses,
                total: monthlyData.expenses.reduce((a, b) => a + b, 0),
                average: monthlyData.expenses.reduce((a, b) => a + b, 0) / monthsToShow || 0
            };

            // Calculate growth (if we have at least 2 months of data)
            let incomeGrowth = 0;
            let expensesGrowth = 0;

            if (monthsToShow >= 2) {
                const firstIncomeMonth = monthlyData.income[0];
                const lastIncomeMonth = monthlyData.income[monthsToShow - 1];
                const firstExpenseMonth = monthlyData.expenses[0];
                const lastExpenseMonth = monthlyData.expenses[monthsToShow - 1];

                incomeGrowth = firstIncomeMonth !== 0
                    ? ((lastIncomeMonth - firstIncomeMonth) / firstIncomeMonth) * 100
                    : 0;

                expensesGrowth = firstExpenseMonth !== 0
                    ? ((lastExpenseMonth - firstExpenseMonth) / firstExpenseMonth) * 100
                    : 0;
            }

            // Find highest and lowest values
            const findExtremeValue = (data, monthLabels) => {
                if (data.length === 0) return { highest: { amount: 0, month: '-' }, lowest: { amount: 0, month: '-' } };

                let highest = { amount: Math.max(...data), month: monthLabels[data.indexOf(Math.max(...data))] };
                let lowest = { amount: Math.min(...data), month: monthLabels[data.indexOf(Math.min(...data))] };
                return { highest, lowest };
            };

            const incomeExtremes = findExtremeValue(monthlyData.income, months);
            const expenseExtremes = findExtremeValue(monthlyData.expenses, months);

            // Modify category calculation
            const calculateCategories = (transactions, categoryType) => {
                const categories = {};
                transactions
                    .filter(t => t.finance_category?.type === categoryType)
                    .forEach(t => {
                        const categoryName = t.finance_category?.name || 'Others';
                        categories[categoryName] = (categories[categoryName] || 0) + parseFloat(t.amount || 0);
                    });

                const total = Object.values(categories).reduce((a, b) => a + b, 0);
                return Object.entries(categories).map(([name, amount]) => ({
                    name,
                    total: amount,
                    percentage: total > 0 ? parseFloat(((amount / total) * 100).toFixed(2)) : 0
                }));
            };

            return {
                success: true,
                statusCode: 200,
                message: `Financial trends data retrieved successfully for ${monthsToShow} months of ${year}`,
                data: {
                    year: yearInt,
                    monthsToShow,
                    trends: {
                        monthly: {
                            labels: months,
                            income: incomeSummary,
                            expenses: expensesSummary
                        },
                        summary: {
                            netIncome: incomeSummary.total - expensesSummary.total,
                            growth: {
                                income: parseFloat(incomeGrowth.toFixed(2)),
                                expenses: parseFloat(expensesGrowth.toFixed(2))
                            },
                            highestIncome: incomeExtremes.highest,
                            highestExpense: expenseExtremes.highest,
                            lowestIncome: incomeExtremes.lowest,
                            lowestExpense: expenseExtremes.lowest
                        },
                        categories: {
                            income: calculateCategories(transactions, 'credit'),  // Credit categories for income
                            expenses: calculateCategories(transactions, 'debit')  // Debit categories for expenses
                        }
                    }
                }
            };

        } catch (error) {
            console.error('Error in getFinanceAccountTrends:', error);
            throw new Error(`Failed to fetch finance trends: ${error.message}`);
        }
    }
}

module.exports = FinanceAccountService;
