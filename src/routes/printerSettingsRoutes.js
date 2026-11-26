const express = require('express');
const router = express.Router();
const PrinterSettingsController = require('../controllers/printerSettingsController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware
router.use(AuthMiddleware.authenticateUser);

// Get printer settings for current tenant
router.get('/printer-settings', AuthMiddleware.allow([1, 2, 4]), PrinterSettingsController.getSettings);

// Update printer settings for current tenant
router.put('/printer-settings', AuthMiddleware.allow([1, 4]), PrinterSettingsController.updateSettings);

module.exports = router;

