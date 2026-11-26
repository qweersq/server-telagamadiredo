const express = require('express');
const router = express.Router();

const { FinanceCategoryController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/finance-categories', AuthMiddleware.allow([1,2,4]), FinanceCategoryController.create);
router.get('/finance-categories', AuthMiddleware.allow([1,2,4]), FinanceCategoryController.getAll);
router.get('/finance-categories/:id', AuthMiddleware.allow([1,2,4]), FinanceCategoryController.getById);
router.put('/finance-categories/:id', AuthMiddleware.allow([1,2,4]), FinanceCategoryController.update);
router.delete('/finance-categories/:id', AuthMiddleware.allow([1,2,4]), FinanceCategoryController.delete);

module.exports = router;