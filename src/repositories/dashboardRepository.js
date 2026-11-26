const { Customer, Delivery, Expense, Op, Order, OrderDetail, Payment, sequelize } = require('../models');
const moment = require('moment');

class DashboardRepository {
    static async totalOrderFunc(startDate, endDate) {
        try {
            const totalOrder = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });
        
            if (totalOrder.length === 0) {
                return { count: 0, amount: 0 };
            }
        
            const returnOrder = {
                count: totalOrder[0].count,
                amount: totalOrder[0].total
            };
        
            return returnOrder;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async incomeFunc(startDate, endDate) {
        try {
            const incomePayment = await Payment.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    status: 'paid',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });
        
            const returnIncome = {
                count: incomePayment[0].count,
                amount: incomePayment[0].total
            };
        
            return returnIncome;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async totalExpenseFunc(startDate, endDate) {
        try {
            const totalExpense = await Expense.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });
        
            const returnExpense = {
                count: totalExpense[0].count,
                amount: totalExpense[0].total
            };
        
            return returnExpense;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    static async paymentMethodFunc(startDate, endDate) {
        try {
            const cashPayment = await Payment.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    status: 'paid',
                    method: 'cash',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const bankTransferPayment = await Payment.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    status: 'paid',
                    method: 'bank_transfer',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const qrisPayment = await Payment.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    status: 'paid',
                    method: 'qris',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const paymentMethod = {
                cash: {
                    count: cashPayment[0].count,
                    amount: cashPayment[0].total
                },
                bank_transfer: {
                    count: bankTransferPayment[0].count,
                    amount: bankTransferPayment[0].total
                },
                qris: {
                    count: qrisPayment[0].count,
                    amount: qrisPayment[0].total
                }
            };

            return paymentMethod;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    static async totalItemFunc(startDate, endDate) {
        try {
            const TotalItem = await Order.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('quantity')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });
        
            const totalItem = TotalItem[0].total;
        
            return totalItem;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async totalServiceOrderFunc(startDate, endDate) {
        try {
            const totalServiceOrder = await Order.findAll({
                include: [{
                    model: OrderDetail,
                    as: 'order_details',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('order_details.treatment_id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('order_details.price')), 'amount']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const result = totalServiceOrder[0].count || 0

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async totalDeliveryFunc(startDate, endDate) {
        try {
            const TotalDelivery = await Delivery.findAll({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('total_cost')), 'total_cost'],
                    [sequelize.fn('SUM', sequelize.col('total_distance')), 'total_distance']
                ],
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });
        
            const totalDelivery = {
                count: TotalDelivery[0].count,
                total_cost: TotalDelivery[0].total_cost,
                total_distance: TotalDelivery[0].total_distance
            };
        
            return totalDelivery;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async customerOverviewFunc(startDate, endDate) {
        try {
            const AllCustomerInDateRange = await Customer.findAll({
                include: [{
                    model: Order,
                    as: 'orders',
                    order: [['entry_date', 'DESC']],
                    where: {
                        entry_date: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                }],
            });

            let newCustomer = [];
            let repeatCustomer = [];
            AllCustomerInDateRange.map(async (customer) => {
                const CustomerOrder = await Customer.findOne({
                    include: [{
                        model: Order,
                        as: 'orders',
                    }],
                    where: {
                        id: customer.id
                    }
                });
                if (CustomerOrder.orders.length === 1) {
                    newCustomer.push(CustomerOrder);
                } else {
                    repeatCustomer.push(CustomerOrder);
                }
            });

            // Agrowisata Telaga: order_type kini 'dine-in' / 'takeaway' / 'mixed'.
            // Data lama ('offline' / 'online') tetap dihitung agar historis tidak hilang.
            // Order 'mixed' dihitung di kedua sisi karena memang punya item keduanya.
            const dineInOrder = await Order.count({
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    },
                    order_type: ['dine-in', 'mixed', 'offline']
                },
            });

            const takeawayOrder = await Order.count({
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    },
                    order_type: ['takeaway', 'mixed', 'online']
                }
            });

            const customerOverview = {
                new_customer: newCustomer.length,
                repeat_customer: repeatCustomer.length,
                dine_in_order: dineInOrder,
                takeaway_order: takeawayOrder
            };

            return customerOverview;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async graphTotalOrderFunc(startDate, endDate) {
        try {
            const graphTotalOrder = await Order.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('entry_date')), 'date'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('entry_date'))],
                raw: true
            });

            let labels = [];
            let totalOrderData = [];

            const startMoment = moment(startDate);
            const endMoment = moment(endDate);

            while (startMoment.isSameOrBefore(endMoment, 'day')) {
                labels.push(startMoment.format('D'));

                const totalOrderForDate = graphTotalOrder.find(data => moment(data.date).isSame(startMoment, 'day'));

                totalOrderData.push(totalOrderForDate ? totalOrderForDate.total : 0);

                startMoment.add(1, 'day');
            }

            const graph_total_order = {
                labels: labels,
                data: totalOrderData
            };
        
            return graph_total_order;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async graphRevenueFunc(startDate, endDate) {
        try {
            const graphRevenue = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('entry_date')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('DATE', sequelize.col('entry_date'))],
                raw: true
            });

            let labels = [];
            let revenueData = [];

            const startMoment = moment(startDate);
            const endMoment = moment(endDate);

            while (startMoment.isSameOrBefore(endMoment, 'day')) {
                labels.push(startMoment.format('D'));

                const totalRevenueForDate = graphRevenue.find(data => moment(data.date).isSame(startMoment, 'day', 'D'));

                revenueData.push(totalRevenueForDate ? parseFloat(totalRevenueForDate.total).toFixed(2) : 0);

                startMoment.add(1, 'day');
            }

            const graph_revenue = {
                labels: labels,
                data: revenueData
            };

            return graph_revenue;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async graphIncomeFunc(startDate, endDate) {
        try {
            const graphIncome = await Payment.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('date')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total']
                ],
                where: {
                    status: 'paid',
                    date: { [Op.between]: [startDate, endDate] }
                },
                group: [sequelize.fn('DATE', sequelize.col('date'))],
                raw: true
            });

            let labels = [];
            let incomeData = [];

            const startMoment = moment(startDate);
            const endMoment = moment(endDate);

            while (startMoment.isSameOrBefore(endMoment, 'day')) {
                labels.push(startMoment.format('D'));

                const totalIncomeForDate = graphIncome.find(data => moment(data.date).isSame(startMoment, 'day'));

                incomeData.push(totalIncomeForDate ? parseFloat(totalIncomeForDate.total) : 0);

                startMoment.add(1, 'day');
            }

            const graph_income = {
                labels: labels,
                data: incomeData
            };
        
            return graph_income;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async graphExpenseFunc(startDate, endDate) {
        try {
            const graphExpense = await Expense.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('date')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                where: {
                    date: { [Op.between]: [startDate, endDate] }
                },
                group: [sequelize.fn('DATE', sequelize.col('date'))],
                raw: true
            });

            let labels = [];
            let expenseData = [];

            const startMoment = moment(startDate);
            const endMoment = moment(endDate);

            while (startMoment.isSameOrBefore(endMoment, 'day')) {
                labels.push(startMoment.format('D'));
        
                const totalExpenseForDate = graphExpense.find(data => moment(data.date).isSame(startMoment, 'day'));

                expenseData.push(totalExpenseForDate ? parseFloat(totalExpenseForDate.total) : 0);

                startMoment.add(1, 'day');
            }

            const graph_expense = {
                labels: labels,
                data: expenseData
            };
        
            return graph_expense;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async AverageOverviewFunc(startDate, endDate) {
        try {
            const totalDays = moment(endDate).diff(moment(startDate), 'days') + 1;
            const totalWeeks = moment(endDate).diff(moment(startDate), 'weeks') + 1;

            const AverageOrderPerDay = await Order.findAll({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averagePerDay = AverageOrderPerDay[0]?.count ? AverageOrderPerDay[0].count / totalDays : 0;

            const AverageOrderPerWeek = await Order.findAll({
                attributes: [
                    [sequelize.fn('WEEK', sequelize.col('entry_date')), 'week'],
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('WEEK', sequelize.col('entry_date'))],
                raw: true
            });

            const averagePerWeek = AverageOrderPerWeek.length > 0 ? AverageOrderPerWeek[0].count / totalWeeks : 0;

            const TotalOrder = await Order.findAll({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('*')), 'count']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const AvgItemsPerOrder = await Order.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('quantity')), 'sum']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageItemsPerOrder = TotalOrder[0]?.count && AvgItemsPerOrder[0]?.sum
                ? AvgItemsPerOrder[0].sum / TotalOrder[0].count
                : 0;

            const TotalServiceOrder = await Order.findAll({
                include: [{
                    model: OrderDetail,
                    as: 'order_details',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('order_details.treatment_id')), 'count']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageServicePerOrder = TotalServiceOrder[0]?.count && TotalOrder[0]?.count
                ? TotalServiceOrder[0].count / TotalOrder[0].count
                : 0;

            const AvgRevenuePerDay = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageRevenuePerDay = AvgRevenuePerDay[0]?.total ? AvgRevenuePerDay[0].total / totalDays : 0;

            const AvgRevenuePerWeek = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('WEEK', sequelize.col('entry_date')), 'week'],
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('WEEK', sequelize.col('entry_date'))],
                raw: true
            });

            const averageRevenuePerWeek = AvgRevenuePerWeek.length > 0
                ? AvgRevenuePerWeek[0].total / totalWeeks
                : 0;

            const AvgRevenuePerOrder = await Order.findAll({
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageRevenuePerOrder = AvgRevenuePerOrder[0]?.total && TotalOrder[0]?.count
                ? AvgRevenuePerOrder[0].total / TotalOrder[0].count
                : 0;

            const AvgRevenuePerService = await Order.findAll({
                include: [{
                    model: OrderDetail,
                    as: 'order_details',
                    required: true,
                }],
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('order_details.final_price')), 'total']
                ],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageRevenuePerService = AvgRevenuePerService[0]?.total && TotalServiceOrder[0]?.count
                ? AvgRevenuePerService[0].total / TotalServiceOrder[0].count
                : 0;

            const AvgIncomePerDay = await Payment.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total']
                ],
                where: {
                    status: 'paid',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageIncomePerDay = AvgIncomePerDay[0]?.total ? AvgIncomePerDay[0].total / totalDays : 0;

            const AvgIncomePerWeek = await Payment.findAll({
                attributes: [
                    [sequelize.fn('WEEK', sequelize.col('date')), 'week'],
                    [sequelize.fn('SUM', sequelize.col('final_price')), 'total']
                ],
                where: {
                    status: 'paid',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('WEEK', sequelize.col('date'))],
                raw: true
            });

            const averageIncomePerWeek = AvgIncomePerWeek.length > 0
                ? AvgIncomePerWeek[0].total / totalWeeks
                : 0;

            const AvgExpensePerDay = await Expense.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                raw: true
            });

            const averageExpensePerDay = AvgExpensePerDay[0]?.total ? AvgExpensePerDay[0].total / totalDays : 0;

            const AvgExpensePerWeek = await Expense.findAll({
                attributes: [
                    [sequelize.fn('WEEK', sequelize.col('date')), 'week'],
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                group: [sequelize.fn('WEEK', sequelize.col('date'))],
                raw: true
            });

            const averageExpensePerWeek = AvgExpensePerWeek.length > 0
                ? AvgExpensePerWeek[0].total / totalWeeks
                : 0;

            return {
                averagePerDay,
                averagePerWeek,
                averageItemsPerOrder,
                averageServicePerOrder,
                averageRevenuePerDay,
                averageRevenuePerWeek,
                averageRevenuePerOrder,
                averageRevenuePerService,
                averageIncomePerDay,
                averageIncomePerWeek,
                averageExpensePerDay,
                averageExpensePerWeek
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async generateFinanceReport(startDate, endDate) {
        try {
            const orders = await Order.findAll({
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        required: true
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        required: true
                    }
                ]
            });
    
            const expenses = await Expense.findAll({
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });
    
            const payments = await Payment.findAll({
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });

            return { orders, expenses, payments };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async generateStatusReport(startDate, endDate) {
        try {
            const orders = await Order.findAll({
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        required: true
                    },
                    {
                        model: OrderDetail,
                        as: 'order_details',
                        required: true
                    }
                ]
            });

            return orders
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = DashboardRepository;