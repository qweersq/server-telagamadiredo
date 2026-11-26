// const express = require('express');
// const router = express.Router();

// const { OrderProductDetailController } = require('../controllers');
// const { AuthMiddleware } = require('../middlewares');

// router.use(AuthMiddleware.authenticateUser);

// router.post('/order-product-details', AuthMiddleware.allow([1]), OrderProductDetailController.create);
// router.get('/order-product-details', AuthMiddleware.allow([1]), OrderProductDetailController.getAll);
// router.get('/order-product-details/:id', AuthMiddleware.allow([1]), OrderProductDetailController.getById);
// router.put('/order-product-details/:id', AuthMiddleware.allow([1]), OrderProductDetailController.update);
// router.delete('/order-product-details/:id', AuthMiddleware.allow([1]), OrderProductDetailController.delete);

// module.exports = router;