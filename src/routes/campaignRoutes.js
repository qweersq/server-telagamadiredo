const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

/**
 * @route   POST /api/campaigns
 * @desc    Create new campaign
 * @access  Private
 */
router.post('/', CampaignController.createCampaign);

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with pagination
 * @access  Private
 */
router.get('/', CampaignController.getCampaigns);

/**
 * @route   GET /api/campaigns/customer-count
 * @desc    Get customer count statistics
 * @access  Private
 */
router.get('/customer-count', CampaignController.getCustomerCount);

/**
 * @route   GET /api/campaigns/customer-count-preview
 * @desc    Get customer count preview for targeting
 * @access  Private
 */
router.get('/customer-count-preview', CampaignController.getCustomerCountPreview);

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private
 */
router.get('/:id', CampaignController.getCampaignById);

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update campaign
 * @access  Private
 */
router.put('/:id', CampaignController.updateCampaign);

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete campaign
 * @access  Private
 */
router.delete('/:id', CampaignController.deleteCampaign);

/**
 * @route   POST /api/campaigns/:id/start
 * @desc    Start campaign execution
 * @access  Private
 */
router.post('/:id/start', CampaignController.startCampaign);

/**
 * @route   POST /api/campaigns/:id/pause
 * @desc    Pause campaign
 * @access  Private
 */
router.post('/:id/pause', CampaignController.pauseCampaign);

/**
 * @route   POST /api/campaigns/:id/resume
 * @desc    Resume campaign
 * @access  Private
 */
router.post('/:id/resume', CampaignController.resumeCampaign);

/**
 * @route   GET /api/campaigns/:id/progress
 * @desc    Get campaign progress
 * @access  Private
 */
router.get('/:id/progress', CampaignController.getCampaignProgress);

/**
 * @route   GET /api/campaigns/:id/customers
 * @desc    Get campaign customers
 * @access  Private
 */
router.get('/:id/customers', CampaignController.getCampaignCustomers);

/**
 * @route   POST /api/campaigns/:id/reset
 * @desc    Reset campaign (after cooldown period)
 * @access  Private
 */
router.post('/:id/reset', CampaignController.resetCampaign);

/**
 * @route   POST /api/campaigns/update-last-order-date
 * @desc    Update customer last order date (for cron job)
 * @access  Private
 */
router.post('/update-last-order-date', CampaignController.updateLastOrderDate);

/**
 * @route   POST /api/campaigns/cron/process-batch
 * @desc    Process campaign batch for cron job (1 customer per campaign per cron run)
 * @access  Private
 */
router.post('/cron/process-batch', CampaignController.processCampaignBatch);

module.exports = router;
