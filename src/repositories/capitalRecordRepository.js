// const { CapitalRecord, Op, sequelize, User } = require('../models');

// class CapitalRecordRepository {
//     static async create(data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await CapitalRecord.create(data);
//             await transaction.commit();

//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     };

//     static async calculateTotalCapital() {
//         try {
//             const data = await CapitalRecord.findAll({
//                 attributes: [
//                     'user_id',
//                     [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
//                 ],
//                 include: [{ model: User, attributes: ['name'] }],
//                 group: ['user_id'],
//                 order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
//             });

//             return data;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getAll({ page, pageSize, startDate, endDate, search }) {
//         try {
//             const offset = (page - 1) * pageSize;
//             const pageSizeInt = parseInt(pageSize, 10);

//             const dateFilter = startDate && endDate ? { date: { [Op.between]: [startDate, endDate] } } : {};

//             const searchFilter = search
//                 ? {
//                     [Op.or]: [
//                         { '$user.name$': { [Op.substring]: search } },
//                         { description: { [Op.substring]: search } },
//                         { payment_method: { [Op.substring]: search } },
//                     ],
//                 }
//                 : {};
    
//             const whereFilter = { ...dateFilter, ...searchFilter };
    
//             const capitalRecords = await CapitalRecord.findAndCountAll({
//                 where: whereFilter,
//                 include: [{ model: User, attributes: ['id', 'name'] }],
//                 order: [['id', 'DESC']],
//                 offset,
//                 limit: pageSizeInt,
//             });
    
//             const pagination = {
//                 totalItems: capitalRecords.count,
//                 totalPages: Math.ceil(capitalRecords.count / pageSizeInt),
//                 currentPage: page,
//             };
    
//             return {
//                 data: capitalRecords.rows,
//                 pagination: pagination
//             }
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getById(id) {
//         try {
//             const data = await CapitalRecord.findByPk(id);

//             return data;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async update(id, data) {
//         const transaction = await sequelize.transaction();
//         try {
//             const result = await CapitalRecord.findByPk(id);

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
//             const result = await CapitalRecord.findByPk(id);

//             await result.destroy({ transaction });
//             await transaction.commit();
//         } catch (error) {
//             await transaction.rollback();
//             throw new Error(error.message);
//         }
//     };
// };

// module.exports = CapitalRecordRepository;