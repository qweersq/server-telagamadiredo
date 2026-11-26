const express = require('express');
const router = express.Router();

const { OrderDetailController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const OrderDetailStatusLogController = require('../controllers/orderDetailStatusLogController');
const tenantValidation = require('../middleware/tenantValidation');
const orderDetailAccessControl = require('../middleware/orderDetailAccessControl');
const { OrderDetail } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/order-details', AuthMiddleware.allow([1, 2, 3, 4]), OrderDetailController.create);
router.get('/order-details', AuthMiddleware.allow([1, 2, 3, 4]), OrderDetailController.getAll);
router.get('/order-details/:id', 
  AuthMiddleware.allow([1, 2, 3, 4]), 
  tenantValidation, 
  orderDetailAccessControl, 
  OrderDetailController.getById
);
router.put('/order-details/:id', 
  AuthMiddleware.allow([1, 2, 3, 4]), 
  tenantValidation, 
  orderDetailAccessControl, 
  OrderDetailController.update
);
router.delete('/order-details/:id', 
  AuthMiddleware.allow([1, 4]), 
  tenantValidation, 
  orderDetailAccessControl, 
  OrderDetailController.delete
);
router.post('/order-detail-process/:id', AuthMiddleware.allow([1, 2, 3, 4]), OrderDetailController.orderDetailProcess);
router.delete('/order-detail-process/:id/cancel', AuthMiddleware.allow([1, 2, 3, 4]), OrderDetailController.cancelOnProgress);

// GET /order-detail-status-log/:order_detail_id/history
router.get('/order-detail-status-log/:order_detail_id/history', AuthMiddleware.allow([1,2,3,4]), OrderDetailStatusLogController.getHistoryByOrderDetailId);

// GET /order-details/:id/photo-history
router.get('/order-details/:id/photo-history', 
  AuthMiddleware.allow([1, 2, 3, 4]), 
  OrderDetailController.getPhotoHistory
);

module.exports = router;