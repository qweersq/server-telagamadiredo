// const ProductService = require('../services/productService');
// const { ResponseHelper } = require('../helpers');

// class ProductController {
//     static async create(req, res) {
//         try {
//             const raw = {
//                 name: req.body.name,
//                 branch_id: parseInt(req.body.branch_id, 10),
//                 category: req.body.category,
//                 description: req.body.description,
//                 price: req.body.price,
//                 stock: req.body.stock,
//                 images: req.body.images,
//                 sold: req.body.sold
//             }

//             const data = await ProductService.create(raw);

//             return res.status(201).send(ResponseHelper.successResponse(data, 201));
//         } catch (error) {
//             return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
//         }
//     };

//     static async getAll(req, res) {
//         try {
//             const data = await ProductService.getAll();

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async getById(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             const data = await ProductService.getById(id);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async update(req, res) {
//         try {
//             const raw = {
//                 id: parseInt(req.params.id, 10),
//                 name: req.body.name,
//                 branch_id: parseInt(req.body.branch_id, 10),
//                 category: req.body.category,
//                 description: req.body.description,
//                 price: req.body.price,
//                 stock: req.body.stock,
//                 images: req.body.images,
//                 sold: req.body.sold
//             };

//             const data = await ProductService.update(raw);

//             return res.status(200).send(ResponseHelper.successResponse(data));
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };

//     static async delete(req, res) {
//         try {
//             const id = parseInt(req.params.id, 10);
//             await ProductService.delete(id);

//             return res.status(200).send(ResponseHelper.successResponse());
//         } catch (error) {
//             return res.status(500).send(ResponseHelper.errorResponse(error.message));
//         }
//     };
// };

// module.exports = ProductController;