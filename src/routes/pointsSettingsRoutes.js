const express = require('express');
const router = express.Router();
const PointsSettingsController = require('../controllers/pointsSettingsController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware
router.use(AuthMiddleware.authenticateUser);

// Get points settings for current tenant
router.get('/points-settings', AuthMiddleware.allow([1, 2, 4]), PointsSettingsController.getSettings);

// Update points settings for current tenant
router.put('/points-settings', AuthMiddleware.allow([1, 4]), PointsSettingsController.updateSettings);

module.exports = router;

