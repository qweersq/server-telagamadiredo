const express = require('express');
const router = express.Router();
const TripayCallbackController = require('../controllers/tripayCallbackController');

/**
 * Tripay Callback Routes
 * These routes are called by Tripay when payment status changes
 * No authentication required - secured by signature validation
 */

// POST /tripay/callback - Handle payment status updates
router.post('/callback', TripayCallbackController.handleCallback);

module.exports = router;
