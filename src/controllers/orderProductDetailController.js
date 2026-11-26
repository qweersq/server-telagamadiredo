// const OrderProductDetailService = require('../services/orderProductDetailService');
// const { ResponseHelper } = require('../helpers');

// class OrderProductDetailController {
//     static async create(req, res) {
//         try {
//             const raw = {
//                 order_product_id: req.body.order_product_id,
//                 product_id: req.body.product_id,
//                 discount_id: req.body.discount_id,
//                 total_price_per_category: req.body.total_price_per_category,
//                 quantity: req.body.quantity,
//                 date: req.body.date,
//             };

//             const data = await OrderProductDetailService.create(raw);

//             return res.status(201).send(ResponseHelper.successResponse(data, 201));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getAll(req, res) {
//         try {
//             const data = await OrderProductDetailService.getAll();

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };
    
//     static async getById(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             const data = await OrderProductDetailService.getById(id);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async update(req, res) {
//         try {
//             const raw = {
//                 id: parseInt(req.params.id, 10),
//                 order_product_id: parseInt(req.body.order_product_id),
//                 product_id: parseInt(req.body.product_id),
//                 discount_id: parseInt(req.body.discount_id),
//                 total_price_per_category: req.body.total_price_per_category,
//                 quantity: req.body.quantity,
//                 date: req.body.date,
//             };

//             const data = await OrderProductDetailService.update(raw);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async delete(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             await OrderProductDetailService.delete(id);

//             return res.status(200).send(ResponseHelper.successResponse());
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };
// };

// module.exports = OrderProductDetailController;