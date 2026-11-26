const express = require('express');
const router = express.Router();
const IapController = require('../controllers/iapController');
const { AuthMiddleware } = require('../middlewares');

// All IAP routes require authentication
router.use(AuthMiddleware.authenticateUser);

// POST /iap/verify-receipt - Verify Apple IAP receipt and activate subscription
router.post('/verify-receipt', IapController.verifyReceipt);

module.exports = router;
