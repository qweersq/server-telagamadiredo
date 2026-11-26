const express = require('express');
const router = express.Router();

const TenantTabController = require('../controllers/tenantTabController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Tab-specific tenant endpoints
router.get('/unverified', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getUnverifiedTenants
);

router.get('/active-trial', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getActiveTrialTenants
);

router.get('/expired-trial', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getExpiredTrialTenants
);

router.get('/active', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getActiveTenants
);

router.get('/expired-tenant', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getExpiredTenants
);

router.get('/last-access-trial', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getLastAccessTrialTenants
);

router.get('/last-access-subscription', 
    AuthMiddleware.allow([4]), // superapp-superadmin
    TenantTabController.getLastAccessSubscriptionTenants
);

module.exports = router;
