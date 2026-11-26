const express = require('express');
const router = express.Router();

const IncomeController = require('../controllers/incomeController');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/incomes', AuthMiddleware.allow([1, 2, 4]), IncomeController.create);
router.get('/incomes', AuthMiddleware.allow([1, 2, 4]), IncomeController.getAll);
router.get('/incomes/:id', AuthMiddleware.allow([1, 2, 4]), IncomeController.getById);
router.put('/incomes/:id', AuthMiddleware.allow([1, 2, 4]), IncomeController.update);
router.delete('/incomes/:id', AuthMiddleware.allow([1, 2, 4]), IncomeController.delete);

module.exports = router;
