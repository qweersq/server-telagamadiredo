const express = require('express');
const router = express.Router();
const waSessionController = require('../controllers/waSessionController');

// Essential WA Session Management Routes
// Get session history for a branch (with pagination)
router.get('/history', waSessionController.getSessionHistory);

// Get session statistics for a branch
router.get('/stats', waSessionController.getSessionStats);

// Cleanup old sessions for a branch (destroy all old sessions before creating new one)
router.post('/cleanup/:branchId', waSessionController.cleanupSessions);

// Get active session for a branch (single active session per branch)
router.get('/active/:branchId', waSessionController.getActiveSession);

module.exports = router;
