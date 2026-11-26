const express = require('express');
const router = express.Router();

const { UserController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { User } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/users', AuthMiddleware.allow([1, 4, 5]), UserController.create);
router.get('/users', AuthMiddleware.allow([1,2,3,4]), UserController.getAll);
router.get('/users/:id', 
  AuthMiddleware.allow([1,4,5]), 
  tenantValidation, 
  tenantAccessControl(User, 'tenant_id'), 
  UserController.getById
);
router.put('/users/:id', 
  AuthMiddleware.allow([1,4,5]), 
  tenantValidation, 
  tenantAccessControl(User, 'tenant_id'), 
  UserController.update
);
router.put('/users/:id/change-password', 
  AuthMiddleware.allow([1,4,5]), 
  tenantValidation, 
  tenantAccessControl(User, 'tenant_id'), 
  UserController.changePassword
);
router.delete('/users/:id', 
  AuthMiddleware.allow([1,4,5]), 
  tenantValidation, 
  tenantAccessControl(User, 'tenant_id'), 
  UserController.delete
);

module.exports = router;