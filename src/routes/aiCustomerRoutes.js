const express = require('express');
const router = express.Router();

const { AiCustomerController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.get('/customer-pattern/:customer_id', AuthMiddleware.allow([1,2,4]), AiCustomerController.analyzeCustomerPattern);

module.exports = router;