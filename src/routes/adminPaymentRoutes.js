const express = require('express');
const router = express.Router();
const AdminPaymentController = require('../controllers/adminPaymentController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticateUser);

// GET /admin/payments - Get all payments for admin dashboard
router.get('/payments', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.getAllPayments
);

// GET /admin/payments/pending - Get pending payments for review
router.get('/payments/pending', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.getPendingPayments
);

// GET /admin/payments/stats - Get payment statistics
router.get('/payments/stats', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.getPaymentStats
);

// GET /admin/payments/:id - Get payment details
router.get('/payments/:id', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.getPaymentDetails
);

// PATCH /admin/payments/:id/approve - Approve payment
router.patch('/payments/:id/approve', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.approvePayment
);

// PATCH /admin/payments/:id/reject - Reject payment
router.patch('/payments/:id/reject', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.rejectPayment
);

// POST /admin/payments/bulk-approve - Bulk approve payments
router.post('/payments/bulk-approve', 
    AuthMiddleware.allow([4]), // superapp-superadmin only
    AdminPaymentController.bulkApprovePayments
);

module.exports = router;
