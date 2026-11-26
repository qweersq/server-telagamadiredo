const { Expense, Op, sequelize, User, FinanceAccount, PaymentMethod } = require('../models');

class ExpenseRepository {
    static async create(data, transaction = null) {
        try {
            const result = await Expense.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByIdWithFinanceAccount(id, transaction = null) {
        try {
            const { FinanceAccount, PaymentMethod } = require('../models');
            
            const result = await Expense.findOne({
                where: { id },
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
                transaction
            });

            if (result) {
                // ✅ Add payment_method to response from finance account
                const expenseData = result.toJSON();
                expenseData.payment_method = result.finance_account?.payment_method?.code || 'cash';
                return expenseData;
            }

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll({ page, pageSize, startDate, endDate, search, tenant_id, branch_id }) {
        try {
            const offset = (page - 1) * pageSize;
            
            // Build where conditions
            const whereConditions = {};
            
            // Date filter
            if (startDate && endDate) {
                whereConditions.date = { [Op.between]: [startDate, endDate] };
            }
            
            // Tenant filter
            if (tenant_id) {
                whereConditions.tenant_id = tenant_id;
            }
            
            // Branch filter (null means all branches)
            if (branch_id) {
                whereConditions.branch_id = branch_id;
            }
            
            // Search filter
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { name: { [Op.substring]: search } },
                        { description: { [Op.substring]: search } },
                    ],
                }
                : {};
            
            const whereFilter = { ...whereConditions, ...searchFilter };
            
            // Get current month filter for statistics
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            const thisMonthFilter = {
                ...whereConditions,
                date: {
                    [Op.between]: [firstDayOfMonth, lastDayOfMonth]
                }
            };
            
            // Get paginated expenses with includes
            const { count, rows: expenses } = await Expense.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: { exclude: ['password'] },
                        required: true,
                    },
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
                where: whereFilter,
                order: [['date', 'DESC'], ['createdAt', 'DESC']],
                limit: pageSize,
                offset: offset,
                distinct: true
            });
            
            // Get statistics
            const thisMonthExpenses = await Expense.findAll({
                where: thisMonthFilter,
                attributes: ['amount']
            });
            
            const allExpensesForStats = await Expense.findAll({
                where: whereFilter,
                attributes: ['amount']
            });
            
            const statistics = {
                count_expense: count,
                total_amount: allExpensesForStats.reduce((total, expense) => total + parseFloat(expense.amount), 0),
                totalExpensesThisMonth: thisMonthExpenses.reduce((total, expense) => total + parseFloat(expense.amount), 0),
            };
            
            // Pagination info
            const pagination = {
                current_page: page,
                per_page: pageSize,
                total: count,
                total_pages: Math.ceil(count / pageSize),
                has_next: page < Math.ceil(count / pageSize),
                has_prev: page > 1
            };
            
            // Add payment_method to each expense
            const expensesWithPaymentMethod = expenses.map(expense => {
                const expenseData = expense.toJSON();
                expenseData.payment_method = expense.finance_account?.payment_method?.code || 'cash';
                return expenseData;
            });

            return { statistics, expenses: expensesWithPaymentMethod, pagination };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getExpenseOption() {
        try {
            const expenseNames = await Expense.findAll({
                attributes: ['name', [Expense.sequelize.fn('COUNT', Expense.sequelize.col('name')), 'count']],
                group: ['name'],
                order: [[Expense.sequelize.fn('COUNT', Expense.sequelize.col('name')), 'DESC']],
            });
        
            const expenseCategories = []

            return { expenseNames, expenseCategories };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByShift(id) {
        try {
            const expenses = await Expense.findAll({
                where: {
                    shift_id: id,
                },
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
                order: [['createdAt', 'DESC']],
            });

            const totalAmount = await Expense.sum('amount', {
                where: {
                    shift_id: id,
                },
                order: [['createdAt', 'DESC']],
            });

            return { expenses, totalAmount };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, transaction = null) {
        try {
            const result = await Expense.findByPk(id, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction = null) {
        try {
            const result = await Expense.findByPk(id, { transaction });

            await result.update(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, transaction = null) {
        const shouldCommit = !transaction;
        if (!transaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await Expense.findByPk(id);

            await result.destroy({ transaction });
            
            if (shouldCommit) {
                await transaction.commit();
            }
        } catch (error) {
            if (shouldCommit) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }
};

module.exports = ExpenseRepository;