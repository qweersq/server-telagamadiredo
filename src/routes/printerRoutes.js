const express = require('express');
const router = express.Router();

const { PrinterController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// Printer CRUD operations
router.post('/printers', AuthMiddleware.allow([1, 2, 4]), PrinterController.create);
router.get('/printers', AuthMiddleware.allow([1, 2, 4]), PrinterController.getAll);
router.get('/printers/:id', AuthMiddleware.allow([1, 2, 4]), PrinterController.getById);
router.put('/printers/:id', AuthMiddleware.allow([1, 2, 4]), PrinterController.update);
router.delete('/printers/:id', AuthMiddleware.allow([1, 2, 4]), PrinterController.delete);

// Branch-specific printer operations
router.get('/printers/branch/:branch_id', AuthMiddleware.allow([1, 2, 4]), PrinterController.getByBranch);
router.get('/printers/branch/:branch_id/default', AuthMiddleware.allow([1, 2, 4]), PrinterController.getDefaultPrinter);

// Printer management operations
router.put('/printers/:id/set-default', AuthMiddleware.allow([1, 2, 4]), PrinterController.setDefaultPrinter);
router.put('/printers/:id/status', AuthMiddleware.allow([1, 2, 4]), PrinterController.updateStatus);
router.post('/printers/:id/test-connection', AuthMiddleware.allow([1, 2, 4]), PrinterController.testConnection);

// Printer discovery and connection
router.post('/printers/discover', AuthMiddleware.allow([1, 2, 4]), PrinterController.discoverPrinters);
router.post('/printers/connect', AuthMiddleware.allow([1, 2, 4]), PrinterController.connectPrinter);

// Printer statistics
router.get('/printers/stats', AuthMiddleware.allow([1, 2, 4]), PrinterController.getStats);

module.exports = router;
