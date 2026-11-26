// const { Customer, Discount, OrderProduct, OrderProductDetail, Payment, Product, Op, sequelize } = require('../models');

// class OrderProductRepository {
//     static async create(data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await OrderProduct.create(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);   
//         }
//     }

//     static async getAll({ page, pageSize, startDate, endDate, search }) {
//         try {
//             const offset = (page - 1) * pageSize;
//             const limit = parseInt(pageSize);
        
//             let whereClause = {};
        
//             if (startDate && endDate) {
//                 whereClause.date = {
//                     [Op.between]: [startDate, endDate],
//                 };
//             }
        
//             const searchFilter = search
//                 ? {
//                     [Op.or]: [
//                         { '$customer.name$': { [Op.substring]: search } },
//                         { '$customer.phone$': { [Op.substring]: search } },
//                         { '$payment.code$': { [Op.substring]: search } },
//                         { '$payment.status$': { [Op.substring]: search } },
//                     ],
//                 }
//                 : {};
        
//             whereClause = { ...whereClause, ...searchFilter };

//             const { count, rows: orderProducts } = await OrderProduct.findAndCountAll({
//                 include: [
//                     {
//                         model: Payment,
//                         as: 'payment',
//                         required: true,
//                     },
//                     {
//                         model: Customer,
//                         as: 'customer',
//                         required: true,
//                     },
//                     {
//                         model: Discount,
//                         as: 'discount',
//                     },
//                     {
//                         model: OrderProductDetail,
//                         as: 'order_product_details',
//                         include: [
//                             {
//                                 model: Product,
//                                 as: 'product',
//                             },
//                             {
//                                 model: Discount,
//                                 as: 'discount',
//                             },
//                         ],
//                     },
//                 ],
//                 where: whereClause,
//                 order: [['date', 'DESC']],
//                 offset,
//                 limit,
//                 distinct: true,
//             });

//             return { orderProducts, total: count }
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getById(id) {
//         try {
//             const result = await OrderProduct.findOne({
//                 where: { id: id },
//                 include: [
//                     {
//                         model: Payment,
//                         as: 'payment',
//                     },
//                     {
//                         model: Customer,
//                         as: 'customer',
//                     },
//                     {
//                         model: Discount,
//                         as: 'discount',
//                     },
//                     {
//                         model: OrderProductDetail,
//                         as: 'order_product_details',
//                         include: [
//                             {
//                                 model: Product,
//                                 as: 'product',
//                             },
//                             {
//                                 model: Discount,
//                                 as: 'discount',
//                             },
//                         ],
//                     },
//                 ]
//             });

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async update(id, data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await OrderProduct.findByPk(id);

//             await result.update(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }

//     static async delete(id) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await OrderProduct.findByPk(id);

//             await result.destroy({ transaction });
//             await transaction.commit();
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }

//     static calculateOrderProductStatistics(orders) {
//         const result = {
//             count_transaction: orders.length,
//             sum_orders_before_discount: 0,
//             sum_orders_after_discount: 0,
//             paid_revenue: 0,
//             unpaid_revenue: 0,
//             quantity_product: 0,
//             quantity_product_category: 0,
//             payment_status: { paid: 0, unpaid: 0 },
//             payment_method: { cash: 0, bank_transfer: 0, qris: 0 },
//         };
    
//         orders.forEach((order) => {
//             result.quantity_product_category += order.order_product_details.length;

//             order.order_product_details.forEach((detail) => {
//                 result.quantity_product += detail.quantity;
//                 result.sum_orders_before_discount += parseFloat(detail.total_price_per_category);
//             });

//             result.sum_orders_after_discount += parseFloat(order.payment.final_price);

//             if (order.payment.status === 'paid') {
//                 result.paid_revenue += parseFloat(order.payment.final_price);
//                 result.payment_status.paid++;
//             } else if (order.payment.status === 'unpaid') {
//                 result.unpaid_revenue += parseFloat(order.payment.final_price);
//                 result.payment_status.unpaid++;
//             }

//             switch (order.payment.method) {
//                 case 'cash':
//                     result.payment_method.cash++;
//                     break;
//                 case 'bank_transfer':
//                     result.payment_method.bank_transfer++;
//                     break;
//                 case 'qris':
//                     result.payment_method.qris++;
//                     break;
//                 default:
//                     break;
//             }
//         });
    
//         return result;
//     };

//     static async funcGetOrderProductById(orderId) {
//         try {
//             const result = await OrderProduct.findOne({
//                 where: { id: orderId },
//                 include: [
//                     {
//                         model: Payment,
//                         as: 'payment',
//                     },
//                     {
//                         model: Customer,
//                         as: 'customer',
//                     },
//                     {
//                         model: Discount,
//                         as: 'discount',
//                     },
//                     {
//                         model: OrderProductDetail,
//                         as: 'order_product_details',
//                         include: [
//                             {
//                                 model: Product,
//                                 as: 'product',
//                             },
//                             {
//                                 model: Discount,
//                                 as: 'discount',
//                             },
//                         ],
//                     },
//                 ]
//             });

//             if (!result) return 0;

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }
// };

// module.exports = OrderProductRepository;