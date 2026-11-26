const express = require('express');
const router = express.Router();
const testEmailController = require('../controllers/testEmailController');

// Test routes - Tenant & Billing Creation
router.get('/test-tenant-created', testEmailController.testTenantAccountCreated.bind(testEmailController));
router.get('/test-billing-trial', testEmailController.testBillingCreatedTrial.bind(testEmailController));
router.get('/test-billing-renewal', testEmailController.testBillingCreatedRenewal.bind(testEmailController));
router.get('/test-billing-expired', testEmailController.testBillingExpired.bind(testEmailController));
router.get('/test-billing-paid', testEmailController.testBillingPaid.bind(testEmailController));
router.get('/test-billing-payment', testEmailController.testBillingChoosePayment.bind(testEmailController));

// Test routes - Billing Reminders
router.get('/test-reminder-h3', testEmailController.testReminderH3.bind(testEmailController));
router.get('/test-reminder-h1', testEmailController.testReminderH1.bind(testEmailController));
router.get('/test-reminder-h0', testEmailController.testReminderH0.bind(testEmailController));

module.exports = router;

