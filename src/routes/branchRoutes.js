const express = require('express');
const router = express.Router();

const { BranchController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { Branch } = require('../models');

router.use(AuthMiddleware.authenticateUser);

// CRUD Branches
router.post('/branches', AuthMiddleware.allow([1, 2, 4]), BranchController.create);
router.get('/branches', AuthMiddleware.allow([1, 2, 4]), BranchController.getAll);
router.get('/branches/:id', 
  AuthMiddleware.allow([1, 2, 4]), 
  tenantValidation, 
  tenantAccessControl(Branch, 'tenant_id'), 
  BranchController.getById
);
router.put('/branches/:id', 
  AuthMiddleware.allow([1, 2, 4]), 
  tenantValidation, 
  tenantAccessControl(Branch, 'tenant_id'), 
  BranchController.update
);
router.delete('/branches/:id', 
  AuthMiddleware.allow([1, 2, 4]), 
  tenantValidation, 
  tenantAccessControl(Branch, 'tenant_id'), 
  BranchController.delete
);

// Get branches by tenant (untuk superapp-superadmin)
// Role 5 (supervisor) ikut diizinkan karena branchService web memakai endpoint ini
// untuk mengisi modal "Pilih Cabang" saat ganti cabang. Controller-nya sendiri
// selalu memakai tenant_id dari token (bukan dari URL), jadi tetap aman per tenant.
router.get('/tenants/:tenant_id/branches', AuthMiddleware.allow([1, 4, 5]), BranchController.getByTenant);

// Get branch statistics
router.get('/branches/stats', AuthMiddleware.allow([1, 2, 4]), BranchController.getStats);

// Get comprehensive branch detail
router.get('/branches-detail/:id', AuthMiddleware.allow([1, 2, 4]), BranchController.getDetail);

module.exports = router;