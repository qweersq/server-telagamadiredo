const express = require('express');
const router = express.Router();

const { FinanceTransactionController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/finance-transactions', AuthMiddleware.allow([1,2,4]), FinanceTransactionController.create);
router.get('/finance-transactions', AuthMiddleware.allow([1,2,4]), FinanceTransactionController.getAll);
router.put('/finance-transactions/:id', AuthMiddleware.allow([1,2,4]), FinanceTransactionController.update);
// router.post('/income-outside-orders', AuthMiddleware.allow([1, 2, 4]), FinanceTransactionController.createIncomeOutsideOrders);
// router.post('/cash-to-bank', AuthMiddleware.allow([1,2,4]), FinanceTransactionController.transferCashToBca);


module.exports = router;