const express = require('express');
const PointReportController = require('../controllers/pointReportController');
const { AuthMiddleware } = require('../middlewares');

const router = express.Router();

/**
 * Point Report Routes
 * All routes require authentication and appropriate roles
 */

// Get point report
router.get('/points/report',
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  PointReportController.getPointReport
);

module.exports = router;

