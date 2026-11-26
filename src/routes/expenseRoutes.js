const express = require('express');
const router = express.Router();

const { ExpenseController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/expenses', AuthMiddleware.allow([1,2,4]), ExpenseController.create);
router.post('/expenses-shift', AuthMiddleware.allow([1,2,4]), ExpenseController.createExpenseShift);
router.get('/expenses', AuthMiddleware.allow([1,2,4]), ExpenseController.getAll);
router.get('/expenses-option', AuthMiddleware.allow([1,2,4]), ExpenseController.getExpenseOption);
router.get('/expenses/:id', AuthMiddleware.allow([1,2,4]), ExpenseController.getById);
router.get('/expenses-shift', AuthMiddleware.allow([1,2,4]), ExpenseController.getByShift);
router.put('/expenses/:id', AuthMiddleware.allow([1,2,4]), ExpenseController.update);
router.delete('/expenses/:id', AuthMiddleware.allow([1,2,4]), ExpenseController.delete);

module.exports = router;