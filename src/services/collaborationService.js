// const BusinessRepository = require('../repositories/businessRepository');
// const CollaborationRepository = require('../repositories/collaborationRepository');

// class CollaborationService {
//     static async create(data) {
//         try {
//             const check = await BusinessRepository.getById(data.business_id);
//             if (!check) throw new Error('Business not found');

//             const result = await CollaborationRepository.create(data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getAll(search) {
//         try {
//             const result = await CollaborationRepository.getAll(search);
//             if (!result || result.length === 0) throw new Error('No collaboration found');

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async getById(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

//             const result = await CollaborationRepository.getById(id);
//             if (!result) throw new Error('Collaboration not found');
            
//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async update(data) {
//         try {
//             if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

//             if (data.business_id) {
//                 const check = await BusinessRepository.getById(data.business_id);
//                 if (!check) throw new Error('Business not found');
//             }

//             const check = await CollaborationRepository.getById(data.id);
//             if (!check) throw new Error('Collaboration not found');

//             const result = await CollaborationRepository.update(data.id, data);

//             return result;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };

//     static async delete(id) {
//         try {
//             if (isNaN(id) || id <= 0) throw new Error('Invalid ID');
            
//             const check = await CollaborationRepository.getById(id);
//             if (!check) throw new Error('Collaboration not found');

//             await CollaborationRepository.delete(id);

//             return null;
//         } catch (error) {
//             throw new Error(error.message);
//         }
//     };
// };

// module.exports = CollaborationService;