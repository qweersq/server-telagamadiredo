const express = require('express');
const router = express.Router();
const SuperAppTenantV2Controller = require('../controllers/superAppTenantV2Controller');
const AuthMiddleware = require('../middlewares/authMiddleware');

/**
 * SuperApp Tenant V2 Routes
 * Simple API for tenant management with trial filtering
 */

// Get trial tenants (status: trial, subscription_status: trial)
router.get('/superapp/tenants/v2/trial', 
  AuthMiddleware.allow([4]), 
  SuperAppTenantV2Controller.getTrialTenants
);

// Get all tenants with simple filtering
router.get('/superapp/tenants/v2', 
  AuthMiddleware.allow([4]), 
  SuperAppTenantV2Controller.getAllTenants
);

// Get tenant stats for dashboard
router.get('/superapp/tenants/v2/stats', 
  AuthMiddleware.allow([4]), 
  SuperAppTenantV2Controller.getTenantStats
);

// Update tenant data
router.put('/superapp/tenants/v2/:id', 
  AuthMiddleware.allow([4]), 
  SuperAppTenantV2Controller.updateTenant
);

module.exports = router;
