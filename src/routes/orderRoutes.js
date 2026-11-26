const express = require('express');
const router = express.Router();

const { OrderController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { Order } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/orders', AuthMiddleware.allow([1, 2, 4], true), OrderController.create);
router.get('/orders', AuthMiddleware.allow([1, 2, 3, 4], true), OrderController.getAll);
router.get('/orders-new', AuthMiddleware.allow([1, 2, 3, 4], true), OrderController.getAllNew);
router.get('/orders/:id',
  AuthMiddleware.allow([1, 2, 3, 4], true),
  tenantValidation,
  tenantAccessControl(Order, 'tenant_id'),
  OrderController.getById
);
router.put('/orders/:id',
  AuthMiddleware.allow([1, 2, 4], true),
  tenantValidation,
  tenantAccessControl(Order, 'tenant_id'),
  OrderController.update
);
router.patch('/orders/:id/mark-notified', AuthMiddleware.allow([1, 2, 3, 4], true), OrderController.markNotified);
router.post('/orders/:id/assign-tag-numbers',
  AuthMiddleware.allow([1, 2, 4], true),
  tenantValidation,
  tenantAccessControl(Order, 'tenant_id'),
  OrderController.assignTagNumbers
);
router.delete('/orders/:id',
  AuthMiddleware.allow([1, 2, 4], true),
  tenantValidation,
  tenantAccessControl(Order, 'tenant_id'),
  OrderController.delete
);
router.get('/orders-options', AuthMiddleware.allow([1, 4]), OrderController.getAllWithOption);
router.post('/migrate-old-payments', AuthMiddleware.allow([1, 4]), OrderController.migrateOldPayments);

module.exports = router;