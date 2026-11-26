const express = require('express');
const ReferralController = require('../controllers/referralController');
const { AuthMiddleware } = require('../middlewares');

const router = express.Router();

/**
 * Referral Routes
 * All routes require authentication and appropriate roles
 */

// Get referral report
router.get('/referral/report',
  AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, owner
  ReferralController.getReferralReport
);

module.exports = router;

