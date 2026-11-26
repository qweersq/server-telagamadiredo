const express = require('express');
const router = express.Router();

const { CustomerHistoryController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.get('/customers/:customer_id/history', AuthMiddleware.allow([1,2,4]), CustomerHistoryController.getCustomerHistory);

module.exports = router;