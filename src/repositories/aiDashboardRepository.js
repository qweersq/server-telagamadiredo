const { Customer, Order, OrderDetail, Op, Payment, sequelize, Treatment } = require('../models');
const moment = require('moment');

class AiDashboardRepository {
    static async getOrderMetrics(startDate, endDate, attributes, include = [], where = {}) {
        return Order.findAll({
            attributes,
            include,
            where: {
                entry_date: {
                    [Op.between]: [startDate, endDate]
                },
                ...where
            },
            raw: true
        });
    }

    static calculatePreviousDates(startDate, endDate) {
        const previousStartDate = moment(startDate).subtract(1, 'months').format('YYYY-MM-DD');
        const previousEndDate = moment(endDate).subtract(1, 'months').format('YYYY-MM-DD');
        return { previousStartDate, previousEndDate };
    }

    static async getBusinessPerformance(startDate, endDate) {
        try {
            const attributesRevenueOrders = [
                [sequelize.fn('COUNT', sequelize.col('orders.id')), 'total_orders'],
                [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total_revenue']
            ];
            const includePayment = [{ model: Payment, as: 'payment', required: true }];
            const attributesTotalItems = [
                [sequelize.fn('SUM', sequelize.col('quantity')), 'total_items']
            ];

            const currentPeriod = await this.getOrderMetrics(startDate, endDate, attributesRevenueOrders, includePayment);
            const totalServices = await this.getOrderMetrics(startDate, endDate, attributesTotalItems);

            const { previousStartDate, previousEndDate } = this.calculatePreviousDates(startDate, endDate);

            const previousPeriod = await this.getOrderMetrics(
                previousStartDate,
                previousEndDate,
                [[sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total_revenue']],
                includePayment
            );

            const currentRevenue = (currentPeriod[0] && currentPeriod[0].total_revenue) || 0;
            const previousRevenue = (previousPeriod[0] && previousPeriod[0].total_revenue) || 0;
            const growth = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

            return {
                currentPeriod: {
                    total_revenue: currentRevenue,
                    total_orders: (currentPeriod[0] && currentPeriod[0].total_orders) || 0,
                    total_items: (totalServices[0] && totalServices[0].total_items) || 0,
                    average_order_value: (currentPeriod[0] && currentPeriod[0].total_orders)
                        ? currentRevenue / currentPeriod[0].total_orders
                        : 0
                },
                growth
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getTreatmentAnalysis(startDate, endDate) {
        try {
            const treatmentInclude = [{
                model: Treatment,
                as: 'treatment',
                attributes: ['name', 'type_item', 'type_service']
            }, {
                model: Order,
                as: 'order',
                required: true,
                attributes: [],
                where: {
                    entry_date: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            }];

            const topTreatments = await OrderDetail.findAll({
                include: treatmentInclude,
                attributes: [
                    'treatment_id',
                    [sequelize.fn('COUNT', sequelize.col('order_details.id')), 'order_count'],
                    [sequelize.fn('SUM', sequelize.col('order_details.final_price')), 'total_revenue']
                ],
                group: ['treatment_id', 'treatment.name', 'treatment.type_item', 'treatment.type_service'],
                order: [[sequelize.literal('total_revenue'), 'DESC']],
                limit: 5,
                raw: true,
                nest: true
            });

            const categoryAnalysis = await OrderDetail.findAll({
                include: treatmentInclude,
                where: { status: 'done' },
                attributes: [
                    [sequelize.col('treatment.type_item'), 'category'],
                    [sequelize.fn('COUNT', sequelize.col('order_details.id')), 'total_orders'],
                    [sequelize.fn('SUM', sequelize.col('order_details.final_price')), 'total_revenue']
                ],
                group: ['treatment.type_item'],
                raw: true
            });

            return { topTreatments, categoryAnalysis };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getCustomerAnalysis(startDate, endDate) {
        try {
            const customerMetrics = await this.getOrderMetrics(
                startDate,
                endDate,
                [
                    [sequelize.fn('COUNT', sequelize.col('orders.id')), 'total_orders'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('customer_id'))), 'unique_customers']
                ],
                [{
                    model: Customer,
                    as: 'customer',
                    attributes: []
                }, {
                    model: OrderDetail,
                    as: 'order_details',
                    where: { status: 'done' },
                    attributes: []
                }]
            );

            const returningCustomersQuery = `
                SELECT DISTINCT o.customer_id
                FROM orders o
                JOIN order_details od ON o.id = od.order_id
                WHERE o.entry_date < '${startDate}' AND od.status = 'done'
            `;

            const returningCustomers = await Order.findAll({
                include: [{
                    model: OrderDetail,
                    as: 'order_details',
                    where: { status: 'done' },
                    attributes: []
                }],
                attributes: [
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('customer_id'))), 'count']
                ],
                where: {
                    entry_date: { [Op.between]: [startDate, endDate] },
                    customer_id: { [Op.in]: sequelize.literal(`(${returningCustomersQuery})`) }
                },
                raw: true
            });

            return {
                total_orders: (customerMetrics[0] && customerMetrics[0].total_orders) || 0,
                unique_customers: (customerMetrics[0] && customerMetrics[0].unique_customers) || 0,
                returning_customers: (returningCustomers[0] && returningCustomers[0].count) || 0,
                new_customers: ((customerMetrics[0] && customerMetrics[0].unique_customers) || 0) - ((returningCustomers[0] && returningCustomers[0].count) || 0)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = AiDashboardRepository;