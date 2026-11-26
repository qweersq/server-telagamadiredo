const express = require('express');
const router = express.Router();

const { MembershipController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/', AuthMiddleware.allow([1,2,4]), MembershipController.create);
router.get('/', AuthMiddleware.allow([1,2,4]), MembershipController.getAll);
router.get('/:id', AuthMiddleware.allow([1,2,4]), MembershipController.getById);
router.get('/:id/details', AuthMiddleware.allow([1,2,4]), MembershipController.getDetails);
router.put('/:id', AuthMiddleware.allow([1,2,4]), MembershipController.update);
router.delete('/:id', AuthMiddleware.allow([1,4]), MembershipController.delete);
router.patch('/:id/toggle-status', AuthMiddleware.allow([1,2,4]), MembershipController.toggleStatus);

module.exports = router;