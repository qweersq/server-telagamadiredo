const express = require('express');
const router = express.Router();
const { InactiveTenantsTripayController } = require('../controllers/inactiveTenantsTripayController');
const EncryptedDataMiddleware = require('../middlewares/encryptedDataMiddleware');

/**
 * INACTIVE TENANTS TRIPAY ROUTES
 * 
 * Routes khusus untuk Tripay payment integration untuk inactive tenants
 * Menggunakan encrypted data authentication (tidak perlu JWT token)
 * 
 * Semua routes menggunakan EncryptedDataMiddleware.validateEncryptedData
 */

// ========================================
// PROTECTED ROUTES (Encrypted Data Required)
// ========================================

/**
 * Get available payment channels
 * GET /inactive-tenants/tripay/channels
 * 
 * Mengembalikan daftar channel pembayaran yang tersedia di Tripay
 */
router.get('/channels', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsTripayController.getPaymentChannels);

/**
 * Create Tripay transaction
 * POST /inactive-tenants/tripay/create-transaction
 * 
 * Body:
 * - billing_id: ID billing yang akan dibayar
 * - payment_method: Metode pembayaran (QRIS, BRIVA, dll)
 * 
 * Membuat transaksi baru di Tripay untuk billing yang dipilih
 */
router.post('/create-transaction', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsTripayController.createTransaction);

/**
 * Check transaction status
 * GET /inactive-tenants/tripay/status/:reference
 * 
 * Mengembalikan status transaksi dari Tripay
 */
router.get('/status/:reference', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsTripayController.checkTransactionStatus);

/**
 * Manual check and update transaction status
 * POST /inactive-tenants/tripay/check-status/:billing_id
 * 
 * Mengecek status transaksi dan update database jika ada perubahan
 */
router.post('/check-status/:billing_id', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsTripayController.manualCheckStatus);

/**
 * Handle Tripay callback
 * POST /inactive-tenants/tripay/callback
 * 
 * Webhook endpoint untuk menerima notifikasi dari Tripay
 */
router.post('/callback', InactiveTenantsTripayController.handleCallback);

/**
 * Get transaction history
 * GET /inactive-tenants/tripay/history
 * 
 * Mengembalikan history transaksi Tripay untuk tenant
 */
router.get('/history', EncryptedDataMiddleware.validateEncryptedData, InactiveTenantsTripayController.getTransactionHistory);

module.exports = router;
