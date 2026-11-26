const { Customer, Order, OrderDetail, Payment } = require('../models');

class AiCustomerRepository {
    static async getCustomerWithOrders(customerId) {
        try {
            return await Customer.findOne({
                where: { id: customerId },
                include: [{
                    model: Order,
                    as: 'orders',
                    include: [
                        { 
                            model: Payment,
                            as: 'payment',
                            attributes: ['final_price', 'total_discount', 'date', 'method'] 
                        },
                        { 
                            model: OrderDetail,
                            as: 'order_details'
                        }
                    ]
                }]
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = AiCustomerRepository;