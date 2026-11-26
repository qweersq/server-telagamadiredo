

const express = require('express');
const router = express.Router();

const { InvoiceController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);
router.post('/send-by-order-id', AuthMiddleware.allow([1, 2, 4]), InvoiceController.sendInvoiceByOrderId);
router.get('/url-by-order-id', AuthMiddleware.allow([1, 2, 4]), InvoiceController.getInvoiceUrlByOrderId);
router.get('/preview-by-order-id', AuthMiddleware.allow([1, 2, 4]), InvoiceController.previewInvoiceByOrderId);
router.post('/generate-bulk-july-2025', InvoiceController.generateBulkInvoiceTokenJuly2025);

// WhatsApp status and QR endpoints
router.get('/wa-status', AuthMiddleware.allow([1, 2, 4]), InvoiceController.getWhatsAppStatus);
router.get('/wa-qr', AuthMiddleware.allow([1, 2, 4]), InvoiceController.getWhatsAppQR);


module.exports = router; 