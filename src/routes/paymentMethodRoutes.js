const express = require('express');
const router = express.Router();
const PaymentMethodController = require('../controllers/paymentMethodController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware
router.use(AuthMiddleware.authenticateUser);

// Payment Methods CRUD routes
router.get('/', 
  AuthMiddleware.allow([1,2,3,4]), // superapp-superadmin only
  PaymentMethodController.getAll
);

router.get('/:id', 
  AuthMiddleware.allow([1,2,3,4]), // superapp-superadmin only
  PaymentMethodController.getById
);

router.post('/', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  PaymentMethodController.create
);

router.put('/:id', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  PaymentMethodController.update
);

router.delete('/:id', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  PaymentMethodController.delete
);

module.exports = router;
