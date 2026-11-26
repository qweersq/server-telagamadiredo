const express = require('express');
const router = express.Router();
const BillingController = require('../controllers/billingController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// POST /billing/generate-manual - Generate manual billing by admin
router.post('/generate-manual', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.generateManualBilling
);

// POST /billing/generate-initial - Generate initial billing for new subscription
router.post('/generate-initial', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.generateInitialBilling
);

// POST /billing/:billing_id/record-payment - Record payment from tenant
router.post('/:billing_id/record-payment', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.recordPayment
);

// PATCH /billing/:billing_id/confirm-payment - Admin confirm payment
router.patch('/:billing_id/confirm-payment', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.confirmPayment
);

// GET /billing/stats - Get billing statistics
router.get('/stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.getBillingStats
);

// POST /billing/check-expired - Check and update expired subscriptions
router.post('/check-expired', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.checkExpiredSubscriptions
);

// POST /billing/generate-expiring - Generate billing for expiring subscriptions
router.post('/generate-expiring', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.generateBillingForExpiringSubscriptions
);

// POST /billing/generate-trial - Generate billing for trial tenants (day 3)
router.post('/generate-trial', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.generateBillingForTrialTenants
);

// POST /billing/check-expired-trials - Check and update expired trial tenants
router.post('/check-expired-trials', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    BillingController.checkExpiredTrials
);

module.exports = router;
