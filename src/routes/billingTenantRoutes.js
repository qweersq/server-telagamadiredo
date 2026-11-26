const express = require('express');
const router = express.Router();
const BillingTenantController = require('../controllers/billingTenantController');

// Active tenant routes (no encrypted data required)
router.get('/billing-tenant/active-status/:tenant_id', BillingTenantController.getActiveTenantStatus);
router.get('/billing-tenant/active-history/:tenant_id', BillingTenantController.getActiveTenantBillingHistory);
router.get('/billing-tenant/active-upcoming/:tenant_id', BillingTenantController.getActiveTenantUpcomingBillings);
router.get('/billing-tenant/check-payment/:tenant_id/:billing_id', BillingTenantController.checkPaymentStatus);

module.exports = router;