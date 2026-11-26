const express = require('express');
const router = express.Router();

const { AiDetectionController } = require('../controllers');
const { AuthMiddleware, AiCreditMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/ai/detect-items', AuthMiddleware.allow([1,2,3,4]), AiCreditMiddleware.checkCredit, AiDetectionController.detectItems);
router.post('/ai/detect-item-details', AuthMiddleware.allow([1,2,3,4]), AiCreditMiddleware.checkCredit, AiDetectionController.detectItemDetails);

module.exports = router;
