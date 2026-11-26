const SuperAppExpense = require('../models/SuperAppExpense');
const { Op } = require('sequelize');

class SuperAppExpenseRepository {
    /**
     * Create new expense
     */
    static async create(data) {
        try {
            const expense = await SuperAppExpense.create(data);
            return expense;
        } catch (error) {
            throw new Error(`Failed to create expense: ${error.message}`);
        }
    }

    /**
     * Get all expenses with filters
     */
    static async findAll(filters = {}) {
        try {
            const { 
                category, 
                start_date, 
                end_date,
                page = 1, 
                limit = 20 
            } = filters;

            const offset = (page - 1) * limit;
            const where = {};

            // Filter by category
            if (category) {
                where.category = category;
            }

            // Filter by date range
            if (start_date && end_date) {
                where.expense_date = {
                    [Op.between]: [start_date, end_date]
                };
            } else if (start_date) {
                where.expense_date = {
                    [Op.gte]: start_date
                };
            } else if (end_date) {
                where.expense_date = {
                    [Op.lte]: end_date
                };
            }

            const { count, rows } = await SuperAppExpense.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['expense_date', 'DESC'], ['created_at', 'DESC']]
            });

            return {
                expenses: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Failed to fetch expenses: ${error.message}`);
        }
    }

    /**
     * Get expense by ID
     */
    static async findById(id) {
        try {
            const expense = await SuperAppExpense.findByPk(id);
            if (!expense) {
                throw new Error('Expense not found');
            }
            return expense;
        } catch (error) {
            throw new Error(`Failed to fetch expense: ${error.message}`);
        }
    }

    /**
     * Update expense
     */
    static async update(id, data) {
        try {
            const expense = await this.findById(id);
            await expense.update(data);
            return expense;
        } catch (error) {
            throw new Error(`Failed to update expense: ${error.message}`);
        }
    }

    /**
     * Delete expense
     */
    static async delete(id) {
        try {
            const expense = await this.findById(id);
            await expense.destroy();
            return { message: 'Expense deleted successfully' };
        } catch (error) {
            throw new Error(`Failed to delete expense: ${error.message}`);
        }
    }

    /**
     * Get summary statistics
     */
    static async getSummary(filters = {}) {
        try {
            const { start_date, end_date } = filters;
            const where = {};

            // Filter by date range
            if (start_date && end_date) {
                where.expense_date = {
                    [Op.between]: [start_date, end_date]
                };
            }

            // Total expenses
            const totalExpenses = await SuperAppExpense.sum('amount', { where });

            // Count by category
            const expensesByCategory = await SuperAppExpense.findAll({
                where,
                attributes: [
                    'category',
                    [SuperAppExpense.sequelize.fn('SUM', SuperAppExpense.sequelize.col('amount')), 'total'],
                    [SuperAppExpense.sequelize.fn('COUNT', SuperAppExpense.sequelize.col('id')), 'count']
                ],
                group: ['category'],
                order: [[SuperAppExpense.sequelize.fn('SUM', SuperAppExpense.sequelize.col('amount')), 'DESC']]
            });

            // Monthly expenses (last 6 months)
            const monthlyExpenses = await SuperAppExpense.findAll({
                attributes: [
                    [SuperAppExpense.sequelize.fn('DATE_FORMAT', SuperAppExpense.sequelize.col('expense_date'), '%Y-%m'), 'month'],
                    [SuperAppExpense.sequelize.fn('SUM', SuperAppExpense.sequelize.col('amount')), 'total']
                ],
                where: {
                    expense_date: {
                        [Op.gte]: SuperAppExpense.sequelize.literal('DATE_SUB(CURDATE(), INTERVAL 6 MONTH)')
                    }
                },
                group: [SuperAppExpense.sequelize.fn('DATE_FORMAT', SuperAppExpense.sequelize.col('expense_date'), '%Y-%m')],
                order: [[SuperAppExpense.sequelize.fn('DATE_FORMAT', SuperAppExpense.sequelize.col('expense_date'), '%Y-%m'), 'DESC']]
            });

            return {
                total_expenses: parseFloat(totalExpenses) || 0,
                by_category: expensesByCategory,
                monthly_trend: monthlyExpenses
            };
        } catch (error) {
            throw new Error(`Failed to get summary: ${error.message}`);
        }
    }

    /**
     * Get categories list
     */
    static getCategories() {
        return SuperAppExpense.getCategories();
    }

    /**
     * Get total expenses for SuperApp Admin Statistics
     * @param {string} start_date - Start date (YYYY-MM-DD)
     * @param {string} end_date - End date (YYYY-MM-DD)
     * @returns {Object} Total expenses and count
     */
    static async getTotalExpensesForStatistics(start_date, end_date) {
        try {
            const where = {};

            // Filter by date range if provided
            if (start_date && end_date) {
                where.expense_date = {
                    [Op.between]: [start_date, end_date]
                };
            }

            // Get total expenses amount
            const totalExpenses = await SuperAppExpense.sum('amount', { where });

            // Get count of expense items
            const totalItems = await SuperAppExpense.count({ where });

            return {
                total_expenses: parseFloat(totalExpenses) || 0,
                total_items: totalItems || 0
            };
        } catch (error) {
            console.error('Error in SuperAppExpenseRepository.getTotalExpensesForStatistics:', error);
            throw new Error(`Failed to get total expenses: ${error.message}`);
        }
    }
}

module.exports = SuperAppExpenseRepository;

