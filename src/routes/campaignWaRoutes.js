const express = require('express');
const router = express.Router();
const CampaignWaController = require('../controllers/campaignWaController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

/**
 * @route   POST /api/campaigns/wa/connect
 * @desc    Connect WA session for campaign
 * @access  Private
 */
router.post('/connect', CampaignWaController.connectSession);

/**
 * @route   GET /api/campaigns/wa/status
 * @desc    Get campaign WA session status
 * @access  Private
 */
router.get('/status', CampaignWaController.getSessionStatus);

/**
 * @route   GET /api/campaigns/wa/qr
 * @desc    Get QR code for campaign WA session
 * @access  Private
 */
router.get('/qr', CampaignWaController.getQRCode);

/**
 * @route   POST /api/campaigns/wa/disconnect
 * @desc    Disconnect campaign WA session
 * @access  Private
 */
router.post('/disconnect', CampaignWaController.disconnectSession);

/**
 * @route   GET /api/campaigns/wa/sessions
 * @desc    Get campaign WA sessions history
 * @access  Private
 */
router.get('/sessions', CampaignWaController.getSessions);

/**
 * @route   POST /api/campaigns/wa/logout
 * @desc    Logout campaign WA session (destroy session)
 * @access  Private
 */
router.post('/logout', CampaignWaController.logoutSession);

/**
 * @route   POST /api/campaigns/wa/test-message
 * @desc    Send test message through campaign WA session
 * @access  Private
 */
router.post('/test-message', CampaignWaController.sendTestMessage);

module.exports = router;
