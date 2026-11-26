const express = require('express');
const router = express.Router();

const { DashboardController, DashboardProfitOverviewController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.get('/genereteDashboardOverview', AuthMiddleware.allow([1,4]), DashboardController.genereteDashboardOverview);
router.get('/genereteDashboardProfitOverview', AuthMiddleware.allow([1,4]), DashboardProfitOverviewController.dashboardProfitOverview);
router.get('/genereteDashboardFinanceReport', AuthMiddleware.allow([1,2,4]), DashboardController.generateFinanceReport);
router.get('/genereteDashboardOperasionalReport', AuthMiddleware.allow([1,4]), DashboardController.generateStatusReport);

module.exports = router;