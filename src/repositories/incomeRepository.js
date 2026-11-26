const { Income, Op, sequelize, User, FinanceAccount, PaymentMethod } = require('../models');

class IncomeRepository {
    static async create(data, transaction = null) {
        try {
            const result = await Income.create(data, { transaction });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByIdWithFinanceAccount(id, transaction = null) {
        try {
            const result = await Income.findOne({
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
                const incomeData = result.toJSON();
                incomeData.payment_method = result.finance_account?.payment_method?.code || 'cash';
                return incomeData;
            }

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll({ page, pageSize, startDate, endDate, search, tenant_id, branch_id }) {
        try {
            const offset = (page - 1) * pageSize;

            const whereConditions = {};

            if (startDate && endDate) {
                whereConditions.date = { [Op.between]: [startDate, endDate] };
            }

            if (tenant_id) {
                whereConditions.tenant_id = tenant_id;
            }

            if (branch_id) {
                whereConditions.branch_id = branch_id;
            }

            const searchFilter = search
                ? {
                    [Op.or]: [
                        { name: { [Op.substring]: search } },
                        { description: { [Op.substring]: search } },
                    ],
                }
                : {};

            const whereFilter = { ...whereConditions, ...searchFilter };

            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const thisMonthFilter = {
                ...whereConditions,
                date: {
                    [Op.between]: [firstDayOfMonth, lastDayOfMonth]
                }
            };

            const { count, rows: incomes } = await Income.findAndCountAll({
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

            const thisMonthIncomes = await Income.findAll({
                where: thisMonthFilter,
                attributes: ['amount']
            });

            const allIncomesForStats = await Income.findAll({
                where: whereFilter,
                attributes: ['amount']
            });

            const statistics = {
                count_income: count,
                total_amount: allIncomesForStats.reduce((total, income) => total + parseFloat(income.amount), 0),
                totalIncomesThisMonth: thisMonthIncomes.reduce((total, income) => total + parseFloat(income.amount), 0),
            };

            const pagination = {
                current_page: page,
                per_page: pageSize,
                total: count,
                total_pages: Math.ceil(count / pageSize),
                has_next: page < Math.ceil(count / pageSize),
                has_prev: page > 1
            };

            const incomesWithPaymentMethod = incomes.map(income => {
                const incomeData = income.toJSON();
                incomeData.payment_method = income.finance_account?.payment_method?.code || 'cash';
                return incomeData;
            });

            return { statistics, incomes: incomesWithPaymentMethod, pagination };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, transaction = null) {
        try {
            const result = await Income.findByPk(id, { transaction });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, transaction = null) {
        try {
            const result = await Income.findByPk(id, { transaction });
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
            const result = await Income.findByPk(id);
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

module.exports = IncomeRepository;
