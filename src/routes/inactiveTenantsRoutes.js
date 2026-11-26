const express = require('express');
const router = express.Router();
const { InactiveTenantsController, upload } = require('../controllers/inactiveTenantsController');
const EncryptedDataMiddleware = require('../middlewares/encryptedDataMiddleware');

/**
 * INACTIVE TENANTS ROUTES
 * 
 * Routes khusus untuk tenant yang statusnya suspended atau expired
 * Menggunakan encrypted data authentication (tidak perlu JWT token)
 * 
 * Semua routes menggunakan EncryptedDataMiddleware.validateEncryptedData
 * kecuali getSubscriptionPlans yang bisa diakses tanpa auth
 */

// ========================================
// PUBLIC ROUTES (No Authentication Required)
// ========================================

/**
 * Get all available subscription plans
 * GET /inactive-tenants/subscription-plans
 * 
 * Public endpoint - bisa diakses tanpa authentication
 * Untuk menampilkan pilihan subscription plans
 */
router.get('/subscription-plans', InactiveTenantsController.getSubscriptionPlans);

// ========================================
// PROTECTED ROUTES (Encrypted Data Required)
// ========================================

/**
 * Get tenant status and subscription info
 * GET /inactive-tenants/status
 * 
 * Mengembalikan informasi lengkap tentang tenant, user, dan subscription
 * Digunakan untuk menampilkan status di halaman billing payment
 */
router.get('/status', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsController.getTenantStatus);

/**
 * Get billing status and pending billings
 * GET /inactive-tenants/billing-status
 * 
 * Mengembalikan status billing dan daftar billing yang belum dibayar
 * Digunakan untuk menampilkan tagihan yang perlu dibayar
 */
router.get('/billing-status', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsController.getBillingStatus);

/**
 * Get billing history with pagination
 * GET /inactive-tenants/billing-history
 * 
 * Query parameters:
 * - page: Halaman (default: 1)
 * - limit: Jumlah item per halaman (default: 10)
 * - status: Filter berdasarkan status (unpaid, pending, paid, failed)
 * 
 * Mengembalikan history billing dengan pagination dan stats
 */
router.get('/billing-history', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsController.getBillingHistory);

/**
 * Change subscription plan
 * POST /inactive-tenants/change-plan
 * 
 * Body:
 * - plan_id: ID subscription plan yang dipilih
 * - notes: Catatan tambahan (optional)
 * 
 * Membuat subscription baru dan billing untuk plan yang dipilih
 */
router.post('/change-plan', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsController.changePlan);

/**
 * Generate unique payment code
 * POST /inactive-tenants/generate-payment-code
 * 
 * Body (application/json):
 * - billing_id: ID billing yang akan dibuat kode unik
 * 
 * Generate kode unik pembayaran (101-499, no zeros) dan update amount billing
 */
router.post('/generate-payment-code', 
  EncryptedDataMiddleware.validateEncryptedData,
  InactiveTenantsController.generatePaymentCode
);

/**
 * Submit payment proof
 * POST /inactive-tenants/submit-payment
 * 
 * Body (application/json):
 * - billing_id: ID billing yang akan dibayar
 * - bank_name: Nama bank
 * - account_number: Nomor rekening
 * - account_holder: Nama pemegang rekening
 * - amount: Jumlah yang dibayar
 * - notes: Catatan pembayaran
 * 
 * Konfirmasi pembayaran dan update status billing menjadi pending
 */
router.post('/submit-payment', 
  EncryptedDataMiddleware.validateEncryptedData,
  InactiveTenantsController.submitPayment
);

/**
 * Check payment status
 * GET /inactive-tenants/payment-status/:billing_id
 * 
 * Mengembalikan status pembayaran untuk billing tertentu
 * Digunakan untuk mengecek apakah pembayaran sudah dikonfirmasi admin
 */
router.get('/payment-status/:billing_id', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsController.checkPaymentStatus);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

/**
 * Handle multer errors (file upload errors)
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: {
          message: 'File size too large. Maximum size is 5MB.'
        }
      });
    }
  }
  
  if (error.message === 'Only JPEG, PNG, and PDF files are allowed') {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: {
        message: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.'
      }
    });
  }
  
  next(error);
});

/**
 * Handle general errors
 */
router.use((error, req, res, next) => {
  console.error('❌ InactiveTenantsRoutes - Error:', error);
  
  res.status(500).json({
    success: false,
    statusCode: 500,
    error: {
      message: 'Internal server error'
    }
  });
});

module.exports = router;
