const express = require('express');
const router = express.Router();
const TenantReactivationController = require('../controllers/tenantReactivationController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Routes for tenant reactivation (for suspended tenants)
// Note: These routes should NOT use validateSubscription middleware since they're for suspended tenants

// GET /reactivation/info - Get reactivation info for current suspended tenant
router.get('/info', 
    AuthMiddleware.authenticateUser, // Only authenticate, don't validate subscription
    TenantReactivationController.getReactivationInfo
);

// POST /reactivation/reactivate - Reactivate current suspended tenant
router.post('/reactivate', 
    AuthMiddleware.authenticateUser, // Only authenticate, don't validate subscription
    TenantReactivationController.reactivateTenant
);

// SuperApp Admin routes for managing tenant reactivation
// GET /reactivation/admin/:tenantId/status - Get reactivation status for specific tenant
router.get('/admin/:tenantId/status', 
    AuthMiddleware.authenticateUser,
    AuthMiddleware.allow([4]), // superapp-superadmin only
    TenantReactivationController.getReactivationStatus
);

// POST /reactivation/admin/:tenantId/reactivate - Admin force reactivate tenant
router.post('/admin/:tenantId/reactivate', 
    AuthMiddleware.authenticateUser,
    AuthMiddleware.allow([4]), // superapp-superadmin only
    TenantReactivationController.adminReactivateTenant
);

module.exports = router;
