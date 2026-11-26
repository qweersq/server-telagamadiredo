// const CapitalRecordService = require('../services/capitalRecordService');
// const { ResponseHelper } = require('../helpers');

// class CapitalRecordController {
//     static async create(req, res) {
//         try {
//             const raw = {
//                 user_id: parseInt(req.body.user_id),
//                 date: req.body.date,
//                 amount: req.body.amount,
//                 type: req.body.type,
//                 description: req.body.description,
//                 photos: req.body.photos,
//                 payment_method: req.body.payment_method
//             };

//             const data = await CapitalRecordService.create(raw);

//             return res.status(201).send(ResponseHelper.successResponse(data, 201));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getAll(req, res) {
//         try {
//             const raw = {
//                 page: parseInt(req.query.pageSizeInt, 10) || 1,
//                 pageSize: parseInt(req.query.pageSizeInt, 10) || 10,
//                 startDate: req.query.startDate,
//                 endDate: req.query.endDate,
//                 search: req.query.search
//             };

//             const data = await CapitalRecordService.getAll(raw);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async calculateTotalCapital(req, res) {
//         try {
//             const data = await CapitalRecordService.calculateTotalCapital();
    
//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async update(req, res) {
//         try {
//             const raw = {
//                 id: parseInt(req.params.id, 10),
//                 user_id: parseInt(req.body.user_id, 10),
//                 date: req.body.date,
//                 amount: req.body.amount,
//                 type: req.body.type,
//                 description: req.body.description,
//                 photos: req.body.photos,
//                 payment_method: req.body.payment_method
//             };

//             const data = await CapitalRecordService.update(raw);
    
//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async delete(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             await CapitalRecordService.delete(id);

//             return res.status(200).send(ResponseHelper.successResponse());
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };
// };

// module.exports = CapitalRecordController;