const express = require('express');
const router = express.Router();
const WaConnectionController = require('../controllers/waConnectionController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Create WhatsApp connection
router.post('/create', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.createConnection
);

// Get QR code for connection
router.get('/:connectionId/qr', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.getQRCode
);

// Check connection status
router.get('/:connectionId/status', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.checkStatus
);

// Send message through connection
router.post('/:connectionId/send-message', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.sendMessage
);

// Get connection history by type
router.get('/history/:connection_type', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.getConnectionHistory
);

// Get connection statistics by type
router.get('/stats/:connection_type', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.getConnectionStats
);

// Cleanup old connections by type
router.post('/cleanup/:connection_type', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.cleanupConnections
);

// Get active connection by type
router.get('/active/:connection_type', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.getActiveConnection
);

// Destroy connection
router.delete('/:connectionId', 
  AuthMiddleware.allow([4]), // superapp-superadmin only
  WaConnectionController.destroyConnection
);

module.exports = router;
