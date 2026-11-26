const express = require('express');
const router = express.Router();
const multer = require('multer');

const { CustomerController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const { ResponseHelper } = require('../helpers');
const CsvUploaderMiddleware = require('../middlewares/csvUploaderMiddleware');
const tenantValidation = require('../middleware/tenantValidation');
const tenantAccessControl = require('../middleware/tenantAccessControl');
const { Customer } = require('../models');

router.use(AuthMiddleware.authenticateUser);

// Configure CSV upload middleware
const csvUpload = CsvUploaderMiddleware.configureUpload();

router.post('/customers', AuthMiddleware.allow([1,2,4]), CustomerController.create);
router.get('/search/customers', AuthMiddleware.allow([1,2,4]), CustomerController.searchByName);
router.get('/customers/search', AuthMiddleware.allow([1,2,4]), CustomerController.searchByName);
router.get('/customers/walk-in', AuthMiddleware.allow([1,2,4]), CustomerController.getOrCreateWalkIn);
router.get('/customers', AuthMiddleware.allow([1,2,4]), CustomerController.getAll);
router.get('/customers/with-membership', AuthMiddleware.allow([1,2,4]), CustomerController.getAllWithMembership);
router.get('/customers/without-membership', AuthMiddleware.allow([1,2,4]), CustomerController.getAllWithoutMembership);
router.get('/customers/export', AuthMiddleware.allow([1]), CustomerController.exportCustomers); // ONLY SUPERADMIN
router.get('/customers/export-optimized', AuthMiddleware.allow([1]), CustomerController.exportCustomersOptimized); // BARU! ✅ ONLY SUPERADMIN
// Import CSV - with error handling for multer
router.post('/customers/import', AuthMiddleware.allow([1,2,4]), (req, res, next) => {
    csvUpload.single('file')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).send(ResponseHelper.errorResponse('File terlalu besar. Maksimal 10MB', 400));
                }
                return res.status(400).send(ResponseHelper.errorResponse('Error uploading file: ' + err.message, 400));
            }
            return res.status(400).send(ResponseHelper.errorResponse(err.message, 400));
        }
        next();
    });
}, CustomerController.importCustomers); // Import CSV
router.get('/customers/dormant', AuthMiddleware.allow([1,2,4]), CustomerController.getDormantCustomers);
router.get('/customers/dormant-tabs', AuthMiddleware.allow([1,2,4]), CustomerController.getDormantCustomersByPeriod);
router.get('/customers/dormant-by-period', AuthMiddleware.allow([1,2,4]), CustomerController.getDormantCustomersByPeriodRange);
router.get('/customers/follow_up', AuthMiddleware.allow([1,2,4]), CustomerController.getAllCustomersFollowUp);
router.get('/customers/:id/referral-stats', AuthMiddleware.allow([1,2,4]), CustomerController.getReferralStats);
router.get('/customers/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  tenantAccessControl(Customer, 'tenant_id'), 
  CustomerController.getById
);
router.put('/customers/:id', 
  AuthMiddleware.allow([1,2,4]), 
  tenantValidation, 
  tenantAccessControl(Customer, 'tenant_id'), 
  CustomerController.update
);
router.delete('/customers/:id', 
  AuthMiddleware.allow([1,5]), 
  tenantValidation, 
  tenantAccessControl(Customer, 'tenant_id'), 
  CustomerController.delete
);

module.exports = router;