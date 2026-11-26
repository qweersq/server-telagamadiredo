const express = require('express');
const router = express.Router();

const TenantOnboardingController = require('../controllers/tenantOnboardingController');
const { AuthMiddleware } = require('../middlewares');

// All routes require authentication
router.use(AuthMiddleware.authenticateUser);

// Get onboarding status
router.get('/status/:tenant_id', TenantOnboardingController.getOnboardingStatus);

// Complete onboarding (mark as finished)
router.post('/:tenant_id/complete', TenantOnboardingController.completeOnboarding);

// Admin routes (if needed)
router.get('/admin/all', AuthMiddleware.allow([1]), TenantOnboardingController.getAllOnboardings);

module.exports = router;
