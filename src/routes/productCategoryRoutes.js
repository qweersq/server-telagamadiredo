const express = require('express');
const router = express.Router();

const { ProductCategoryController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/product-categories', AuthMiddleware.allow([1, 2, 4], true), ProductCategoryController.create);
router.get('/product-categories', AuthMiddleware.allow([1, 2, 4], true), ProductCategoryController.getAll);
router.get('/product-categories/options', AuthMiddleware.allow([1, 2, 4], true), ProductCategoryController.getOptions);
router.get('/product-categories/:id', AuthMiddleware.allow([1, 2, 4], true), ProductCategoryController.getById);
router.put('/product-categories/:id', AuthMiddleware.allow([1, 2, 4], true), ProductCategoryController.update);
router.delete('/product-categories/:id', AuthMiddleware.allow([1, 4], true), ProductCategoryController.delete);
router.patch('/product-categories/:id/toggle-status', AuthMiddleware.allow([1, 2, 4], true), ProductCategoryController.toggleStatus);

module.exports = router;
