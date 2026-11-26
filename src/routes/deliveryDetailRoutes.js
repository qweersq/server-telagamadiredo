const express = require('express');
const router = express.Router();

const { DeliveryDetailController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const deliveryDetailAccessControl = require('../middleware/deliveryDetailAccessControl');
const { DeliveryDetail } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/delivery-details', AuthMiddleware.allow([1,2,4]), DeliveryDetailController.create);
router.get('/delivery-details', AuthMiddleware.allow([1,2,4]), DeliveryDetailController.getAll);
router.get('/delivery-details/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  deliveryDetailAccessControl, 
  DeliveryDetailController.getById
);
router.put('/delivery-details/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  deliveryDetailAccessControl, 
  DeliveryDetailController.update
);
router.delete('/delivery-details/:id', 
  AuthMiddleware.allow([1,4]), 
  tenantValidation, 
  deliveryDetailAccessControl, 
  DeliveryDetailController.delete
);

module.exports = router;