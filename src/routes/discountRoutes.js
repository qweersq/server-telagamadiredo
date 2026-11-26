const express = require('express');
const router = express.Router();

const { DiscountController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/discounts', AuthMiddleware.allow([1,2,4], true), DiscountController.create);
router.get('/discounts', AuthMiddleware.allow([1,2,4], true), DiscountController.getAll);
router.get('/discounts/:id', AuthMiddleware.allow([1,2,4], true), DiscountController.getById);
router.put('/discounts/:id', AuthMiddleware.allow([1,2,4], true), DiscountController.update);
router.delete('/discounts/:id', AuthMiddleware.allow([1,4], true), DiscountController.delete);
router.patch('/discounts/:id/toggle-status', AuthMiddleware.allow([1,2,4], true), DiscountController.toggleStatus);

module.exports = router;