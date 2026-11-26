// const { OrderProductDetail, sequelize } = require('../models');

// class OrderProductDetailRepository {
//     static async create(data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await OrderProductDetail.create(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }

//     static async bulkCreate(data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await OrderProductDetail.bulkCreate(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }

//     static async getAll() {
//         try {
//             const result = await OrderProductDetail.findAll();

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getAllByProductId(id) {
//         try {
//             const result = await OrderProductDetail.findAll(
//                 {
//                     where: { order_product_id: id }
//                 }
//             );

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getById(id) {
//         try {
//             const result = await OrderProductDetail.findByPk(id);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async update(id, data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await OrderProductDetail.findByPk(id);

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
//             const result = await OrderProductDetail.findByPk(id);

//             await result.destroy({ transaction });
//             await transaction.commit();
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }
// };

// module.exports = OrderProductDetailRepository;