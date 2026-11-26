const express = require('express');
const router = express.Router();
const InvoiceTemplateController = require('../controllers/invoiceTemplateController');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Get invoice templates untuk branch
router.get('/branch/:branchId', AuthMiddleware.allow([1, 2, 4]), InvoiceTemplateController.getBranchTemplates);

// Get template berdasarkan kategori dan branch
router.get('/template/:branchId/:category', AuthMiddleware.allow([1, 2, 4]), InvoiceTemplateController.getTemplateByCategory);

// Create atau update template untuk branch
router.post('/branch/:branchId', AuthMiddleware.allow([1, 2, 4]), InvoiceTemplateController.createOrUpdateTemplate);

// Preview template dengan variables
router.post('/preview', AuthMiddleware.allow([1, 2, 4]), InvoiceTemplateController.previewTemplate);

// Get available variables untuk invoice templates
router.get('/variables', AuthMiddleware.allow([1, 2, 4]), InvoiceTemplateController.getAvailableVariables);

// Test template dengan sample data
router.post('/test', AuthMiddleware.allow([1, 2, 4]), InvoiceTemplateController.testTemplate);

module.exports = router;
