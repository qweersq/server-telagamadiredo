const express = require('express');
const router = express.Router();

const { FinanceController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Finance Dashboard APIs
router.get('/finance/daily-transactions', AuthMiddleware.allow([1,2,4]), FinanceController.getDailyTransactions);
router.get('/finance/daily-summary', AuthMiddleware.allow([1,2,4]), FinanceController.getDailySummary);
router.get('/finance/account-summary', AuthMiddleware.allow([1,2,4]), FinanceController.getAccountSummary);
router.get('/finance/account-summary-counts', AuthMiddleware.allow([1,2,4]), FinanceController.getAccountSummaryCounts);
router.get('/finance/transaction/:id/detail', AuthMiddleware.allow([1,2,4]), FinanceController.getTransactionDetail);
router.get('/finance/periods', AuthMiddleware.allow([1,2,4]), FinanceController.getPeriods);
router.get('/finance/financial-report', AuthMiddleware.allow([1,2,4]), FinanceController.getFinancialReport);
router.get('/finance/financial-report/pdf', AuthMiddleware.allow([1,2,4]), FinanceController.getFinancialReportPDF);
router.get('/finance/transactions/pdf', AuthMiddleware.allow([1,2,4]), FinanceController.getTransactionsPDF);

module.exports = router;
