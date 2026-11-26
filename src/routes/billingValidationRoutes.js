const express = require('express');
const router = express.Router();
const BillingValidationController = require('../controllers/billingValidationController');
const BillingValidationMiddleware = require('../middlewares/billingValidationMiddleware');

/**
 * BILLING VALIDATION ROUTES
 * 
 * Routes untuk validasi billing dan subscription
 * Menggunakan JWT authentication untuk semua operasi (kecuali cron job)
 */

/**
 * Validate all tenants and send billing reminders (For Cron Job)
 * POST /billing/validate-all
 * 
 * Headers: None (No authentication required - for cron job)
 * Body: None
 * 
 * Generate H-1 trial billing, H-7 renewal billing, dan kirim reminder (H-3, H-1, H-0) ke semua tenant
 * Endpoint ini untuk digunakan oleh cron job otomatis
 */
router.post('/validate-all', BillingValidationController.validateAllTenantsAndSendReminders);

// Apply JWT authentication to all routes below
router.use(BillingValidationMiddleware.authenticateWithJWT);

/**
 * Validate billing for current user's tenant
 * POST /billing/validate
 * 
 * Headers: Authorization: Bearer <jwt_token>
 * Body: None
 * 
 * Validasi billing untuk tenant dari user yang sedang login
 */
router.post('/validate', (req, res) => {
    req.params.tenant_id = req.user.tenant_id;
    return BillingValidationController.validateTenantBilling(req, res);
});

/**
 * Get billing validation status for current user's tenant
 * GET /billing/validation-status
 * 
 * Headers: Authorization: Bearer <jwt_token>
 * Query parameters: None
 * 
 * Mendapatkan status validasi billing untuk tenant dari user yang sedang login
 */
router.get('/validation-status', (req, res) => {
    req.params.tenant_id = req.user.tenant_id;
    return BillingValidationController.getValidationStatus(req, res);
});

/**
 * Force refresh billing validation for current user's tenant
 * POST /billing/refresh-validation
 * 
 * Headers: Authorization: Bearer <jwt_token>
 * Body: None
 * 
 * Memaksa refresh validasi billing untuk tenant dari user yang sedang login
 */
router.post('/refresh-validation', (req, res) => {
    req.params.tenant_id = req.user.tenant_id;
    return BillingValidationController.refreshValidation(req, res);
});

/**
 * Validate billing for specific tenant (Admin)
 * POST /billing/validate/:tenant_id
 * 
 * Headers: Authorization: Bearer <jwt_token>
 * Body: None
 * 
 * Validasi billing untuk tenant tertentu (admin only)
 */
router.post('/validate/:tenant_id', BillingValidationController.validateTenantBilling);

/**
 * Get billing validation status for specific tenant (Admin)
 * GET /billing/validation-status/:tenant_id
 * 
 * Headers: Authorization: Bearer <jwt_token>
 * Query parameters: None
 * 
 * Mendapatkan status validasi billing untuk tenant tertentu (admin only)
 */
router.get('/validation-status/:tenant_id', BillingValidationController.getValidationStatus);

/**
 * Force refresh billing validation for specific tenant (Admin)
 * POST /billing/refresh-validation/:tenant_id
 * 
 * Headers: Authorization: Bearer <jwt_token>
 * Body: None
 * 
 * Memaksa refresh validasi billing untuk tenant tertentu (admin only)
 */
router.post('/refresh-validation/:tenant_id', BillingValidationController.refreshValidation);

module.exports = router;
