const { Expense, Op, Order, Payment, sequelize } = require('../models');
const moment = require('moment');

class dashboardProfitOverviewRepository {
    static getMonthsInRange(start, end) {
        const months = [];
        let current = moment(start);
        while (current.isSameOrBefore(end)) {
            months.push(current.format('MMM-YYYY'));
            current.add(1, 'month');
        }
        return months;
    };

    static async incomeTotalFunc(raw) {
        try {
            const { startDate, endDate } = raw;

            const filter = {};
            if (startDate && endDate) {
                filter.date = { [Op.between]: [startDate, endDate] };
            } else if (startDate) {
                filter.date = { [Op.gte]: startDate };
            } else if (endDate) {
                filter.date = { [Op.lte]: endDate };
            }

            const incomeTotal = await Payment.sum('final_price', {
                where: {
                    status: 'paid',
                    date: filter.date ? filter.date : { [Op.ne]: null }
                }
            });
            return incomeTotal;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async revenueTotalFunc(raw) {
        try {
            const { startDate, endDate } = raw;

            const filter = {};
            if (startDate && endDate) {
                filter.date = { [Op.between]: [startDate, endDate] };
            } else if (startDate) {
                filter.date = { [Op.gte]: startDate };
            } else if (endDate) {
                filter.date = { [Op.lte]: endDate };
            }
    
            const revenueTotal = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                }],
                where: {
                    entry_date: filter.date ? filter.date : { [Op.ne]: null }
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'totalRevenue']
                ],
                raw: true
            });
        
            return revenueTotal[0].totalRevenue;
        }
        catch (error) {
            throw new Error(error.message);
        }
    };

    static async expenseWithCapitalTotalFunc(raw) {
        try {
            const { startDate, endDate } = raw;

            const filter = {};
            if (startDate && endDate) {
                filter.date = { [Op.between]: [startDate, endDate] };
            } else if (startDate) {
                filter.date = { [Op.gte]: startDate };
            } else if (endDate) {
                filter.date = { [Op.lte]: endDate };
            }
        
            const expenseTotal = await Expense.sum('amount', {
                where: filter
            });

            return expenseTotal;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async expenseNotCapitalFunc(raw) {
        try {
            const { startDate, endDate } = raw;

            const filter = {};
            if (startDate && endDate) {
                filter.date = { [Op.between]: [startDate, endDate] };
            } else if (startDate) {
                filter.date = { [Op.gte]: startDate };
            } else if (endDate) {
                filter.date = { [Op.lte]: endDate };
            }
        
            const expenseNotCapital = await Expense.sum('amount', {
                where: {
                    date: filter.date ? filter.date : { [Op.ne]: null },
                    type_account: {
                        [Op.not]: 'modal_bisnis',
                    }
                },
            });
            
            return expenseNotCapital;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getTotalExpensesByMonth() {
        try {
            const startDate = moment('2023-09-01').startOf('month');
            const endDate = moment().endOf('month');
            
            const totalExpenses = await Expense.findAll({
                attributes: [
                    [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%b-%Y'), 'month'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpenses']
                ],
                where: {
                    date: {
                        [Op.and]: [
                            { [Op.gte]: startDate.toDate() },
                            { [Op.lte]: endDate.toDate() }
                        ]
                    }
                },
                group: [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%b-%Y')],
                raw: true,
                order: [[sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'ASC']]
            });
    
            const result = dashboardProfitOverviewRepository.getMonthsInRange(startDate, endDate).map(month => {
                const foundExpense = totalExpenses.find(expense => expense.month === month);
                return {
                    category: month,
                    value: foundExpense ? parseFloat(foundExpense.totalExpenses).toFixed(2) : "0.00"
                };
            });
    
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getTotalIncomeByMonth() {
        try {
            const startDate = moment('2023-09-01').startOf('month');
            const endDate = moment().endOf('month');
            
            const totalIncome = await Payment.findAll({
                attributes: [
                    [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%b-%Y'), 'month'],
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'totalIncome']
                ],
                where: {
                    status: 'paid',
                    date: {
                        [Op.and]: [
                            { [Op.gte]: startDate.toDate() },
                            { [Op.lte]: endDate.toDate() }
                        ]
                    }
                },
                group: [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%b-%Y')],
                raw: true,
                order: [[sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'ASC']]
            });
    
            const result = dashboardProfitOverviewRepository.getMonthsInRange(startDate, endDate).map(month => {
                const foundIncome = totalIncome.find(income => income.month === month);
                return {
                    category: month,
                    value: foundIncome ? parseFloat(foundIncome.totalIncome).toFixed(2) : "0.00"
                };
            });
    
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getTotalRevenueByMonth() {
        try {
            const startDate = moment('2023-09-01').startOf('month');
            const endDate = moment().endOf('month');
            
            const totalRevenue = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                }],
                attributes: [
                    [sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), '%b-%Y'), 'month'],
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'totalRevenue']
                ],
                where: {
                    entry_date: {
                        [Op.and]: [
                            { [Op.gte]: startDate.toDate() },
                            { [Op.lte]: endDate.toDate() }
                        ]
                    }
                },
                group: [sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), '%b-%Y')],
                raw: true,
                order: [[sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), '%Y-%m'), 'ASC']]
            });
    
            const result = dashboardProfitOverviewRepository.getMonthsInRange(startDate, endDate).map(month => {
                const foundRevenue = totalRevenue.find(revenue => revenue.month === month);
                return {
                    category: month,
                    value: foundRevenue ? parseFloat(foundRevenue.totalRevenue).toFixed(2) : "0.00"
                };
            });
    
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };
};

module.exports = dashboardProfitOverviewRepository;