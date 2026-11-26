const express = require('express');
const router = express.Router();

const { FinanceTransferController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Create transfer between accounts
router.post('/finance/transfer', AuthMiddleware.allow([1,2,4]), FinanceTransferController.create);

// Get transfer history
router.get('/finance/transfer/history', AuthMiddleware.allow([1,2,4]), FinanceTransferController.getHistory);

module.exports = router;
