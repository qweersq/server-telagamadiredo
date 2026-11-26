const express = require('express');
const router = express.Router();
const AiCreditController = require('../controllers/AiCreditController');
const { AuthMiddleware } = require('../middlewares');

// All AI credit routes require authentication
router.use(AuthMiddleware.authenticateUser);

// GET /ai/credits/balance - Check remaining credit
router.get('/ai/credits/balance', AuthMiddleware.allow([1, 2, 3, 4]), AiCreditController.getBalance);

// GET /ai/credits/history - Credit transaction history
router.get('/ai/credits/history', AuthMiddleware.allow([1, 2, 3, 4]), AiCreditController.getHistory);

// GET /ai/credits/packages - Available credit packages
router.get('/ai/credits/packages', AuthMiddleware.allow([1, 2, 3, 4]), AiCreditController.getPackages);

// POST /ai/credits/tripay/invoice - Create Tripay invoice (Phase 3)
router.post('/ai/credits/tripay/invoice', AuthMiddleware.allow([1, 2, 3, 4]), AiCreditController.createTripayInvoice);

// POST /ai/credits/tripay/callback - Tripay webhook callback (forwarded to TripayCallbackController)
// Real callback endpoint: POST /tripay/callback (handles BILLING and AI-CREDIT merchant_ref)
router.post('/ai/credits/tripay/callback', AiCreditController.handleTripayCallback);

// POST /ai/credits/appstore/verify - App Store receipt verification (Phase 4)
router.post('/ai/credits/appstore/verify', AuthMiddleware.allow([1, 2, 3, 4]), AiCreditController.verifyAppStoreReceipt);

// POST /ai/credits/admin/grant - Admin manual grant (role 1 only)
router.post('/ai/credits/admin/grant', AuthMiddleware.allow([1]), AiCreditController.adminGrant);

module.exports = router;
