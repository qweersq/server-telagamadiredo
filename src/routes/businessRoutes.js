// const express = require('express');
// const router = express.Router();

// const { BusinessController } = require('../controllers');
// const { AuthMiddleware } = require('../middlewares');

// router.use(AuthMiddleware.authenticateUser);

// router.post('/businesses', AuthMiddleware.allow([1]), BusinessController.create);
// router.get('/businesses', AuthMiddleware.allow([1]), BusinessController.getAll);
// router.get('/businesses/:id', AuthMiddleware.allow([1]), BusinessController.getById);
// router.put('/businesses/:id', AuthMiddleware.allow([1]), BusinessController.update);
// router.delete('/businesses/:id', AuthMiddleware.allow([1]), BusinessController.delete);

// module.exports = router;