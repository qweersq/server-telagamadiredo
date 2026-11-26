const express = require('express');
const router = express.Router();

const { ItemController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { Item } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/items', AuthMiddleware.allow([1,2,3,4], true), ItemController.create);
router.post('/items/bulk-create', AuthMiddleware.allow([1,2,3,4], true), ItemController.bulkCreate);
router.get('/items', AuthMiddleware.allow([1,2,3,4], true), ItemController.getAll);
router.get('/items-search', AuthMiddleware.allow([1,2,3,4], true), ItemController.searchItemsWithRelevance);
router.get('/items/:id', 
  AuthMiddleware.allow([1,2,3,4], true), 
  tenantValidation, 
  tenantAccessControl(Item, 'tenant_id'), 
  ItemController.getById
);
router.put('/items/:id', 
  AuthMiddleware.allow([1,2,3,4], true), 
  tenantValidation, 
  tenantAccessControl(Item, 'tenant_id'), 
  ItemController.update
);
router.delete('/items/:id', 
  AuthMiddleware.allow([1,2,3,4], true), 
  tenantValidation, 
  tenantAccessControl(Item, 'tenant_id'), 
  ItemController.delete
);

module.exports = router;