const express = require('express');
const router = express.Router();
const SuperAppBillingController = require('../controllers/superAppBillingController');
const SubscriptionController = require('../controllers/subscriptionController');
const TenantPaymentController = require('../controllers/tenantPaymentController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// ========================================
// SUPERAPP BILLING MANAGEMENT ROUTES
// ========================================

// GET /superapp/billings - Get all billings with filtering and pagination
router.get('/billings', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getAllBillings
);

// GET /superapp/billings/stats - Get overall billing statistics
router.get('/billings/stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getBillingStats
);

// GET /superapp/billings/dashboard-stats - Get optimized dashboard statistics (single API call)
router.get('/billings/dashboard-stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getDashboardStats
);

// GET /superapp/billings/stats/tabs - Get tab-based statistics (unpaid, pending, paid, failed)
router.get('/billings/stats/tabs', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getTabStats
);

// ========================================
// DEDICATED BILLING TAB ROUTES (MUST BE BEFORE /:id ROUTES)
// ========================================

// GET /superapp/billings/unpaid - Get unpaid billings
router.get('/billings/unpaid', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getUnpaidBillings
);

// GET /superapp/billings/failed - Get failed billings
router.get('/billings/failed', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getFailedBillings
);

// GET /superapp/billings/pending - Get pending billings
router.get('/billings/pending', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getPendingBillings
);

// GET /superapp/billings/paid - Get paid billings
router.get('/billings/paid', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getPaidBillings
);

// GET /superapp/billings/cancelled - Get cancelled billings
router.get('/billings/cancelled', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getCancelledBillings
);

// GET /superapp/billings/refunded - Get refunded billings
router.get('/billings/refunded', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getRefundedBillings
);

// GET /superapp/billings/:id - Get specific billing by ID
router.get('/billings/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getBillingById
);

// POST /superapp/billings/generate - Generate manual billing
router.post('/billings/generate', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.generateBilling
);

// POST /superapp/billings/generate-manual - Generate manual billing with full control
router.post('/billings/generate-manual', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.generateManualBilling
);

// PATCH /superapp/billings/:id/mark-paid - Mark payment as paid
router.patch('/billings/:id/mark-paid', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.markAsPaid
);

// PATCH /superapp/billings/:id/confirm - Confirm payment by admin
router.patch('/billings/:id/confirm', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.confirmPayment
);

// PATCH /superapp/billings/:id/refund - Refund payment
router.patch('/billings/:id/refund', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.refundPayment
);

// PATCH /superapp/billings/:id/status - Update billing status
router.patch('/billings/:id/status', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.updateStatus
);

// DELETE /superapp/billings/:id - Delete billing
router.delete('/billings/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.deleteBilling
);

// ========================================
// TENANT & SUBSCRIPTION MANAGEMENT ROUTES
// ========================================

// GET /superapp/tenants - Get all tenants for manual billing
router.get('/tenants', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getAllTenants
);

// GET /superapp/tenants/:id/subscription - Get tenant's current subscription
router.get('/tenants/:id/subscription', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getTenantSubscription
);

// GET /superapp/subscription-plans - Get all subscription plans
router.get('/subscription-plans', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getAllSubscriptionPlans
);

// GET /superapp/subscriptions - Get all subscriptions for billing
router.get('/subscriptions', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getSubscriptions
);

// GET /superapp/subscriptions/:id - Get specific subscription
router.get('/subscriptions/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getSubscriptionById
);

// PUT /superapp/subscriptions/:id - Manual fix: update active subscription (plan_id, end_date, price, final_price, notes)
router.put('/subscriptions/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.update
);

// PUT /superapp/tenant-payments/:id - Manual fix: update payment (status, paid_at)
router.put('/tenant-payments/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.update
);

// ========================================
// BULK OPERATIONS ROUTES
// ========================================

// POST /superapp/billings/bulk-mark-paid - Bulk mark payments as paid
router.post('/billings/bulk-mark-paid', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.bulkMarkAsPaid
);

// POST /superapp/billings/bulk-confirm - Bulk confirm payments
router.post('/billings/bulk-confirm', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.bulkConfirmPayments
);

// POST /superapp/billings/export - Export billings data
router.post('/billings/export', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.exportBillings
);

// ========================================
// ANALYTICS & REPORTING ROUTES
// ========================================

// GET /superapp/billings/analytics/revenue - Get revenue analytics
router.get('/billings/analytics/revenue', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getRevenueAnalytics
);

// GET /superapp/billings/analytics/tenants - Get tenant performance analytics
router.get('/billings/analytics/tenants', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getTenantAnalytics
);

// GET /superapp/billings/analytics/trends - Get billing trends
router.get('/billings/analytics/trends', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SuperAppBillingController.getBillingTrends
);

module.exports = router;
