const express = require('express');
const router = express.Router();

const { AiDashboardController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.get('/ai-analysis', AuthMiddleware.allow([1,4]), AiDashboardController.generateAIAnalysis);

module.exports = router;