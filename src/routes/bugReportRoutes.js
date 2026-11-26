const express = require('express');
const router = express.Router();
const BugReportController = require('../controllers/bugReportController');
const { AuthMiddleware } = require('../middlewares');

// Create bug report (all authenticated users)
router.post('/', AuthMiddleware.authenticateUser, BugReportController.createBugReport);

// Get bug report list (superadmin only)
router.get('/', AuthMiddleware.authenticateUser, AuthMiddleware.requireSuperAdmin, BugReportController.getBugReportList);

// Update bug report status (superadmin only)
router.put('/:id/status', AuthMiddleware.authenticateUser, AuthMiddleware.requireSuperAdmin, BugReportController.updateBugReportStatus);

module.exports = router;
