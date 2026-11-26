// const BranchRepository = require('../repositories/branchRepository');
// const BusinessRepository = require('../repositories/businessRepository');

// class BusinessService {
//     static async create(data) {
//         try {
//             if (isNaN(data.branch_id) || data.branch_id <= 0) throw new Error('Invalid Branch ID');

//             const check = await BranchRepository.getById(data.branch_id);
//             if (!check) throw new Error('Branch not found');

//             const result = await BusinessRepository.create(data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getAll(search) {
//         try {
//             const result = await BusinessRepository.getAll(search);
//             if (!result || result.length === 0) throw new Error('No Business found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getById(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

//             const result = await BusinessRepository.getById(id);
//             if (!result) throw new Error('Business not found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async update(data) {
//         try {
//             if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

//             if (data.branch_id) {
//                 const check = await BranchRepository.getById(data.branch_id);
//                 if (!check) throw new Error('Branch not found');
//             }

//             const check = await BusinessRepository.getById(data.id);
//             if (!check) throw new Error('Business not found');

//             const result = await BusinessRepository.update(data.id, data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async delete(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

//             const check = await BusinessRepository.getById(id);
//             if (!check) throw new Error('Business not found');

//             await BusinessRepository.delete(id)

//             return null;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };
// };

// module.exports = BusinessService;