const express = require('express');
const router = express.Router();

const { AuthController, InvoiceController } = require('../controllers');
const { AuthMiddleware, PhotoUploaderMiddleware } = require('../middlewares');
const TenantOrderController = require('../controllers/tenantOrderController');
const SubscriptionPlanController = require('../controllers/subscriptionPlanController');
const SubscriptionController = require('../controllers/subscriptionController');
const TenantReactivationController = require('../controllers/tenantReactivationController');
const TenantPaymentController = require('../controllers/tenantPaymentController');
const path = require('path');

// Public routes (no authentication required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

router.get('/invoice/:token', InvoiceController.getInvoiceByToken);
router.post('/invoice/:token/send', InvoiceController.sendInvoice);
router.get('/invoice/:token/access-logs', InvoiceController.getInvoiceAccessLogs);
router.patch('/invoice/:token/status', InvoiceController.updateInvoiceStatus);

// Tenant registration routes (no authentication required)
router.post('/tenant-orders', TenantOrderController.submitOrder);
router.get('/tenant-orders/:id', TenantOrderController.getOrderById);
router.get('/tenant-orders/status/:status', TenantOrderController.getOrdersByStatus);
// ✅ COMMENTED OUT: OTP and verification routes (not needed anymore)
// router.post('/tenant-orders/send-otp', TenantOrderController.sendOTP);
// router.post('/tenant-orders/verify-and-create', TenantOrderController.verifyOTPAndCreateAccount);

// ✅ COMMENTED OUT: Link verification routes (not needed anymore)
// router.get('/tenant-orders/verify/:token', TenantOrderController.verifyLink);
// router.post('/tenant-orders/resend-verification', TenantOrderController.resendVerificationLink);
// router.get('/tenant-orders/:order_id/verification-status', TenantOrderController.checkVerificationStatus);

// Subscription plan routes (no authentication required)
router.get('/subscription-plans/active', SubscriptionPlanController.getActivePlans);

// Subscription payment routes (no authentication required for suspended tenants)
router.get('/subscriptions/check-pending-payment', SubscriptionController.checkPendingPayment);
router.post('/subscriptions/submit-payment', 
    PhotoUploaderMiddleware.configureUpload({ 
        pathFolder: path.join('./public/images', 'payment-proofs') 
    }).single('payment_proof'),
    SubscriptionController.submitPayment
);

// Simple check pending payment without authentication - just need tenant_id
router.get('/subscriptions/check-pending-simple', SubscriptionController.checkPendingPaymentSimple);

// Subscription status routes (no middleware for suspended tenants)
router.get('/subscriptions/my-status', SubscriptionController.getMySubscriptionStatus);
router.post('/subscriptions/my-status', SubscriptionController.getMySubscriptionStatus);

// Subscription plans routes (no middleware)
router.get('/subscription-plans/available', SubscriptionPlanController.getAvailablePlans);

// Reactivation routes (no middleware for suspended tenants)
router.get('/reactivation/info', TenantReactivationController.getReactivationInfo);
router.post('/reactivation/reactivate', TenantReactivationController.reactivateTenant);

// Active tenant billing routes (no middleware required)
const BillingTenantController = require('../controllers/billingTenantController');
router.get('/billing-tenant/active-status/:tenant_id', BillingTenantController.getActiveTenantStatus);
router.get('/billing-tenant/active-history/:tenant_id', BillingTenantController.getActiveTenantBillingHistory);
router.get('/billing-tenant/active-upcoming/:tenant_id', BillingTenantController.getActiveTenantUpcomingBillings);
router.get('/billing-tenant/check-payment/:tenant_id/:billing_id', BillingTenantController.checkPaymentStatus);

// Tenant payment routes (no middleware for suspended tenants)
router.post('/tenant-payments/submit-payment', TenantPaymentController.submitPayment);
router.get('/tenant-payments/my-payments', TenantPaymentController.getMyPayments);
router.post('/tenant-payments/my-payments', TenantPaymentController.getMyPayments);
router.get('/tenant-payments/upcoming', TenantPaymentController.getUpcomingBillings);
router.post('/tenant-payments/upcoming', TenantPaymentController.getUpcomingBillings);
router.get('/tenant-payments/history', TenantPaymentController.getBillingHistory);
router.post('/tenant-payments/history', TenantPaymentController.getBillingHistory);
router.get('/tenant-payments/available-plans', TenantPaymentController.getAvailablePlans);
router.patch('/tenant-payments/:id/change-plan', TenantPaymentController.changePlan);


router.use(AuthMiddleware.authenticateUser);

router.get('/get-profile', AuthMiddleware.allow([1,2,3,4], true), AuthMiddleware.validateSubscription, AuthController.getProfile);
router.put('/update-profile', AuthMiddleware.allow([1,2,3,4]), AuthController.updateProfile);
router.post('/switch-branch', AuthMiddleware.allow([1, 5]), AuthController.switchBranch);
router.post('/logout', AuthMiddleware.allow([1,2,3,4]), AuthController.logout);
router.delete('/delete-account', AuthMiddleware.allow([1,2,3,4], true), AuthController.deleteAccount);

module.exports = router;