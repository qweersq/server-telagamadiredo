// const { Business, Op, sequelize } = require('../models');

// class BusinessRepository {
//     static async create(data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Business.create(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     };

//     static async getAll(search) {
//         try {
//             const searchFilter = search
//                 ? {
//                     [Op.or]: [
//                         { '$name$': { [Op.substring]: search } },
//                         { '$address$': { [Op.substring]: search } },
//                         { '$type$': { [Op.substring]: search } },
//                         { '$pic_name$': { [Op.substring]: search } },
//                         { '$pic_phone$': { [Op.substring]: search } },
//                     ],
//                 } : {};

//             const data = await Business.findAll({
//                 where: searchFilter,
//                 order: [['id', 'DESC']],
//             });

//             return data;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getById(id) {
//         try {
//             const result = await Business.findByPk(id);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async update(id, data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Business.findByPk(id);
            
//             await result.update(data, { transaction });
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     };

//     static async delete(id) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Business.findByPk(id);

//             await result.destroy({ transaction });
//             await transaction.commit();
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     };
// };

// module.exports = BusinessRepository;