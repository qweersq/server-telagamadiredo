const { Tenant, Subscription, SubscriptionPlan, TenantPayment } = require('../models');
const { ResponseHelper } = require('../helpers');
const BillingService = require('../services/billingService');
const AiCreditService = require('../services/AiCreditService');
const axios = require('axios');
const { Op } = require('sequelize');

const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Map product_id from App Store Connect to our subscription_plan_id
const PRODUCT_ID_TO_PLAN_ID = {
  'notasepatu.notalite.bulanan': 2,     // NotaLite 1 bulan
  'notasepatu.notapro.bulanan': 1,       // NotaPro 1 bulan
  'notasepatu.notabusiness.bulanan': 3,  // NotaBusiness 1 bulan
};

// Map product_id from App Store Connect to AI credit amount
const PRODUCT_ID_TO_AI_CREDITS = {
  'notasepatu.aicredit.50': 50,
  'notasepatu.aicredit.100': 100,
  'notasepatu.aicredit.200': 200,
  'notasepatu.aicredit.500': 500,
  'notasepatu.aicredit.1000': 1000,
  'notasepatu.aicredit.2000': 2000,
};

class IapController {
  /**
   * POST /iap/verify-receipt
   * Verify Apple IAP receipt and activate subscription for tenant
   * Body: { receipt_data, product_id, transaction_id, no_receipt }
   */
  static async verifyReceipt(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      const { receipt_data, product_id, transaction_id, no_receipt } = req.body;

      // Validate required fields
      if (!product_id) {
        return res.status(400).send(ResponseHelper.errorResponse('product_id wajib diisi'));
      }

      // ── Cek apakah ini produk AI Credit (consumable) ──
      const aiCredits = PRODUCT_ID_TO_AI_CREDITS[product_id];
      if (aiCredits) {
        return IapController.handleAiCreditPurchase(req, res, {
          tenant_id, receipt_data, product_id, transaction_id, no_receipt, aiCredits
        });
      }

      // Map product_id to subscription_plan_id
      const subscriptionPlanId = PRODUCT_ID_TO_PLAN_ID[product_id];
      if (!subscriptionPlanId) {
        return res.status(400).send(ResponseHelper.errorResponse(
          `product_id tidak dikenal: ${product_id}`
        ));
      }

      // Get the subscription plan
      const plan = await SubscriptionPlan.findByPk(subscriptionPlanId);
      if (!plan) {
        return res.status(404).send(ResponseHelper.errorResponse('Plan tidak ditemukan'));
      }

      // ── Verifikasi receipt ──
      let verificationResult = { valid: false };

      if (no_receipt || !receipt_data) {
        // Mode tanpa receipt: langsung trust dari StoreKit
        console.log('⚠️ IAP - No receipt provided, trusting StoreKit transaction');
        verificationResult = { valid: true, transaction_id: transaction_id || null };
      } else if (IapController.isJwsFormat(receipt_data)) {
        // JWS format (StoreKit 2): decode payload, trust StoreKit
        console.log('✅ IAP - Detected JWS format receipt');
        verificationResult = IapController.decodeJws(receipt_data);
      } else {
        // Legacy base64 receipt format
        verificationResult = await IapController.verifyWithApple(receipt_data);
      }

      if (!verificationResult.valid) {
        return res.status(400).send(ResponseHelper.errorResponse(
          `Verifikasi receipt gagal: ${verificationResult.error}`
        ));
      }

      // Check if transaction was already used (prevent duplicate activation)
      if (transaction_id) {
        const existingPayment = await TenantPayment.findOne({
          where: { payment_reference: transaction_id }
        });
        if (existingPayment) {
          return res.status(409).send(ResponseHelper.errorResponse(
            'Transaksi ini sudah pernah diproses sebelumnya'
          ));
        }
      }

      // Get tenant
      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        return res.status(404).send(ResponseHelper.errorResponse('Tenant tidak ditemukan'));
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // ── Expire semua subscription aktif lain yang berbeda plan ──
      const activeSubscriptions = await Subscription.findAll({
        where: {
          tenant_id,
          plan_id: { [Op.ne]: subscriptionPlanId },
          status: { [Op.in]: ['active', 'trial'] }
        }
      });
      for (const activeSub of activeSubscriptions) {
        activeSub.status = 'expired';
        activeSub.end_date = now;
        activeSub.auto_renew = false;
        await activeSub.save();
      }

      // ── Cari subscription untuk plan ini ──
      let subscription = await Subscription.findOne({
        where: {
          tenant_id,
          plan_id: subscriptionPlanId,
          status: { [Op.in]: ['active', 'trial'] }
        },
        order: [['createdAt', 'DESC']]
      });

      if (subscription) {
        // Subscribe ulang ke plan yang sama → extend dari due date lama
        const newEndDate = new Date(subscription.end_date);
        newEndDate.setDate(newEndDate.getDate() + plan.duration_days);
        subscription.end_date = newEndDate;
        subscription.status = 'active';
        subscription.auto_renew = true;
        await subscription.save();
      } else {
        // Cari subscription expired/pending/cancelled untuk plan ini
        subscription = await Subscription.findOne({
          where: {
            tenant_id,
            plan_id: subscriptionPlanId,
            status: { [Op.in]: ['expired', 'cancelled', 'pending'] }
          },
          order: [['createdAt', 'DESC']]
        });

        if (subscription) {
          // Reaktivasi — start FRESH dari sekarang
          subscription.status = 'active';
          subscription.start_date = now;
          subscription.end_date = endDate;
          subscription.auto_renew = true;
          await subscription.save();
        } else {
          // Bikin subscription baru — start FRESH dari sekarang
          subscription = await Subscription.create({
            tenant_id,
            plan_id: subscriptionPlanId,
            status: 'active',
            start_date: now,
            end_date: endDate,
            auto_renew: true,
            price: plan.price,
            discount_amount: 0,
            final_price: parseFloat(plan.price),
            payment_method: 'apple_iap',
          });
        }
      }

      // Update tenant subscription status
      await Tenant.update(
        {
          subscription_status: 'active',
          status: 'active',
          trial_end_date: null,
        },
        { where: { id: tenant_id } }
      );

      // ── Generate invoice number & create payment (dengan retry) ──
      let payment;
      let invoiceNumber;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          invoiceNumber = await BillingService.generateInvoiceNumber();
          payment = await TenantPayment.create({
            tenant_id,
            subscription_id: subscription.id,
            subscription_plan_id: subscriptionPlanId,
            invoice_number: invoiceNumber,
            amount: parseFloat(plan.price),
            status: 'paid',
            payment_method: 'apple_iap',
            payment_gateway: 'apple_app_store',
            payment_reference: transaction_id || verificationResult.transaction_id || null,
            paid_at: now,
            due_date: endDate,
            notes: `Pembayaran via Apple IAP - ${plan.name} (1 bulan)`,
          });
          break; // sukses
        } catch (createErr) {
          if (createErr.name === 'SequelizeUniqueConstraintError' && attempt < 3) {
            console.warn(`🔄 IAP - Invoice conflict (${invoiceNumber}), retry ${attempt + 1}/3`);
            continue;
          }
          throw createErr;
        }
      }

      return res.status(200).send(ResponseHelper.successResponse({
        subscription_id: subscription.id,
        payment_id: payment.id,
        invoice_number: invoiceNumber,
        plan_name: plan.name,
        amount: parseFloat(plan.price),
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        status: 'active',
      }, 'Langganan berhasil diaktifkan'));

    } catch (error) {
      console.error('❌ IapController.verifyReceipt - Error:', error.message || error);
      if (error.response) {
        console.error('   Response data:', error.response.data);
      }
      return res.status(500).send(ResponseHelper.errorResponse(
        error.message || 'Internal server error'
      ));
    }
  }

  /**
   * Handle AI Credit consumable purchase from Apple IAP
   */
  static async handleAiCreditPurchase(req, res, { tenant_id, receipt_data, product_id, transaction_id, no_receipt, aiCredits }) {
    try {
      // ── Verifikasi receipt ──
      let verificationResult = { valid: false };

      if (no_receipt || !receipt_data) {
        console.log('⚠️ IAP AI Credit - No receipt provided, trusting StoreKit transaction');
        verificationResult = { valid: true, transaction_id: transaction_id || null };
      } else if (IapController.isJwsFormat(receipt_data)) {
        console.log('✅ IAP AI Credit - Detected JWS format receipt');
        verificationResult = IapController.decodeJws(receipt_data);
      } else {
        verificationResult = await IapController.verifyWithApple(receipt_data);
      }

      if (!verificationResult.valid) {
        return res.status(400).send(ResponseHelper.errorResponse(
          `Verifikasi receipt gagal: ${verificationResult.error}`
        ));
      }

      // ── Cegah double processing ──
      const refId = transaction_id || verificationResult.transaction_id;
      if (refId) {
        const existingPayment = await TenantPayment.findOne({
          where: { payment_reference: refId }
        });
        if (existingPayment) {
          return res.status(409).send(ResponseHelper.errorResponse(
            'Transaksi ini sudah pernah diproses sebelumnya'
          ));
        }
      }

      // ── Save payment record FIRST ──
      let invoiceNumber;
      let payment;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          invoiceNumber = await BillingService.generateInvoiceNumber();
          payment = await TenantPayment.create({
            tenant_id,
            invoice_number: invoiceNumber,
            amount: 0, // amount will be updated after grantCredit
            status: 'paid',
            payment_method: 'APP_STORE',
            payment_gateway: 'apple_app_store',
            payment_reference: refId || null,
            due_date: new Date(),
            paid_at: new Date(),
            notes: `AI Credit ${aiCredits} - via Apple IAP`,
          });
          break;
        } catch (createErr) {
          if (createErr.name === 'SequelizeUniqueConstraintError' && attempt < 3) {
            continue;
          }
          throw createErr;
        }
      }

      // ── Grant AI credits (after payment record created successfully) ──
      const result = await AiCreditService.grantCredit(tenant_id, aiCredits, 'PURCHASE', {
        description: `Pembelian ${aiCredits} AI Credit via Apple IAP (${product_id})`,
        paymentMethod: 'APP_STORE',
        paymentRef: refId,
      });

      return res.status(200).send(ResponseHelper.successResponse({
        credits: aiCredits,
        balance: result.balance,
        transaction_id: refId,
      }, `${aiCredits} AI Credit berhasil ditambahkan`));

    } catch (error) {
      console.error('❌ IapController.handleAiCreditPurchase - Error:', error.message || error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message || 'Internal server error'));
    }
  }

  /**
   * Verify receipt with Apple's /verifyReceipt endpoint
   * Tries production first, falls back to sandbox
   */
  static async verifyWithApple(receiptData) {
    try {
      // First try production
      try {
        const productionResponse = await axios.post(APPLE_PRODUCTION_URL, {
          'receipt-data': receiptData,
          password: process.env.APPLE_SHARED_SECRET || '',
          exclude_old_transactions: true,
        }, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });

        const prodResult = productionResponse.data;

        // 21007 means the receipt is from sandbox
        if (prodResult.status === 21007) {
          // Fall back to sandbox
          const sandboxResponse = await axios.post(APPLE_SANDBOX_URL, {
            'receipt-data': receiptData,
            password: process.env.APPLE_SHARED_SECRET || '',
            exclude_old_transactions: true,
          }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
          });

          const sandboxResult = sandboxResponse.data;
          if (sandboxResult.status === 0) {
            return IapController.extractReceiptData(sandboxResult);
          }

          return {
            valid: false,
            error: `Apple Sandbox verification failed (status: ${sandboxResult.status})`
          };
        }

        if (prodResult.status === 0) {
          return IapController.extractReceiptData(prodResult);
        }

        return {
          valid: false,
          error: `Apple Production verification failed (status: ${prodResult.status})`
        };

      } catch (prodError) {
        // If production network fails, try sandbox as last resort
        try {
          const sandboxResponse = await axios.post(APPLE_SANDBOX_URL, {
            'receipt-data': receiptData,
            password: process.env.APPLE_SHARED_SECRET || '',
            exclude_old_transactions: true,
          }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
          });

          const sandboxResult = sandboxResponse.data;
          if (sandboxResult.status === 0) {
            return IapController.extractReceiptData(sandboxResult);
          }

          return {
            valid: false,
            error: `Apple verification failed (status: ${sandboxResult.status})`
          };
        } catch (sandboxError) {
          return {
            valid: false,
            error: sandboxError.message || 'Failed to connect to Apple verification service'
          };
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message || 'Apple verification error'
      };
    }
  }

  /**
   * Check if the receipt string is in JWS (JSON Web Signature) format
   * JWS format: base64url.base64url.base64url (3 dot-separated segments)
   */
  static isJwsFormat(receiptData) {
    if (typeof receiptData !== 'string') return false;
    const parts = receiptData.trim().split('.');
    if (parts.length !== 3) return false;
    // Cek setiap bagian adalah base64url valid
    const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
    return parts.every(part => base64urlRegex.test(part));
  }

  /**
   * Decode a JWS receipt without signature verification
   * Trusts StoreKit 2 verification (Apple already validated the transaction)
   */
  static decodeJws(jws) {
    try {
      const parts = jws.split('.');
      const payload = parts[1];

      // Pad base64url to base64
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';

      const decoded = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

      console.log('✅ IAP - JWS decoded payload:', JSON.stringify(decoded, null, 2));

      return {
        valid: true,
        transaction_id: decoded.transactionId || decoded.originalTransactionId || null,
        original_transaction_id: decoded.originalTransactionId || null,
        product_id: decoded.productId || null,
        purchase_date: decoded.purchaseDate ? new Date(decoded.purchaseDate).toISOString() : null,
        expires_date: decoded.expiresDate ? new Date(decoded.expiresDate).toISOString() : null,
        environment: decoded.environment || 'Sandbox',
        raw_payload: decoded,
      };
    } catch (error) {
      console.error('❌ decodeJws - Error:', error.message);
      return {
        valid: false,
        error: `Gagal decode JWS: ${error.message}`
      };
    }
  }
}

module.exports = IapController;
