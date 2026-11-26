const express = require('express');
const router = express.Router();
const ActiveTenantPlanController = require('../controllers/activeTenantPlanController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Plan change routes
router.post('/active-tenant-plan/change-plan', 
    AuthMiddleware.authenticateUser,
    ActiveTenantPlanController.changePlan
);

// Get available plans
router.get('/active-tenant-plan/available-plans',
    AuthMiddleware.authenticateUser,
    ActiveTenantPlanController.getAvailablePlans
);

// Get current subscription
router.get('/active-tenant-plan/current-subscription/:tenant_id',
    AuthMiddleware.authenticateUser,
    ActiveTenantPlanController.getCurrentSubscription
);

module.exports = router;
