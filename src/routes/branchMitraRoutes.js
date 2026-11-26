const express = require('express');
const router = express.Router();

const BranchMitraController = require('../controllers/branchMitraController');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { BranchMitraRelation } = require('../models');

router.use(AuthMiddleware.authenticateUser);

// Create mitra relation (admin & superadmin only)
router.post('/',
    AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, superapp-superadmin
    BranchMitraController.create
);

// Get all mitras for a parent branch
router.get('/parent/:parentBranchId',
    AuthMiddleware.allow([1, 2, 3, 4]), // All roles can view
    BranchMitraController.getMitrasByParent
);

// Get parent branch for a mitra
router.get('/mitra/:mitraBranchId/parent',
    AuthMiddleware.allow([1, 2, 3, 4]), // All roles can view
    BranchMitraController.getParentByMitra
);

// Get relation by ID
router.get('/:relationId',
    AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, superapp-superadmin
    tenantValidation,
    tenantAccessControl(BranchMitraRelation, 'tenant_id'),
    BranchMitraController.getById
);

// Delete mitra relation (admin & superadmin only)
router.delete('/:id',
    AuthMiddleware.allow([1, 2, 4]), // superadmin, admin, superapp-superadmin
    tenantValidation,
    tenantAccessControl(BranchMitraRelation, 'tenant_id'),
    BranchMitraController.delete
);

module.exports = router;
