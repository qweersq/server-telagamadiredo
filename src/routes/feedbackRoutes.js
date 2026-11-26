const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');
const { AuthMiddleware } = require('../middlewares');

// Create feedback (all authenticated users)
router.post('/', AuthMiddleware.authenticateUser, FeedbackController.createFeedback);

// Get feedback list (superadmin only)
router.get('/', AuthMiddleware.authenticateUser, AuthMiddleware.requireSuperAdmin, FeedbackController.getFeedbackList);

// Update feedback status (superadmin only)
router.put('/:id/status', AuthMiddleware.authenticateUser, AuthMiddleware.requireSuperAdmin, FeedbackController.updateFeedbackStatus);

module.exports = router;
