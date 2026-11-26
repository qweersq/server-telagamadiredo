const AiCreditService = require('../services/AiCreditService');
const AiCreditRepository = require('../repositories/AiCreditRepository');
const TripayService = require('../services/tripayService');
const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');
const BillingService = require('../services/billingService');
const { ResponseHelper } = require('../helpers');

class AiCreditController {
    static async getBalance(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const balanceData = await AiCreditService.getBalance(tenantId);

            // Calculate monthly info
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const monthlyUsed = await AiCreditService.getMonthlyUsage(tenantId, monthStart);

            let monthlyLimit = 0;
            switch (balanceData.tier) {
                case 'FREE': monthlyLimit = 50; break;
                case 'BASIC': monthlyLimit = 200; break;
                case 'PREMIUM': monthlyLimit = -1; break;
                default: monthlyLimit = 50;
            }

            return res.status(200).send(ResponseHelper.successResponse({
                balance: balanceData.tier === 'PREMIUM' ? 999999 : balanceData.balance,
                tier: balanceData.tier,
                monthly_limit: monthlyLimit,
                monthly_used: monthlyUsed,
                next_reset: nextReset.toISOString().split('T')[0],
            }));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getHistory(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const page = parseInt(req.query.page, 10) || 1;
            const pageSize = parseInt(req.query.pageSize, 10) || 20;

            const result = await AiCreditService.getHistory(tenantId, { page, pageSize });
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getPackages(req, res) {
        try {
            const platform = req.query.platform || null;
            const packages = await AiCreditService.getPackages(platform);
            return res.status(200).send(ResponseHelper.successResponse(packages));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async createTripayInvoice(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const { package_id, payment_method } = req.body;

            if (!package_id) {
                return res.status(400).send(ResponseHelper.errorResponse('package_id is required'));
            }
            if (!payment_method) {
                return res.status(400).send(ResponseHelper.errorResponse('payment_method is required'));
            }

            // Get package details
            const creditPackage = await AiCreditService.getPackageById(package_id);
            if (!creditPackage) {
                return res.status(404).send(ResponseHelper.errorResponse('Package not found or inactive'));
            }

            // Generate invoice number
            const invoiceNumber = await BillingService.generateInvoiceNumber();

            // Create TenantPayment record for AI credit purchase
            const tenantPayment = await TenantPaymentRepository.create({
                tenant_id: tenantId,
                amount: creditPackage.price,
                status: 'unpaid',
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                invoice_number: invoiceNumber,
                payment_gateway: 'tripay',
                subscription_id: null,
                notes: `AI Credits - ${creditPackage.credits} credits`,
            });

            if (!tenantPayment) {
                return res.status(500).send(ResponseHelper.errorResponse('Failed to create payment record'));
            }

            // Create Tripay transaction with AI-CREDIT merchant_ref
            const tripayResult = await TripayService.createTransaction({
                tenant_id: tenantId,
                billing_id: tenantPayment.id,
                amount: creditPackage.price,
                payment_method: payment_method,
                merchant_ref_prefix: 'AI-CREDIT',
                customer_name: req.user.name || 'NotaSepatu Customer',
                customer_email: req.user.email || 'customer@notasepatu.com',
                customer_phone: req.user.phone || '08123456789',
                order_items: [
                    {
                        name: `AI Credit - ${creditPackage.credits} Credits`,
                        price: parseInt(creditPackage.price),
                        quantity: 1,
                    },
                ],
            });

            if (!tripayResult.success) {
                return res.status(400).send(ResponseHelper.errorResponse('Failed to create Tripay transaction', 400, tripayResult.error));
            }

            // Update TenantPayment with Tripay reference and URL
            await TenantPaymentRepository.update(tenantPayment.id, {
                payment_reference: tripayResult.data.reference,
                payment_url: tripayResult.data.checkout_url,
                payment_method: tripayResult.data.payment_method,
                expired_at: new Date(tripayResult.data.expired_time * 1000),
            });

            return res.status(200).send(ResponseHelper.successResponse({
                payment_id: tenantPayment.id,
                reference: tripayResult.data.reference,
                checkout_url: tripayResult.data.checkout_url,
                expired_time: tripayResult.data.expired_time,
                payment_method: tripayResult.data.payment_method,
                payment_method_code: tripayResult.data.payment_method_code,
                credits: creditPackage.credits,
                amount: creditPackage.price,
            }, 'Invoice created successfully'));

        } catch (error) {
            console.error('❌ AiCreditController.createTripayInvoice - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async handleTripayCallback(req, res) {
        try {
            // Real callback handling is in TripayCallbackController.handleCallback
            // which detects AI-CREDIT merchant_ref prefix and routes accordingly.
            // This endpoint is kept for reference/fallback.
            console.log('ℹ️ AiCreditController.handleTripayCallback - Forwarding to TripayCallbackController...');
            const TripayCallbackController = require('./tripayCallbackController');
            return TripayCallbackController.handleCallback(req, res);
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async verifyAppStoreReceipt(req, res) {
        try {
            // TODO: Verify Apple App Store receipt
            // This is a placeholder for Phase 4 implementation
            return res.status(501).send(ResponseHelper.errorResponse(
                'App Store verification not yet implemented. Coming in Phase 4.',
                501
            ));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async adminGrant(req, res) {
        try {
            const { tenant_id, amount, description } = req.body;

            if (!tenant_id || !amount) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id and amount are required'));
            }

            if (amount <= 0) {
                return res.status(400).send(ResponseHelper.errorResponse('amount must be positive'));
            }

            const result = await AiCreditService.grantCredit(
                tenant_id,
                amount,
                'ADMIN_GRANT',
                { description: description || 'Admin grant', paymentMethod: 'ADMIN' }
            );

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = AiCreditController;
