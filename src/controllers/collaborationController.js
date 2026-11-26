// const CollaborationService = require('../services/collaborationService');
// const { ResponseHelper } = require('../helpers');

// class CollaborationController {
//     static async create(req, res) {
//         try {
//             const raw = {
//                 name: req.body.name,
//                 business_id: parseInt(req.body.business_id, 10),
//                 start_date: req.body.start_date,
//                 end_date: req.body.end_date
//             };

//             const data = await CollaborationService.create(raw);

//             return res.status(201).send(ResponseHelper.successResponse(data, 201));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getAll(req, res) {
//         try {
//             const search = req.query.search;
//             const data = await CollaborationService.getAll(search);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getById(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             const data = await CollaborationService.getById(id);

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
//                 business_id: parseInt(req.body.business_id, 10),
//                 start_date: req.body.start_date,
//                 end_date: req.body.end_date
//             };

//             const data = await CollaborationService.update(raw);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async delete(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             await CollaborationService.delete(id);

//             return res.status(200).send(ResponseHelper.successResponse());
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };
// };

// module.exports = CollaborationController;