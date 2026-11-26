// const OrderProductService = require('../services/orderProductService');
// const { ResponseHelper } = require('../helpers');

// class OrderProductController {
//     static async create(req, res) {
//         try {
//             const raw = {
//                 customer_id: req.body.customer_id,
//                 branch_id: req.body.branch_id,
//                 payment_id: req.body.payment_id,
//                 discount_id: req.body.discount_id,
//                 date: req.body.date,
//                 total_price: req.body.total_price,
//             };

//             const paymentData = req.body.payment;
//             const orderProductDetail = req.body.order_product_details;

//             const data = await OrderProductService.create(raw, paymentData, orderProductDetail);
    
//             return res.status(201).send(ResponseHelper.successResponse(data, 201));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getAll(req, res) {
//         try {
//             const raw = {
//                 page: parseInt(req.query.page, 10) || 1,
//                 pageSize: parseInt(req.query.pageSize, 10) || 10,
//                 startDate: req.query.startDate,
//                 endDate: req.query.endDate,
//                 search: req.query.search
//             };

//             const data = await OrderProductService.getAll(raw);
    
//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async getById(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             const data = await OrderProductService.getById(id);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async update(req, res) {
//         try {
//             const raw = {
//                 id: parseInt(req.params.id, 10),
//                 customer_id: req.body.customer_id,
//                 branch_id: req.body.branch_id,
//                 payment_id: req.body.payment_id,
//                 discount_id: req.body.discount_id,
//                 date: req.body.date,
//                 total_price: req.body.total_price,
//             };

//             const paymentData = req.body.payment;
//             const orderProductDetails = req.body.order_product_details;

//             const data = await OrderProductService.update(raw, paymentData, orderProductDetails);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async delete(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             await OrderProductService.delete(id);

//             return res.status(200).send(ResponseHelper.successResponse());
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };
// };

// module.exports = OrderProductController;