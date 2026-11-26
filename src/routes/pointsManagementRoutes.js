const express = require('express');
const router = express.Router();
const PointsManagementController = require('../controllers/pointsManagementController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware
router.use(AuthMiddleware.authenticateUser);

// Recalculate points for customer(s)
router.post('/points-management/recalculate', AuthMiddleware.allow([1, 4]), PointsManagementController.recalculatePoints);

// Reset points for customer(s)
router.post('/points-management/reset', AuthMiddleware.allow([1, 4]), PointsManagementController.resetPoints);

module.exports = router;

