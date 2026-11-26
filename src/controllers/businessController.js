// const BusinessService = require('../services/businessService');
// const { ResponseHelper } = require('../helpers');

// class BusinessController {
//     static async create(req, res) {
//         try {
//             const raw = {
//                 name: req.body.name,
//                 branch_id: parseInt(req.body.branch_id, 10),
//                 type: req.body.type,
//                 pic_name: req.body.pic_name,
//                 pic_phone: req.body.pic_phone,
//                 address: req.body.address,
//                 is_active: req.body.is_active
//             }
            
//             const data = await BusinessService.create(raw);

//             return res.status(201).send(ResponseHelper.successResponse(data, 201));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getAll(req, res) {
//         try {
//             const search = req.query.search;
//             const data = await BusinessService.getAll(search);
    
//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getById(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             const data = await BusinessService.getById(id);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async update(req, res) {
//         try {
//             const raw = {
//                 id: parseInt(req.params.id, 10),
//                 name: req.body.name,
//                 branch_id: parseInt(req.body.branch_id, 10),
//                 type: req.body.type,
//                 pic_name: req.body.pic_name,
//                 pic_phone: req.body.pic_phone,
//                 address: req.body.address,
//                 is_active: req.body.is_active
//             };

//             const data = await BusinessService.update(raw);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async delete(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             await BusinessService.delete(id);
            
//             return res.status(200).send(ResponseHelper.successResponse());
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };
// };

// module.exports = BusinessController;