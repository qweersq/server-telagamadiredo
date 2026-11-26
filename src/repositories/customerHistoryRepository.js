const { Item, Op, Order, OrderDetail, Payment, sequelize, Treatment } = require('../models');

class CustomerHistoryRepository {
    async getCustomerStatistics(customerId, startDate = null, endDate = null) {
        try {
            const dateFilter = {};
            if (startDate && endDate) {
                dateFilter.entry_date = {
                    [Op.between]: [startDate, endDate]
                };
            }

            const statistics = await Order.findAll({
                where: {
                    customer_id: customerId,
                    ...dateFilter
                },
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['final_price', 'status']
                    },
                    {
                        model: OrderDetail,
                        as: 'order_details',
                        attributes: ['id']
                    }
                ],
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('orders.id')), 'total_orders'],
                    [sequelize.fn('SUM', sequelize.col('payment.final_price')), 'total_transaction'],
                    // ✅ Total Item = jumlah BARANG. Karena di-group per customer,
                    //    DISTINCT harus atas pasangan (order_id, item_id): item_id yang
                    //    sama di order berbeda tetap dihitung terpisah, sementara
                    //    1 sepatu dengan 2 layanan hanya dihitung 1×.
                    [sequelize.literal('COUNT(DISTINCT orders.id, order_details.item_id)'), 'total_items']
                ],
                group: ['orders.customer_id']
            });

            return statistics[0] || {
                total_orders: 0,
                total_transaction: 0,
                total_items: 0
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCustomerTransactionHistory(customerId, page = 1, limit = 10, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            const whereClause = { customer_id: customerId };

            if (filters.startDate && filters.endDate) {
                whereClause.entry_date = {
                    [Op.between]: [filters.startDate, filters.endDate]
                };
            }

            if (filters.status) {
                whereClause['$payment.status$'] = filters.status;
            }

            const { count, rows } = await Order.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['status', 'final_price', 'code']
                    },
                    {
                        model: OrderDetail,
                        as: 'order_details',
                        include: [
                            {
                                model: Treatment,
                                attributes: ['name']
                            },
                            {
                                model: Item,
                                as: 'item',
                                attributes: ['name']
                            }
                        ]
                    }
                ],
                order: [['entry_date', 'DESC']],
                limit,
                offset,
                distinct: true
            });

            return {
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                data: rows
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = CustomerHistoryRepository;