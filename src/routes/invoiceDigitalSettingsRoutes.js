const express = require('express');
const router = express.Router();
const InvoiceDigitalSettingsController = require('../controllers/invoiceDigitalSettingsController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware
router.use(AuthMiddleware.authenticateUser);

// Get invoice digital settings for current tenant
router.get('/invoice-digital-settings', AuthMiddleware.allow([1, 2, 4]), InvoiceDigitalSettingsController.getSettings);

// Update invoice digital settings for current tenant
router.put('/invoice-digital-settings', AuthMiddleware.allow([1, 4]), InvoiceDigitalSettingsController.updateSettings);

module.exports = router;

