// const BranchRepository = require('../repositories/branchRepository');
// const ProductRepository = require('../repositories/productRepository');

// class ProductService {
//     static async create(data) {
//         try {
//             if (isNaN(data.branch_id) || data.branch_id <= 0) throw new Error('Invalid Branch ID');

//             const check = await BranchRepository.getById(data.branch_id);
//             if (!check) throw new Error('Branch not found');

//             const result = await ProductRepository.create(data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getAll() {
//         try {
//             const result = await ProductRepository.getAll();
//             if (!result || result.length === 0) throw new Error('No product found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async getById(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

//             const result = await ProductRepository.getById(id);
//             if (!result) throw new Error('Product not found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async update(data) {
//         try {
//             if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');
            
//             if (data.branch_id) {
//                 if (isNaN(data.branch_id) || data.branch_id <= 0) throw new Error('Invalid Branch ID');

//                 const check = await BranchRepository.getById(data.branch_id);
//                 if (!check) throw new Error('Branch not found');
//             }

//             const check = await ProductRepository.getById(data.id);
//             if (!check) throw new Error('Product not found');

//             const result = await ProductRepository.update(data.id, data);
            
//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }

//     static async delete(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

//             const check = await ProductRepository.getById(id);
//             if (!check) throw new Error('Product not found');

//             await ProductRepository.delete(id);

//             return null;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     }
// };

// module.exports = ProductService;