const express = require('express');
const router = express.Router();
const TripayController = require('../controllers/tripayController');
const { AuthMiddleware } = require('../middlewares');

// Public routes (no authentication required for callbacks)
router.post('/callback', TripayController.handleCallback);

// Protected routes (require authentication)
router.get('/channels', AuthMiddleware.authenticateUser, TripayController.getPaymentChannels);
router.post('/create-transaction', AuthMiddleware.authenticateUser, TripayController.createTransaction);
router.get('/status/:reference', AuthMiddleware.authenticateUser, TripayController.checkTransactionStatus);
router.get('/history', AuthMiddleware.authenticateUser, TripayController.getTransactionHistory);
router.post('/check-status/:billing_id', AuthMiddleware.authenticateUser, TripayController.manualCheckStatus);

module.exports = router;
