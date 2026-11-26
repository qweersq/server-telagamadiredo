const express = require('express');
const router = express.Router();
const OrderControllerNew = require('../controllers/orderControllerNew');
const AuthMiddleware = require('../middlewares/authMiddleware');

// NEW: Route untuk testing implementasi Raw SQL
router.get('/orders-new-raw', AuthMiddleware.allow([1,2,3,4], true), OrderControllerNew.getAllNew);

// NEW: Route untuk export data pesanan
router.get('/orders-new-raw/export', AuthMiddleware.allow([1,2,3,4], true), OrderControllerNew.exportOrders);

module.exports = router;
