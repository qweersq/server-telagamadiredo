const crypto = require('crypto');
const { TenantPayment, Subscription, Tenant, AiCreditPackage } = require('../models');
const ResponseHelper = require('../helpers/responseHelper');
const AiCreditService = require('../services/AiCreditService');

class TripayCallbackController {
    /**
     * Handle Tripay callback
     * POST /tripay/callback
     */
    static async handleCallback(req, res) {
        try {
            console.log('🔔 TripayCallbackController.handleCallback - Received callback:', req.body);

            const { reference, merchant_ref, status, total_amount, paid_at } = req.body;
            const signature = req.headers['x-callback-signature'];
            const event = req.headers['x-callback-event'];

            // Validate signature
            const privateKey = process.env.TRIPAY_PRIVATE_KEY;
            if (!privateKey) {
                console.error('❌ TripayCallbackController - TRIPAY_PRIVATE_KEY not found');
                return res.status(500).json({ success: false, message: 'Server configuration error' });
            }

            const expectedSignature = crypto
                .createHmac('sha256', privateKey)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('❌ TripayCallbackController - Invalid signature');
                return res.status(400).json({ success: false, message: 'Invalid signature' });
            }

            console.log('✅ TripayCallbackController - Signature validated');

            const parts = (merchant_ref || '').split('-');

            // 🤖 AI-CREDIT branch: merchant_ref format "AI-CREDIT-{payment_id}-{timestamp}"
            if (parts.length >= 3 && parts[0] === 'AI' && parts[1] === 'CREDIT') {
                console.log('🤖 TripayCallbackController - Detected AI-CREDIT purchase');
                const paymentId = parseInt(parts[2]);
                if (!isNaN(paymentId)) {
                    const payment = await TenantPayment.findByPk(paymentId);
                    if (payment) {
                        switch (status) {
                            case 'PAID':
                                await TripayCallbackController.handleAiCreditPaid(payment, req.body);
                                break;
                            case 'FAILED':
                                await TripayCallbackController.handleFailedPayment(payment);
                                break;
                            case 'EXPIRED':
                                await TripayCallbackController.handleExpiredPayment(payment);
                                break;
                            case 'REFUND':
                                await TripayCallbackController.handleRefundPayment(payment);
                                break;
                        }
                        return res.json({ success: true });
                    }
                }
            }

            // merchant_ref format: "BILLING-{billing_id}-{timestamp}"
            // Contoh: "BILLING-42-1716825600000"
            let billing = null;
            if (parts.length >= 2 && parts[0] === 'BILLING') {
                const billingId = parseInt(parts[1]);
                if (!isNaN(billingId)) {
                    billing = await TenantPayment.findByPk(billingId, {
                        include: [{
                            model: Subscription,
                            as: 'subscription',
                            include: [{
                                model: Tenant,
                                as: 'tenant'
                            }]
                        }]
                    });
                }
            }

            if (!billing) {
                console.log('⚠️ TripayCallbackController - Billing not found for reference:', merchant_ref);
                return res.json({ success: true });
            }

            console.log('🔍 TripayCallbackController - Found billing:', billing.id);

            // Handle different payment statuses
            switch (status) {
                case 'PAID':
                    await TripayCallbackController.handlePaidPayment(billing, req.body);
                    break;
                case 'FAILED':
                    await TripayCallbackController.handleFailedPayment(billing);
                    break;
                case 'EXPIRED':
                    await TripayCallbackController.handleExpiredPayment(billing);
                    break;
                case 'REFUND':
                    await TripayCallbackController.handleRefundPayment(billing);
                    break;
                default:
                    console.log('⚠️ TripayCallbackController - Unknown status:', status);
            }

            console.log('✅ TripayCallbackController - Callback processed successfully');
            return res.json({ success: true });

        } catch (error) {
            console.error('❌ TripayCallbackController.handleCallback - Error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Handle successful payment
     */
    static async handlePaidPayment(billing, callbackData) {
        try {
            console.log('💰 TripayCallbackController.handlePaidPayment - Processing payment for billing:', billing.id);

            // ⛔ CEK IDEMPOTENSI: Skip kalo billing udah diproses sebelumnya
            if (billing.status === 'paid') {
                console.log('⏭️ TripayCallbackController.handlePaidPayment - Billing already paid, skipping (idempotency check)');
                return;
            }

            // ✅ Handle late payment for cancelled/expired billings
            // When customer pays via old Tripay URL after billing was auto-cancelled
            const { Op } = require('sequelize');
            if (billing.status === 'cancelled' || billing.status === 'expired') {
                console.log('⚠️ TripayCallbackController.handlePaidPayment - Billing was cancelled/expired, processing late payment...');
                console.log('📋 Original billing status:', billing.status, 'Invoice:', billing.invoice_number);

                // Find and delete any EXPIRED/unpaid billing for this tenant that was created after downgrade
                const expiredBillings = await TenantPayment.findAll({
                    where: {
                        tenant_id: billing.tenant_id,
                        invoice_number: { [Op.like]: 'EXPIRED-%' },
                        status: 'unpaid'
                    }
                });

                if (expiredBillings.length > 0) {
                    for (const expiredBilling of expiredBillings) {
                        console.log('🗑️ TripayCallbackController.handlePaidPayment - Deleting expired billing:', expiredBilling.invoice_number);
                        await expiredBilling.destroy();
                    }
                    console.log(`✅ TripayCallbackController.handlePaidPayment - Deleted ${expiredBillings.length} expired billing(s)`);
                }
            }

            // Update billing status to paid
            await TenantPayment.update(
                {
                    status: 'paid',
                    paid_at: new Date(callbackData.paid_at * 1000),
                    payment_gateway: 'tripay',
                    notes: billing.status === 'cancelled' || billing.status === 'expired'
                        ? `Late payment confirmed via Tripay callback - ${callbackData.payment_method} (was ${billing.status})`
                        : `Payment confirmed via Tripay callback - ${callbackData.payment_method}`
                },
                { where: { id: billing.id } }
            );

            // Extend subscription and update tenant using BillingService
            const BillingService = require('../services/billingService');
            let subscriptionExtended = false;
            let newEndDate = null;

            try {
                // ✅ Check if this is a change plan scenario (upgrade from NotaFree or different plan)
                const SubscriptionRepository = require('../repositories/subscriptionRepository');
                const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
                const PlanHelper = require('../helpers/planHelper');

                let shouldCreateNewSubscription = false;

                if (!billing.subscription_id) {
                    shouldCreateNewSubscription = true;
                    console.log('🔄 TripayCallbackController.handlePaidPayment - No subscription_id, will create new subscription');
                } else {
                    const subscription = await SubscriptionRepository.getById(billing.subscription_id);
                    if (subscription) {
                        const currentPlan = await SubscriptionPlanRepository.getById(subscription.plan_id);
                        const isCurrentPlanNotaFree = currentPlan && PlanHelper.isFreePlan(currentPlan);

                        // Find the plan that matches the billing amount
                        const newPlan = await SubscriptionPlanRepository.getByPrice(billing.amount);
                        const isNewPlanNotaFree = newPlan && PlanHelper.isFreePlan(newPlan);

                        // If upgrading from NotaFree to paid, or changing to different paid plan
                        if ((isCurrentPlanNotaFree && !isNewPlanNotaFree) ||
                            (!isCurrentPlanNotaFree && !isNewPlanNotaFree && subscription.plan_id !== newPlan.id)) {
                            shouldCreateNewSubscription = true;
                            console.log('🔄 TripayCallbackController.handlePaidPayment - Change plan detected, will create new subscription');
                        } else if (parseFloat(billing.amount) !== parseFloat(subscription.final_price)) {
                            shouldCreateNewSubscription = true;
                            console.log('🔄 TripayCallbackController.handlePaidPayment - Amount mismatch, will create new subscription');
                        }
                    } else {
                        shouldCreateNewSubscription = true;
                        console.log('🔄 TripayCallbackController.handlePaidPayment - Subscription not found, will create new subscription');
                    }
                }

                if (shouldCreateNewSubscription) {
                    const result = await BillingService.createSubscriptionFromBilling(billing.id);
                    subscriptionExtended = true;
                    newEndDate = result.new_end_date || null;
                    console.log('✅ TripayCallbackController.handlePaidPayment - Created new subscription from billing');
                } else {
                    const result = await BillingService.extendSubscriptionAfterPayment(billing.id);
                    subscriptionExtended = true;
                    newEndDate = result.new_end_date;
                    console.log('✅ TripayCallbackController.handlePaidPayment - Subscription extended until:', newEndDate);
                }
            } catch (error) {
                // If subscription not found, update tenant directly
                if (error.message === 'Subscription not found' || error.message.includes('Subscription not found')) {
                    console.log('⚠️ TripayCallbackController.handlePaidPayment - Subscription not found, updating tenant directly');

                    const tenant = await Tenant.findByPk(billing.tenant_id);
                    if (tenant) {
                        await Tenant.update(
                            {
                                status: 'active',
                                subscription_status: 'active',
                                trial_end_date: null
                            },
                            { where: { id: tenant.id } }
                        );
                        console.log('✅ TripayCallbackController.handlePaidPayment - Tenant status updated to active (no subscription)');
                    }
                } else {
                    // Re-throw other errors
                    throw error;
                }
            }

            // 📧 Send payment success email (non-blocking) - only if subscription exists
            if (subscriptionExtended) {
                try {
                    // Reload billing to get updated subscription_id
                    await billing.reload();

                    const { SubscriptionPlan } = require('../models');
                    const subscription = await Subscription.findByPk(billing.subscription_id, {
                        include: [{
                            model: Tenant,
                            as: 'tenant'
                        }]
                    });

                    if (subscription && subscription.tenant) {
                        const plan = await SubscriptionPlan.findByPk(subscription.plan_id);
                        const mailerServices = require('../services/mailerServices');
                        mailerServices.sendPaymentNotificationToAdmin({
                            tenant_name: subscription.tenant.business_name || subscription.tenant.name,
                            owner_name: subscription.tenant.owner_name || '-',
                            tenant_email: subscription.tenant.email,
                            plan_name: plan ? plan.name : '-',
                            amount: billing.amount,
                            invoice_number: billing.invoice_number,
                            paid_date: callbackData.paid_at * 1000,
                            subscription_status: subscription.status,
                            end_date: subscription.end_date
                        }).catch(err => {
                            console.error('⚠️ Failed to send payment notification:', err);
                        });
                    }
                } catch (emailError) {
                    console.error('⚠️ Failed to send billing_paid email:', emailError);
                }
            }

            console.log('✅ TripayCallbackController.handlePaidPayment - Payment processed successfully');

        } catch (error) {
            console.error('❌ TripayCallbackController.handlePaidPayment - Error:', error);
            throw error;
        }
    }

    /**
     * Handle successful AI credit purchase payment
     */
    static async handleAiCreditPaid(payment, callbackData) {
        try {
            console.log('💰 TripayCallbackController.handleAiCreditPaid - Processing AI credit for payment:', payment.id);

            // ⛔ CEK IDEMPOTENSI
            if (payment.status === 'paid') {
                console.log('⏭️ TripayCallbackController.handleAiCreditPaid - Payment already paid, skipping (idempotency)');
                return;
            }

            // Extract credits from notes: "AI Credits - X credits - PackageName"
            let credits = 0;
            const notesMatch = payment.notes ? payment.notes.match(/AI Credits - (\d+|Unlimited) credits?/) : null;
            if (notesMatch) {
                credits = notesMatch[1] === 'Unlimited' ? 999999 : parseInt(notesMatch[1], 10);
            }

            if (credits <= 0) {
                console.log('⚠️ TripayCallbackController.handleAiCreditPaid - Could not extract credits from notes, trying package lookup...');
                // Fallback: find package by matching price
                const pkg = await AiCreditPackage.findOne({
                    where: { price: payment.amount, active: true }
                });
                if (pkg) {
                    credits = pkg.credits === -1 ? 999999 : pkg.credits;
                }
            }

            if (credits <= 0) {
                console.error('❌ TripayCallbackController.handleAiCreditPaid - Cannot determine credits, skipping');
                return;
            }

            console.log('📊 TripayCallbackController.handleAiCreditPaid - Credits to grant:', credits);

            // Process purchase with idempotency guard
            const result = await AiCreditService.processTripayPurchase(
                payment.tenant_id,
                null, // package_id not critical here
                credits,
                payment.amount,
                callbackData.reference || payment.payment_reference,
                callbackData.payment_method || payment.payment_method,
                callbackData
            );

            if (result.idempotent) {
                console.log('⏭️ TripayCallbackController.handleAiCreditPaid - Idempotent, already processed');
            } else {
                console.log('✅ TripayCallbackController.handleAiCreditPaid - Credits granted, new balance:', result.balance);
            }

            // Update payment status to paid
            await TenantPayment.update(
                {
                    status: 'paid',
                    paid_at: new Date(callbackData.paid_at * 1000),
                    notes: `AI Credits purchased - ${credits} credits via ${callbackData.payment_method || 'Tripay'}`,
                },
                { where: { id: payment.id } }
            );

            console.log('✅ TripayCallbackController.handleAiCreditPaid - AI credit purchase processed successfully');

        } catch (error) {
            console.error('❌ TripayCallbackController.handleAiCreditPaid - Error:', error);
            throw error;
        }
    }

    /**
     * Handle failed payment
     */
    static async handleFailedPayment(billing) {
        try {
            console.log('❌ TripayCallbackController.handleFailedPayment - Processing failed payment for billing:', billing.id);

            await TenantPayment.update(
                {
                    status: 'failed',
                    notes: 'Payment failed via Tripay callback'
                },
                { where: { id: billing.id } }
            );

            console.log('✅ TripayCallbackController.handleFailedPayment - Failed payment processed');

        } catch (error) {
            console.error('❌ TripayCallbackController.handleFailedPayment - Error:', error);
            throw error;
        }
    }

    /**
     * Handle expired payment
     */
    static async handleExpiredPayment(billing) {
        try {
            console.log('⏰ TripayCallbackController.handleExpiredPayment - Processing expired payment for billing:', billing.id);

            await TenantPayment.update(
                {
                    status: 'cancelled',
                    notes: 'Payment expired via Tripay callback'
                },
                { where: { id: billing.id } }
            );

            console.log('✅ TripayCallbackController.handleExpiredPayment - Expired payment processed');

        } catch (error) {
            console.error('❌ TripayCallbackController.handleExpiredPayment - Error:', error);
            throw error;
        }
    }

    /**
     * Handle refund payment
     */
    static async handleRefundPayment(billing) {
        try {
            console.log('🔄 TripayCallbackController.handleRefundPayment - Processing refund for billing:', billing.id);

            await TenantPayment.update(
                {
                    status: 'refunded',
                    notes: 'Payment refunded via Tripay callback'
                },
                { where: { id: billing.id } }
            );

            console.log('✅ TripayCallbackController.handleRefundPayment - Refund processed');

        } catch (error) {
            console.error('❌ TripayCallbackController.handleRefundPayment - Error:', error);
            throw error;
        }
    }
}

module.exports = TripayCallbackController;
