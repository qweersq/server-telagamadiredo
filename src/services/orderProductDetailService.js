// const OrderProductDetailRepository = require('../repositories/orderProductDetailRepository');

// class OrderProductDetailService {
//     static async create(data) {
//         try {
//             const result = await OrderProductDetailRepository.create(data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getAll() {
//         try {
//             const result = await OrderProductDetailRepository.getAll();
//             if (!result || result.length === 0) throw new Error('No order product detail found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getById(id) {
//         try {
//             const result = await OrderProductDetailRepository.getById(id);
//             if (!result) throw new Error('Order product detail not found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async update(data) {
//         try {
//             const check = await OrderProductDetailRepository.getById(data.id);
//             if (!check) throw new Error('Order product detail not found');

//             const result = await OrderProductDetailRepository.update(data.id, data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async delete(id) {
//         try {
//             const check = await OrderProductDetailRepository.getById(id);
//             if (!check) throw new Error('Order product detail not found');

//             await OrderProductDetailRepository.delete(id);

//             return null;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }
// };

// module.exports = OrderProductDetailService;