const express = require('express');
const router = express.Router();

const PointController = require('../controllers/pointController');
const { AuthMiddleware } = require('../middlewares');
const { Customer } = require('../models');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');

router.use(AuthMiddleware.authenticateUser);

// Get customer points
router.get('/points/customers/:id', 
    AuthMiddleware.allow([1, 2, 4]), 
    tenantValidation, 
    tenantAccessControl(Customer, 'tenant_id'), 
    PointController.getCustomerPoints
);

// Get point transaction history
router.get('/points/customers/:id/history', 
    AuthMiddleware.allow([1, 2, 4]), 
    tenantValidation, 
    tenantAccessControl(Customer, 'tenant_id'), 
    PointController.getPointHistory
);

// Manual adjustment of points (admin only - superadmin & admin)
router.post('/points/adjust', 
    AuthMiddleware.allow([1, 2]), // Only superadmin and admin
    PointController.adjustPoints
);

module.exports = router;
