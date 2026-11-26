const express = require('express');
const router = express.Router();
const BerandaKasirController = require('../controllers/berandaKasirController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Get counts for tabs
router.get('/counts', BerandaKasirController.getCounts);

// Get orders list based on filter
router.get('/orders', BerandaKasirController.getOrders);

module.exports = router;
