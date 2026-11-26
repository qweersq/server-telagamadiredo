const express = require('express');
const router = express.Router();

const { CustomerMembershipController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/customer-memberships', AuthMiddleware.allow([1,2,4]), CustomerMembershipController.create);
router.get('/customer-memberships', AuthMiddleware.allow([1,2,4]), CustomerMembershipController.getAll);
router.get('/customer-memberships/:id', AuthMiddleware.allow([1,2,4]), CustomerMembershipController.getById);
router.put('/customer-memberships/:id', AuthMiddleware.allow([1,2,4]), CustomerMembershipController.update);
router.delete('/customer-memberships/:id', AuthMiddleware.allow([1,4]), CustomerMembershipController.delete);

module.exports = router;
