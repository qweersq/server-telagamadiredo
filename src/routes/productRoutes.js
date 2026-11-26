// const express = require('express');
// const router = express.Router();

// const { ProductController } = require('../controllers');
// const { AuthMiddleware } = require('../middlewares');

// router.use(AuthMiddleware.authenticateUser);

// router.post('/products', AuthMiddleware.allow([1,2]), ProductController.create);
// router.get('/products', AuthMiddleware.allow([1,2]), ProductController.getAll);
// router.get('/products/:id', AuthMiddleware.allow([1,2]), ProductController.getById);
// router.put('/products/:id', AuthMiddleware.allow([1,2]), ProductController.update);
// router.delete('/products/:id', AuthMiddleware.allow([1]), ProductController.delete);

// module.exports = router;