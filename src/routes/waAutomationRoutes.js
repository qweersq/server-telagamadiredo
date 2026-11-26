const express = require('express');
const router = express.Router();
const waAutomationController = require('../controllers/waAutomationController');

// Essential WA Operations Routes
// Session Management (simplified)
router.post('/wa/session/create', waAutomationController.createSession);
router.delete('/wa/session/destroy', waAutomationController.destroySession);

// WhatsApp Status & QR Code
router.get('/wa/status', waAutomationController.getStatus);
router.get('/wa/qr', waAutomationController.getQRCode);

// Message Routes
router.post('/wa/send-message', waAutomationController.sendMessage);
router.post('/wa/send-file', waAutomationController.sendMessageWithFile);

// Notification Routes (for business operations)
router.post('/wa-automation/notify-item-done', waAutomationController.notifyItemDone);
router.post('/wa-automation/notify-item-done-all', waAutomationController.notifyItemDoneAll);

module.exports = router; 