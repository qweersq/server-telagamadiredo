const express = require('express');
const router = express.Router();

const { PaymentController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { Payment } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.get('/payments/details/:id',
  AuthMiddleware.allow([1, 2, 4]),
  tenantValidation,
  tenantAccessControl(Payment, 'tenant_id'),
  PaymentController.getPaymentDetailsByPaymentId
);
router.post('/payments', AuthMiddleware.allow([1, 2, 4]), PaymentController.create);
router.get('/payments', AuthMiddleware.allow([1, 2, 4]), PaymentController.getAll);
router.get('/payments/:id',
  AuthMiddleware.allow([1, 2, 4]),
  tenantValidation,
  tenantAccessControl(Payment, 'tenant_id'),
  PaymentController.getById
);
router.put('/payments/:id',
  AuthMiddleware.allow([1, 2, 4]),
  tenantValidation,
  tenantAccessControl(Payment, 'tenant_id'),
  PaymentController.update
);
router.delete('/payments/:id',
  AuthMiddleware.allow([1, 4]),
  tenantValidation,
  tenantAccessControl(Payment, 'tenant_id'),
  PaymentController.delete
);

// Edit payment detail date - only superadmin
router.patch('/payment-details/:id/date',
  AuthMiddleware.allow([1, 4]),
  tenantValidation,
  PaymentController.updatePaymentDetailDate
);

module.exports = router;