const ResponseHelper = require('../helpers/responseHelper');
const TripayService = require('../services/tripayService');
const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');
const BillingService = require('../services/billingService');
const { User } = require('../models');

class InactiveTenantsTripayController {
    /**
     * Get available payment channels
     */
    static async getPaymentChannels(req, res) {
        try {
            console.log('🔍 InactiveTenantsTripayController.getPaymentChannels - Fetching channels');
            
            const result = await TripayService.getPaymentChannels();
            
            if (result.success) {
                return res.status(200).send(ResponseHelper.successResponse(result.data, 'Payment channels retrieved successfully'));
            } else {
                return res.status(400).send(ResponseHelper.errorResponse('Failed to get payment channels', 400, result.error));
            }
        } catch (error) {
            console.error('❌ InactiveTenantsTripayController.getPaymentChannels - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500, error.message));
        }
    }

    /**
     * Create Tripay transaction
     */
    static async createTransaction(req, res) {
        try {
            console.log('🔍 InactiveTenantsTripayController.createTransaction - Creating transaction');
            
            const {
                billing_id,
                method,
                payment_method,
                customer_name,
                customer_email,
                customer_phone
            } = req.body;

            console.log('🔍 Request body:', req.body);
            console.log('🔍 Billing ID:', billing_id);
            console.log('🔍 Method:', method);
            console.log('🔍 Payment Method:', payment_method);

            // Use method if provided, otherwise fallback to payment_method
            const paymentMethod = method || payment_method;

            // Validation
            if (!billing_id || !paymentMethod) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing ID and payment method are required'));
            }

            // Get billing details
            const billing = await TenantPaymentRepository.getById(billing_id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found'));
            }

            if (billing.status !== 'pending' && billing.status !== 'unpaid') {
                return res.status(400).send(ResponseHelper.errorResponse('Billing is not available for payment'));
            }

            // Check if billing already has active Tripay transaction - REPLACE instead of error
            if (billing.payment_gateway === 'tripay' && billing.payment_reference) {
                console.log('🔄 Found existing transaction, will replace with new one');
                // Continue to create new transaction (replace existing)
            }

            // Get user data for customer info
            const user = await User.findByPk(req.userId);
            if (!user) {
                return res.status(404).send(ResponseHelper.errorResponse('User not found'));
            }

            // Prepare transaction data
            const transactionData = {
                tenant_id: billing.tenant_id,
                billing_id: billing_id,
                amount: billing.amount,
                payment_method: paymentMethod,
                customer_name: customer_name || user.name || 'Customer',
                customer_email: customer_email || user.email || 'customer@example.com',
                customer_phone: customer_phone || user.phone || '081234567890'
            };

            console.log('🔍 Creating transaction with data:', transactionData);

            // Create transaction
            const result = await TripayService.createTransaction(transactionData);
            
            if (result.success) {
                // Update billing with payment reference - KEEP STATUS AS UNPAID
                await TenantPaymentRepository.update(billing_id, {
                    payment_gateway: 'tripay',
                    payment_reference: result.data.reference,
                    payment_url: result.data.checkout_url,
                    payment_method: result.data.payment_method,
                    expired_at: new Date(result.data.expired_time * 1000)
                    // Note: Status tetap 'unpaid', tidak diubah ke 'pending'
                });

                // 📧 Send payment link email (non-blocking)
                const { Tenant } = require('../models');
                const tenant = await Tenant.findByPk(billing.tenant_id);
                if (tenant) {
                    const EmailNotificationService = require('../services/email/emailNotificationService');
                    EmailNotificationService.sendBillingChoosePayment({
                        tenant_email: tenant.email,
                        tenant_name: tenant.business_name || tenant.name,
                        amount: billing.amount,
                        payment_method: result.data.payment_method,
                        payment_url: result.data.checkout_url,
                        invoice_number: billing.invoice_number,
                        expired_time: new Date(result.data.expired_time * 1000)
                    }).catch(err => {
                        console.error('⚠️ Failed to send payment link email:', err);
                    });
                }

                console.log('✅ InactiveTenantsTripayController.createTransaction - Success:', result.data.reference);
                return res.status(200).send(ResponseHelper.successResponse(result.data, 'Transaction created successfully'));
            } else {
                return res.status(400).send(ResponseHelper.errorResponse('Failed to create transaction', 400, result.error));
            }
        } catch (error) {
            console.error('❌ InactiveTenantsTripayController.createTransaction - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500, error.message));
        }
    }

    /**
     * Check transaction status
     */
    static async checkTransactionStatus(req, res) {
        try {
            const { reference } = req.params;
            
            console.log('🔍 InactiveTenantsTripayController.checkTransactionStatus - Checking status for:', reference);
            
            const result = await TripayService.checkTransactionStatus(reference);
            
            if (result.success) {
                return res.status(200).send(ResponseHelper.successResponse(result.data, 'Transaction status retrieved successfully'));
            } else {
                return res.status(400).send(ResponseHelper.errorResponse('Failed to check transaction status', 400, result.error));
            }
        } catch (error) {
            console.error('❌ InactiveTenantsTripayController.checkTransactionStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500, error.message));
        }
    }

    /**
     * Handle Tripay callback
     */
    static async handleCallback(req, res) {
        try {
            console.log('🔍 InactiveTenantsTripayController.handleCallback - Processing callback');
            
            const callbackBody = req.body;
            console.log('🔍 Callback body:', callbackBody);

            // Process callback
            const result = await TripayService.handleCallback(callbackBody);
            
            if (result.success) {
                // Update billing status
                const updateData = {
                    status: result.status,
                    payment_gateway: 'tripay',
                    payment_reference: result.tripay_reference,
                    payment_method: result.payment_method,
                    paid_at: result.paid_at,
                    notes: `Payment via Tripay - ${result.payment_method_code}`
                };

                await TenantPaymentRepository.update(result.billing_id, updateData);

                // Extend subscription if payment is successful
                if (result.status === 'paid') {
                    await BillingService.extendSubscriptionAfterPayment(result.billing_id);
                    console.log('✅ Subscription extended for billing:', result.billing_id);
                }

                console.log('✅ Callback processed successfully for billing:', result.billing_id);
                return res.status(200).send(ResponseHelper.successResponse({ 
                    billing_id: result.billing_id,
                    status: result.status 
                }, 'Callback processed successfully'));
            } else {
                console.error('❌ Failed to process callback:', result.error);
                return res.status(400).send(ResponseHelper.errorResponse('Failed to process callback', 400, result.error));
            }
        } catch (error) {
            console.error('❌ InactiveTenantsTripayController.handleCallback - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500, error.message));
        }
    }

    /**
     * Manual check and update transaction status
     */
    static async manualCheckStatus(req, res) {
        try {
            const { billing_id } = req.params;
            
            console.log('🔍 InactiveTenantsTripayController.manualCheckStatus - Checking billing:', billing_id);

            // Get billing details with subscription info
            const billing = await TenantPaymentRepository.getById(billing_id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found'));
            }

            // Get subscription plan ID from subscription
            let subscriptionPlanId = billing.subscription_plan_id;
            if (!subscriptionPlanId && billing.subscription_id) {
                const { Subscription } = require('../models');
                const subscription = await Subscription.findByPk(billing.subscription_id);
                if (subscription) {
                    subscriptionPlanId = subscription.subscription_plan_id;
                }
            }

            if (!billing.payment_reference) {
                return res.status(400).send(ResponseHelper.errorResponse('No payment reference found for this billing'));
            }

            // Check status with Tripay
            const result = await TripayService.checkTransactionStatus(billing.payment_reference);
            
            if (result.success) {
                const tripayStatus = result.data.status;
                let newStatus = 'unpaid';  // FIX: Default to unpaid, not pending
                
                if (tripayStatus === 'PAID') {
                    newStatus = 'paid';
                } else if (tripayStatus === 'FAILED' || tripayStatus === 'CANCELLED') {
                    newStatus = 'failed';
                }

                // Update billing if status changed
                if (newStatus !== billing.status) {
                    const updateData = {
                        status: newStatus,
                        paid_at: newStatus === 'paid' ? new Date() : null
                    };

                    // Add subscription_plan_id if not already set
                    if (subscriptionPlanId && !billing.subscription_plan_id) {
                        updateData.subscription_plan_id = subscriptionPlanId;
                    }

                    await TenantPaymentRepository.update(billing_id, updateData);

                    // Extend subscription if payment is successful
                    if (newStatus === 'paid') {
                        try {
                            // Check if billing has subscription_id
                            if (billing.subscription_id) {
                                // Extend existing subscription
                                await BillingService.extendSubscriptionAfterPayment(billing_id);
                                console.log('✅ Manual check status - Subscription extended for billing:', billing_id);
                            } else {
                                // Create new subscription from billing
                                await BillingService.createSubscriptionFromBilling(billing_id);
                                console.log('✅ Manual check status - New subscription created for billing:', billing_id);
                            }
                        } catch (extendError) {
                            // If subscription not found or create failed, update tenant directly
                            if (extendError.message === 'Subscription not found' || extendError.message.includes('Subscription not found') || extendError.message.includes('not found')) {
                                console.log('⚠️ Manual check status - Subscription not found, updating tenant directly');
                                const { Tenant } = require('../models');
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
                                    console.log('✅ Manual check status - Tenant status updated to active (no subscription)');
                                }
                            } else {
                                console.error('❌ Manual check status - Failed to handle subscription:', extendError);
                            }
                        }
                    }
                }

                return res.status(200).send(ResponseHelper.successResponse({
                    billing_id,
                    current_status: billing.status,
                    tripay_status: tripayStatus,
                    new_status: newStatus,
                    updated: newStatus !== billing.status
                }, 'Status checked successfully'));
            } else {
                return res.status(400).send(ResponseHelper.errorResponse('Failed to check status', 400, result.error));
            }
        } catch (error) {
            console.error('❌ InactiveTenantsTripayController.manualCheckStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500, error.message));
        }
    }

    /**
     * Get transaction history
     */
    static async getTransactionHistory(req, res) {
        try {
            console.log('🔍 InactiveTenantsTripayController.getTransactionHistory - Fetching history');
            
            // Get tenant ID from encrypted data
            const tenantId = req.tenantId;
            
            // Get billing history for this tenant
            const billings = await TenantPaymentRepository.getByTenantId(tenantId);
            
            // Filter only Tripay transactions
            const tripayTransactions = billings.filter(billing => billing.payment_gateway === 'tripay');
            
            return res.status(200).send(ResponseHelper.successResponse(tripayTransactions, 'Transaction history retrieved successfully'));
        } catch (error) {
            console.error('❌ InactiveTenantsTripayController.getTransactionHistory - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500, error.message));
        }
    }
}

module.exports = { InactiveTenantsTripayController };
