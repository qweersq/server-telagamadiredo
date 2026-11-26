// const { Business, Collaboration, Op, sequelize } = require('../models');

// class CollaborationRepository {
//     static async create(data) {
//         const transaction = await sequelize.transaction(data);
//         try {
//             const result = await Collaboration.create(data, { transaction });
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
//                         { '$business.name$': { [Op.substring]: search } },
//                         { '$business.pic_name$': { [Op.substring]: search } },
//                         { name: { [Op.substring]: search } },
//                     ],
//                 }
//                 : {};
    
//             const data = await Collaboration.findAll({
//                 include: [
//                     {
//                         model: Business,
//                         as: 'business',
//                     },
//                 ],
//                 where: searchFilter,
//                 order: [['createdAt', 'DESC']],
//             });

//             return data;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getById(id) {
//         try {
//             const result = await Collaboration.findByPk(id);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async update(id, data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await Collaboration.findByPk(id);

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
//             const result = await Collaboration.findByPk(id);

//             await result.destroy({ transaction });
//             await transaction.commit();
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     };
// };

// module.exports = CollaborationRepository;