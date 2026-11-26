const express = require('express');
  const router = express.Router();
  const BillingCheckoutController = require('../controllers/billingCheckoutController');
  const { AuthMiddleware } = require('../middlewares');

  router.post('/checkout', AuthMiddleware.authenticateUser, BillingCheckoutController.checkout);

  module.exports = router;
