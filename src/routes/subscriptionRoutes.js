const express = require('express');
const router = express.Router();
const SubscriptionController = require('../controllers/subscriptionController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const { RoleHelper, ResponseHelper } = require('../helpers');
const { PhotoUploaderMiddleware } = require('../middlewares');
const path = require('path');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// GET /subscriptions - Get all subscriptions
router.get('/', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.getAll
);

// GET /subscriptions/active - Get active subscriptions
router.get('/active', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.getActiveSubscriptions
);

// GET /subscriptions/expired - Get expired subscriptions
router.get('/expired', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.getExpiredSubscriptions
);

// GET /subscriptions/tenant/:tenant_id - Get subscriptions by tenant
router.get('/tenant/:tenant_id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.getByTenant
);

// GET /subscriptions/my-status - Get current user's subscription status
router.get('/my-status', 
    AuthMiddleware.allow([1, 2]), // superadmin, admin
    SubscriptionController.getMySubscriptionStatus
);

// GET /subscriptions/check-pending-payment - Check if user has pending payment
router.get('/check-pending-payment', 
    AuthMiddleware.allow([1, 2]), // superadmin, admin
    SubscriptionController.checkPendingPayment
);

// GET /subscriptions/check-order-limit - Check order limit for current month
router.get('/check-order-limit', 
    AuthMiddleware.allow([1, 2, 3]), // superadmin, admin, employee
    SubscriptionController.checkOrderLimit
);

// POST /subscriptions/submit-payment - Submit payment proof
// Configure multer for payment proof upload
const paymentProofUpload = PhotoUploaderMiddleware.configureUpload({ 
    pathFolder: path.join('./public/images', 'payment-proofs') 
});

router.post('/submit-payment', 
    AuthMiddleware.allow([1, 2]), // superadmin, admin
    paymentProofUpload.single('payment_proof'),
    SubscriptionController.submitPayment
);

// Error handling for multer
router.use((err, req, res, next) => {
    if (err.status === 400 && err.message.includes('Forbidden file type')) {
        return res.status(400).json(ResponseHelper.errorResponse('File type is not allowed. Only JPG and PNG images are accepted.'));
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json(ResponseHelper.errorResponse('File size too large. Maximum size is 10MB.'));
    } else {
        return res.status(500).json(ResponseHelper.errorResponse(err.message));
    }
});

// GET /subscriptions/:id - Get subscription by ID
router.get('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.getById
);

// GET /subscriptions/:id/stats - Get subscription statistics
router.get('/:id/stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.getSubscriptionStats
);

// POST /subscriptions - Create new subscription
router.post('/', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.create
);

// PUT /subscriptions/:id - Update subscription
router.put('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.update
);

// PATCH /subscriptions/:id/status - Update subscription status
router.patch('/:id/status', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.updateStatus
);

// PATCH /subscriptions/:id/renew - Renew subscription
router.patch('/:id/renew', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.renewSubscription
);

// PATCH /subscriptions/:id/cancel - Cancel subscription
router.patch('/:id/cancel', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.cancelSubscription
);

// DELETE /subscriptions/:id - Delete subscription
router.delete('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionController.delete
);

module.exports = router;
