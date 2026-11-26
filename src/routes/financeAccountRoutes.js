const express = require('express');
const router = express.Router();

const { FinanceAccountController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/get-balance-all-account', AuthMiddleware.allow([1,2,4]), FinanceAccountController.getBalanceAllAccount);
router.post('/get-finance-account-trends', AuthMiddleware.allow([1,2,4]), FinanceAccountController.getFinanceAccountTrends);
router.post('/finance-accounts', AuthMiddleware.allow([1,2,4]), FinanceAccountController.create);
router.get('/finance-accounts', AuthMiddleware.allow([1,2,3,4]), FinanceAccountController.getAll);
router.get('/finance-accounts/:id', AuthMiddleware.allow([1,2,3,4]), FinanceAccountController.getById);
router.put('/finance-accounts/:id', AuthMiddleware.allow([1,2,4]), FinanceAccountController.update);
router.delete('/finance-accounts/:id', AuthMiddleware.allow([1,2,4]), FinanceAccountController.delete);
router.post('/finance-accounts/:id/calculate-balance', AuthMiddleware.allow([1,2,4]), FinanceAccountController.calculateBalance);
router.post('/finance-accounts/calculate-all-balances', AuthMiddleware.allow([1,2,4]), FinanceAccountController.calculateAllBalances);

module.exports = router;