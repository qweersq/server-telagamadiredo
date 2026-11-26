const { Customer, Item, Op, Order, OrderDetail, Payment, ShoePhoto, Treatment } = require('../models');

class CalendarViewRepository {
    static async getOrderByDate(startDate, endDate) {
        try {
            const orders = await Order.findAll({
                include: [
                    {
                        model: OrderDetail,
                        as: 'order_details',
                        where: {
                            due_date: {
                                [Op.between]: [startDate, endDate]
                            }
                        },
                        required: true,
                        include: [
                            {
                                model: Treatment,
                                as: 'treatment',
                                attributes: ['name']
                            },
                            {
                                model: ShoePhoto,
                                as: 'shoes_photos',
                                attributes: ['url_photo']
                            },
                            {
                                model: Item,
                                as: 'item',
                                attributes: ['brand', 'name', 'color']
                            }
                        ]
                    },
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['id', 'status', 'total_price', 'money']
                    }
                ]
            });
    
            return orders;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = CalendarViewRepository;