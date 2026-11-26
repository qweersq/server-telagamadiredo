const express = require('express');
const router = express.Router();

const { MembershipPaymentController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/', AuthMiddleware.allow([1,2,4]), MembershipPaymentController.create);
router.get('/', AuthMiddleware.allow([1,2,4]), MembershipPaymentController.getAll);
router.get('/:id', AuthMiddleware.allow([1,2,4]), MembershipPaymentController.getById);
router.delete('/:id', AuthMiddleware.allow([1,2,4]), MembershipPaymentController.delete);

module.exports = router;
