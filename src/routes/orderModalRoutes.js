const express = require('express');
const router = express.Router();
const OrderModalController = require('../controllers/orderModalController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Get orders by payment status for modal
router.get('/payment-status/:status', AuthMiddleware.allow([1,2,3,4]), OrderModalController.getPaymentStatusOrders);

// Get orders by service status for modal
router.get('/service-status/:status', AuthMiddleware.allow([1,2,3,4]), OrderModalController.getServiceStatusOrders);

module.exports = router;
