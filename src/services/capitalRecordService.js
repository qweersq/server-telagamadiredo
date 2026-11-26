// const CapitalRecordRepository = require('../repositories/capitalRecordRepository');

// class CapitalRecordService {
//     static async create(data) {
//         try {
//             const result = await CapitalRecordRepository.create(data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async calculateTotalCapital() {
//         try {
//             const result = await CapitalRecordRepository.calculateTotalCapital();
//             if (!result || result.length === 0) throw new Error('No capital record found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getAll({ page, pageSize, startDate, endDate, search }) {
//         try {
//             if (isNaN(page) || page <= 0) throw new Error('Page must be a positive integer');
//             if (![10, 20, 50, 100].includes(pageSize)) throw new Error('Page size must be one of the following: 10, 20, 50, 100');
//             if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new Error('Start date cannot be later than end date');

//             const result = await CapitalRecordRepository.getAll({ page, pageSize, startDate, endDate, search });
//             if (!result || result.length === 0) throw new Error('No capital record found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//       }
//     };

//     static async update(data) {
//         try {
//             if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

//             const check = await CapitalRecordRepository.getById(data.id);
//             if (!check) throw new Error('Capital Record not found');

//             const result = await CapitalRecordRepository.update(data.id, data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async delete(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

//             const check = await CapitalRecordRepository.getById(id);
//             if (!check) throw new Error('Capital Record not found');

//             await CapitalRecordRepository.delete(id);

//             return null;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };
// };

// module.exports = CapitalRecordService;