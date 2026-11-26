const express = require('express');
const router = express.Router();

const { FinanceTransactionController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { FinanceTransaction } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/finance-transactions', AuthMiddleware.allow([1,2,4]), FinanceTransactionController.create);
router.get('/finance-transactions', AuthMiddleware.allow([1,2,4]), FinanceTransactionController.getAll);
router.get('/finance-transactions/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  tenantAccessControl(FinanceTransaction, 'tenant_id'), 
  FinanceTransactionController.getById
);
router.put('/finance-transactions/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  tenantAccessControl(FinanceTransaction, 'tenant_id'), 
  FinanceTransactionController.update
);
router.delete('/finance-transactions/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  tenantAccessControl(FinanceTransaction, 'tenant_id'), 
  FinanceTransactionController.delete
);

module.exports = router;
