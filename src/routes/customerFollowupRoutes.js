const express = require('express');
const router = express.Router();
const CustomerFollowupController = require('../controllers/customerFollowupController');
const CustomerFollowupHistoryController = require('../controllers/customerFollowupHistoryController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/images/followup/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'followup-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Create followup record
router.post('/customer-followups', AuthMiddleware.allow([1,2,4]), CustomerFollowupController.create);

// ── Riwayat follow-up (baru) ──────────────────────────────────────────────
// Log aktivitas follow-up per pesan (filter: bulan, rentang tanggal, status, search)
router.get('/customer-followups/history', AuthMiddleware.allow([1,2,4]), CustomerFollowupHistoryController.getHistory);

// Daftar customer yang sudah pernah di-follow up (agregat per customer)
router.get('/customer-followups/followed-up', AuthMiddleware.allow([1,2,4]), CustomerFollowupHistoryController.getFollowedUpCustomers);

// Ringkasan aktivitas follow-up (kartu statistik)
router.get('/customer-followups/summary', AuthMiddleware.allow([1,2,4]), CustomerFollowupHistoryController.getSummary);

// Detail 1 customer + statistik + timeline follow-up
router.get('/customer-followups/customers/:customer_id/history', AuthMiddleware.allow([1,2,4]), CustomerFollowupHistoryController.getCustomerHistory);

// Get followup statistics
router.get('/customer-followups/statistics', AuthMiddleware.allow([1,2,4]), CustomerFollowupController.getStatistics);

// Mark message as sent (for manual follow-up)
router.post('/customer-followups/mark-sent', AuthMiddleware.allow([1,2,4]), CustomerFollowupController.markAsSent);

// Send follow-up messages to multiple customers (with optional file upload)
router.post('/customer-followups/send-messages', AuthMiddleware.allow([1,2,4]), upload.single('file'), CustomerFollowupController.sendFollowupMessages);

module.exports = router;
