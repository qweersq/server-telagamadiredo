// const express = require('express');
// const router = express.Router();

// const { OrderProductController } = require('../controllers');
// const { AuthMiddleware } = require('../middlewares');

// router.use(AuthMiddleware.authenticateUser);

// router.post('/order-products', AuthMiddleware.allow([1]), OrderProductController.create);
// router.get('/order-products', AuthMiddleware.allow([1]), OrderProductController.getAll);
// router.get('/order-products/:id', AuthMiddleware.allow([1]), OrderProductController.getById);
// router.put('/order-products/:id', AuthMiddleware.allow([1]), OrderProductController.update);
// router.delete('/order-products/:id', AuthMiddleware.allow([1]), OrderProductController.delete);

// module.exports = router;