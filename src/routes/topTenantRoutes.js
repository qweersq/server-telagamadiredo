const express = require('express');
const router = express.Router();
const TopTenantController = require('../controllers/topTenantController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// All routes require superadmin authentication
router.use(AuthMiddleware.authenticateUser);
router.use(AuthMiddleware.requireSuperAdmin);

/**
 * GET /api/super-app/top-tenants
 * Query params: month, year, limit
 * Get top tenants by omzet
 */
router.get('/', TopTenantController.getTopTenants);

/**
 * GET /api/super-app/top-tenants/:tenantId/branches
 * Query params: month, year
 * Get branch breakdown for a specific tenant
 */
router.get('/:tenantId/branches', TopTenantController.getTenantBranches);

module.exports = router;
