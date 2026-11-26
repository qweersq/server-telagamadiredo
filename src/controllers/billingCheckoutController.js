const { TenantPayment, Subscription, SubscriptionPlan, Tenant } = require('../models');
const TripayService = require('../services/tripayService');
const BillingService = require('../services/billingService');
const ResponseHelper = require('../helpers/responseHelper');
const { Op } = require('sequelize');

class BillingCheckoutController {
  /**
   * POST /billing/checkout
   * One-shot: pilih paket → buat billing → buat Tripay transaction → return checkout_url
   * Body: { plan_id, payment_method }
   * Default payment_method: 'QRIS' (atau channel QRIS yang tersedia di Tripay)
   */
  static async checkout(req, res) {
    let billing = null; // ← deklarasi di luar try
    try {
      const tenant_id = req.user.tenant_id;
      const { plan_id, payment_method = 'QRIS2' } = req.body;

      if (!plan_id) {
        return res.status(400).send(ResponseHelper.errorResponse('plan_id wajib diisi'));
      }

      // 1. Validasi plan
      const plan = await SubscriptionPlan.findByPk(plan_id);
      if (!plan) {
        return res.status(404).send(ResponseHelper.errorResponse('Plan tidak ditemukan'));
      }

      // 2. Get tenant
      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        return res.status(404).send(ResponseHelper.errorResponse('Tenant tidak ditemukan'));
      }

      // 3. Get current active subscription (jika ada)
      const currentSubscription = await Subscription.findOne({
        where: { tenant_id, status: { [Op.in]: ['active', 'trial'] } },
        order: [['createdAt', 'DESC']]
      });

      // 4. Generate invoice number & create billing (dengan retry)
      let invoiceNumber;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          invoiceNumber = await BillingService.generateInvoiceNumber();
          billing = await TenantPayment.create({
            tenant_id,
            subscription_id: currentSubscription?.id || null,
            invoice_number: invoiceNumber,
            amount: parseFloat(plan.price),
            status: 'unpaid',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam
            notes: `Checkout ${plan.name} via Tripay`,
            // Simpan plan_id untuk digunakan saat callback
            subscription_plan_id: plan.id,
          });
          break; // sukses
        } catch (createErr) {
          if (createErr.name === 'SequelizeUniqueConstraintError' && attempt < 3) {
            console.warn(`🔄 Checkout - Invoice conflict (${invoiceNumber}), retry ${attempt + 1}/3`);
            continue;
          }
          throw createErr;
        }
      }

      // 6. Buat Tripay transaction
      const transactionData = {
        billing_id: billing.id,
        payment_method: payment_method,
        amount: billing.amount,
        customer_name: tenant.business_name || tenant.name || 'Customer',
        customer_email: tenant.email || '',
        customer_phone: tenant.phone || '08123456789',
        order_items: [{
          name: `Langganan NotaSepatu - ${plan.name}`,
          price: billing.amount,
          quantity: 1,
        }],
      };

      const tripayResult = await TripayService.createTransaction(transactionData);

      if (!tripayResult.success || !tripayResult.data) {
        await billing.destroy({ force: true });
        const errMsg = tripayResult.error || 'Gagal membuat transaksi Tripay';
        console.error('❌ BillingCheckoutController - Tripay failed:', errMsg);
        return res.status(500).send(ResponseHelper.errorResponse(errMsg));
      }

      // 8. Update billing dengan Tripay reference
      await TenantPayment.update(
        {
          payment_reference: tripayResult.data.reference, // T-XXXXXXX dari Tripay
          payment_gateway: 'tripay',
          payment_url: tripayResult.data.checkout_url,
          expired_at: new Date(tripayResult.data.expiry_date * 1000 || (Date.now() + 24 * 60 * 60 * 1000)),
        },
        { where: { id: billing.id } }
      );

      return res.status(200).send(ResponseHelper.successResponse({
        billing_id: billing.id,
        invoice_number: invoiceNumber,
        plan_name: plan.name,
        amount: billing.amount,
        checkout_url: tripayResult.data.checkout_url,
        reference: tripayResult.data.reference,
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }, 'Checkout berhasil dibuat'));

    } catch (error) {
      // Cleanup billing jika sudah terbuat tapi ada error setelahnya
      if (billing) {
        try { await billing.destroy({ force: true }); } catch (destroyErr) {
          console.error('❌ Failed to cleanup billing:', destroyErr.message);
        }
      }
      console.error('❌ BillingCheckoutController.checkout - Error:', error.message || error);
      return res.status(500).send(ResponseHelper.errorResponse(
        error.message || 'Internal server error'
      ));
    }
  }
}

module.exports = BillingCheckoutController;
