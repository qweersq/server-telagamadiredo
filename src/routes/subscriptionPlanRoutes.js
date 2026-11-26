const express = require('express');
const router = express.Router();
const SubscriptionPlanController = require('../controllers/subscriptionPlanController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const { RoleHelper } = require('../helpers');

// Apply authentication middleware to protected routes
router.use(AuthMiddleware.authenticateUser);

// GET /subscription-plans - Get all subscription plans
router.get('/', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.getAll
);

// GET /subscription-plans/available - Get available subscription plans for tenants
router.get('/available', 
    SubscriptionPlanController.getAvailablePlans
);

// GET /subscription-plans/:id - Get subscription plan by ID
router.get('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.getById
);

// GET /subscription-plans/:id/stats - Get subscription plan statistics
router.get('/:id/stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.getPlanStats
);

// POST /subscription-plans - Create new subscription plan
router.post('/', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.create
);

// PUT /subscription-plans/:id - Update subscription plan
router.put('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.update
);

// PATCH /subscription-plans/:id/toggle-status - Toggle subscription plan status
router.patch('/:id/toggle-status', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.toggleStatus
);

// DELETE /subscription-plans/:id - Delete subscription plan
router.delete('/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    SubscriptionPlanController.delete
);

module.exports = router;
