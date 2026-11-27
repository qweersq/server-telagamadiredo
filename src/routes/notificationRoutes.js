const express = require('express');
const router = express.Router();

const NotificationController = require('../controllers/notificationController');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Stream SSE notifikasi pesanan baru (dapur / kasir / antrian).
// Browser memakai `new EventSource(url + '?token=' + token)`.
router.get(
  '/notifications/orders/stream',
  AuthMiddleware.allow([1, 2, 3, 4]),
  NotificationController.streamOrderEvents
);

module.exports = router;
