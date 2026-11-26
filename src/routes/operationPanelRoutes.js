const express = require('express');
const router = express.Router();
const { AuthMiddleware } = require('../middlewares');
const OperationPanelController = require('../controllers/operationPanelController');

router.use(AuthMiddleware.authenticateUser);

router.get('/operation-panel/orders', AuthMiddleware.allow([1,2,3,4], true), OperationPanelController.getOrderDetails);

module.exports = router;
