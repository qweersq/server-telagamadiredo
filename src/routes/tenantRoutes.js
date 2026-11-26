const express = require('express');
const router = express.Router();

const { TenantController } = require('../controllers');
const TenantStatsController = require('../controllers/tenantStatsController');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { Tenant } = require('../models');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Tenant CRUD operations
router.post('/tenants', AuthMiddleware.allow([1, 4]), TenantController.create);
router.get('/tenants', AuthMiddleware.allow([1, 2, 4]), TenantController.getAll);
router.get('/tenants/:id', 
  AuthMiddleware.allow([1, 2, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.getById
);
router.put('/tenants/:id', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.update
);
router.delete('/tenants/:id', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.delete
);

// Tenant management operations
router.get('/tenants/trial/expired', AuthMiddleware.allow([1, 4]), TenantController.getTrialTenants);
router.get('/tenants/subscriptions/expired', AuthMiddleware.allow([1, 4]), TenantController.getExpiredSubscriptions);
router.put('/tenants/:id/subscription-status', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.updateSubscriptionStatus
);
router.get('/tenants/:id/stats', 
  AuthMiddleware.allow([1, 2, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.getTenantStats
);

// Tenant actions
router.put('/tenants/:id/activate', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.activateTenant
);
router.put('/tenants/:id/suspend', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.suspendTenant
);
router.put('/tenants/:id/extend-trial', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.extendTrial
);

// Tenant dashboard
router.get('/tenants/:id/dashboard', 
  AuthMiddleware.allow([1, 2, 4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.getTenantDashboard
);

// Global statistics (for superapp-superadmin)
router.get('/tenants/global-stats', AuthMiddleware.allow([1]), TenantController.getGlobalStats);

// Verification link generation (for superapp-superadmin)
router.post('/tenants/:id/generate-verification-link', 
  AuthMiddleware.allow([4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.generateVerificationLink
);

// Tenant statistics (for superapp-superadmin)
router.get('/tenants/stats/tab-counts', AuthMiddleware.allow([4]), TenantStatsController.getTabCounts);
router.get('/tenants/stats/detailed', AuthMiddleware.allow([4]), TenantStatsController.getDetailedStats);

// Tenant detail analytics (for superapp-superadmin)
router.get('/tenants/:id/analytics', 
  AuthMiddleware.allow([4]), 
  tenantValidation, 
  tenantAccessControl(Tenant, 'id'), 
  TenantController.getTenantDetailAnalytics
);

module.exports = router;
