// const OrderProductRepository = require('../repositories/orderProductRepository');
// const OrderProductDetailRepository = require('../repositories/orderProductDetailRepository');
// const PaymentRepository = require('../repositories/paymentRepository');
// const ProductRepository = require('../repositories/productRepository');

// const GenerateInvoiceHelper = require('../helpers/generateInvoiceHelper');

// class OrderProductService {
//   static async create(raw, paymentData, orderProductDetail) {
//     try {
//       if (paymentData && paymentData.id === 0) {
//         delete paymentData.id;
//         paymentData.code = GenerateInvoiceHelper.generateOrderCode(raw.customer_id, raw.date);
//         const newPayment = await PaymentRepository.create(paymentData);
//         raw.payment_id = newPayment.id;
//       }

//       const newOrderProduct = await OrderProductRepository.create(raw);

//       const orderProductDetailsData = orderProductDetail.map((detail) => ({
//         order_product_id: newOrderProduct.id,
//         product_id: detail.product_id,
//         discount_id: detail.discount_id,
//         quantity: detail.quantity,
//         total_price_per_category: detail.total_price_per_category,
//         date: detail.date,
//       }));

//       const newOrderProductDetails = await OrderProductDetailRepository.bulkCreate(orderProductDetailsData);

//       await Promise.all(
//         orderProductDetail.map(async (orderProductDetail) => {
//           const product = await ProductRepository.getById(orderProductDetail.product_id);
//           product.stock = product.stock - orderProductDetail.quantity;
//           product.sold = product.sold + orderProductDetail.quantity;
//           await ProductRepository.update(product.id, product);
//         })
//       );

//       const data = {
//         ...newOrderProduct.toJSON(),
//         order_product_details: newOrderProductDetails,
//       };

//       return data;
//     } catch (error) {
//       throw new Error(error.message);
//     }
//   }
//   static async getAll({ page, pageSize, startDate, endDate, search }) {
//     try {
//       if (isNaN(page) || page <= 0) throw new Error('Page must be a positive integer');
//       if (![10, 20, 50, 100].includes(pageSize)) throw new Error('Page size must be one of the following: 10, 20, 50, 100');
//       if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new Error('Start date cannot be later than end date');

//       const { orderProducts, total } = await OrderProductRepository.getAll({ page, pageSize, startDate, endDate, search });
//       if (!orderProducts) throw new Error('No order product found');

//       const statistics = OrderProductRepository.calculateOrderProductStatistics(orderProducts);

//       return { statistics, orderProducts, total, page, pageSize }
//     } catch (error) {
//       throw new Error(error.message);
//     }
//   }

//   static async getById(id){
//     try {
//       const result = await OrderProductRepository.getById(id);
//       if (!result) throw new Error('Order product not found');

//       return result;
//     } catch (error) {
//       throw new Error(error.message);
//     }
//   }

//   static async update(raw, paymentData, orderProductDetails) {
//     try {
//       const existingOrder = await OrderProductRepository.getById(raw.id);
//       if (!existingOrder) throw new Error('Order product not found'); 

//       if (paymentData && existingOrder.payment_id) await PaymentRepository.update(existingOrder.payment_id, paymentData);

//       await OrderProductRepository.update(raw.id, raw);

//       const existingOrderProductDetails = await OrderProductDetailRepository.getAllByProductId(raw.id);
//       await Promise.all(
//           existingOrderProductDetails.map(async (existingOrderProductDetail) => {
//               const isExist = orderProductDetails.find((orderProductDetail) => orderProductDetail.id == existingOrderProductDetail.id);
//               if (!isExist) {
//                   await OrderProductDetailRepository.delete(existingOrderProductDetail.id);

//                   const product = await ProductRepository.getById(existingOrderProductDetail.product_id);
//                   product.stock = product.stock + existingOrderProductDetail.quantity;
//                   await ProductRepository.update(product.id, product);
//               }
//           })
//       );

//       await Promise.all(
//         orderProductDetails.map(async (orderProductDetail) => {
//               const orderProductDetailData = {
//                   ...orderProductDetail,
//               };

//               const existingOrderProductDetail = await OrderProductDetailRepository.getById(orderProductDetailData.id)
//               if (existingOrderProductDetail) {
//                   await OrderProductDetailRepository.update(orderProductDetailData.id, orderProductDetailData);

//                   const product = await ProductRepository.getById(orderProductDetailData.product_id);
//                   product.stock = product.stock + existingOrderProductDetail.quantity - orderProductDetailData.quantity;

//                   await ProductRepository.update(product.id, product);
//               } else {
//                   delete orderProductDetailData.id;
//                   orderProductDetailData.order_product_id = raw;

//                   await OrderProductDetailRepository.create(orderProductDetailData);

//                   const product = await ProductRepository.getById(orderProductDetailData.product_id);
//                   product.stock = product.stock - orderProductDetailData.quantity;

//                   await ProductRepository.update(product.id, product);
//               }
//           })
//       );

//       const data = await OrderProductRepository.funcGetOrderProductById(raw.id);

//       return data;
//     } catch (error) {
//       throw new Error(error.message);
//     }
//   }

//   static async delete(id) {
//     try {
//       const check = await OrderProductRepository.getById(id);
//       if (!check) throw new Error('Order product not found');

//       await OrderProductRepository.delete(id);

//       return null;
//     } catch (error) {
//       throw new Error(error.message);
//     }
//   }
// };

// module.exports = OrderProductService;