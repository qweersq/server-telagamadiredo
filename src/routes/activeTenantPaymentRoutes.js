const express = require('express');
const router = express.Router();
const ActiveTenantPaymentController = require('../controllers/activeTenantPaymentController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const { RoleHelper } = require('../helpers');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Active tenant payment routes (for active tenants only)
router.get('/active-tenant-payment/status/:tenant_id', ActiveTenantPaymentController.getTenantStatus);
router.get('/active-tenant-payment/history/:tenant_id', ActiveTenantPaymentController.getBillingHistory);
router.get('/active-tenant-payment/upcoming/:tenant_id', ActiveTenantPaymentController.getUpcomingBillings);
router.get('/active-tenant-payment/check-payment/:tenant_id/:billing_id', ActiveTenantPaymentController.checkPaymentStatus);
router.get('/active-tenant-payment/subscription-plans', ActiveTenantPaymentController.getSubscriptionPlans);

// Plan change routes
router.post('/active-tenant-payment/change-plan', ActiveTenantPaymentController.changePlan);
router.put('/active-tenant-payment/update-billing/:billing_id', ActiveTenantPaymentController.updateBilling);
router.post('/active-tenant-payment/create-billing', ActiveTenantPaymentController.createBilling);

// Payment code generation
router.post('/active-tenant-payment/generate-payment-code', ActiveTenantPaymentController.generatePaymentCode);

module.exports = router;
