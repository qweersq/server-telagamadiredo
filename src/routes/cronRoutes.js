const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const PointController = require('../controllers/pointController');

/**
 * @route   POST /api/cron/update-last-order-date
 * @desc    Update customer last order date (for cron job - no auth required)
 * @access  Public (internal cron only)
 */
router.post('/update-last-order-date', CampaignController.updateLastOrderDate);

/**
 * @route   POST /api/cron/expire-points
 * @desc    Expire points that have passed expiration date (for cron job - no auth required)
 * @access  Public (internal cron only)
 */
router.post('/expire-points', PointController.expirePoints);

module.exports = router;
