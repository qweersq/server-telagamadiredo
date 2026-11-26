// const { Product, sequelize } = require('../models');

// class ProductRepository {
//     static async create(data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Product.create(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }

//     static async getAll() {
//         try {
//             const result = await Product.findAll();
            
//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getById(id) {
//         try {
//             const result = await Product.findByPk(id);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async update(id, data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Product.findByPk(id);

//             await result.update(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }

//     static async delete() {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Product.findByPk(id);

//             await result.destroy({ transaction });
//             await transaction.commit();
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     }
// };

// module.exports = ProductRepository;