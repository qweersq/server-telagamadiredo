const express = require('express');
const router = express.Router();
const TenantPaymentController = require('../controllers/tenantPaymentController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const { RoleHelper } = require('../helpers');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// GET /tenant-payments - Get all tenant payments
router.get('/', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getAll
);

// GET /tenant-payments/pending - Get pending payments
router.get('/pending', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getPendingPayments
);

// GET /tenant-payments/overdue - Get overdue payments
router.get('/overdue', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getOverduePayments
);

// GET /tenant-payments/stats/tabs - Get tab statistics
router.get('/stats/tabs', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getTabStats
);

// POST /tenant-payments/submit-payment - Submit payment with unique code
router.post('/submit-payment',
    AuthMiddleware.allow([1, 2]), // superadmin, admin (tenant owners)
    TenantPaymentController.submitPayment
);

// GET /tenant-payments/subscription/:subscription_id - Get payments by subscription
router.get('/subscription/:subscription_id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getBySubscription
);

// GET /tenant-payments/tenant/:tenant_id - Get payments by tenant
router.get('/tenant/:tenant_id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getByTenant
);

// GET /tenant-payments/:id - Get tenant payment by ID
router.get('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getById
);

// GET /tenant-payments/:id/stats - Get payment statistics
router.get('/:id/stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.getPaymentStats
);

// POST /tenant-payments - Create new tenant payment
router.post('/', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.create
);

// PUT /tenant-payments/:id - Update tenant payment
router.put('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.update
);

// PATCH /tenant-payments/:id/status - Update payment status
router.patch('/:id/status', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.updateStatus
);

// PATCH /tenant-payments/:id/mark-paid - Mark payment as paid
router.patch('/:id/mark-paid', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.markAsPaid
);

// PATCH /tenant-payments/:id/refund - Refund payment
router.patch('/:id/refund', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.refundPayment
);

// DELETE /tenant-payments/:id - Delete tenant payment
router.delete('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantPaymentController.delete
);

// GET /tenant-payments/available-plans - Get available subscription plans for billing
router.get('/available-plans',
    AuthMiddleware.allow([1, 2, 3, 4]), // all roles
    TenantPaymentController.getAvailablePlans
);

// PATCH /tenant-payments/:id/change-plan - Change subscription plan for billing
router.patch('/:id/change-plan',
    AuthMiddleware.allow([1, 2, 3, 4]), // all roles
    TenantPaymentController.changePlan
);

module.exports = router;
