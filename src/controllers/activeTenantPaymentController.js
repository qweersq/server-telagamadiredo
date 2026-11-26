const { User, Tenant, Subscription, SubscriptionPlan, TenantPayment } = require('../models');
const { Op } = require('sequelize');
const ResponseHelper = require('../helpers/responseHelper');

class ActiveTenantPaymentController {
    /**
     * Get active tenant status
     * GET /active-tenant-payment/status/:tenant_id
     */
    static async getTenantStatus(req, res) {
        try {
            const { tenant_id } = req.params;
            

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get latest active or trial subscription
            const subscription = await Subscription.findOne({
                where: {
                    tenant_id: tenant.id,
                    status: { [Op.in]: ['trial', 'active'] } // ✅ Include both trial and active
                },
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan'
                }],
                order: [['createdAt', 'DESC']]
            });

            // Calculate days remaining for trial
            let daysRemaining = 0;
            if (tenant.trial_end_date && tenant.subscription_status === 'trial') {
                const now = new Date();
                const trialEnd = new Date(tenant.trial_end_date);
                const diffTime = trialEnd - now;
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const data = {
                tenant: {
                    id: tenant.id,
                    business_name: tenant.business_name,
                    status: tenant.status,
                    subscription_status: tenant.subscription_status,
                    trial_end_date: tenant.trial_end_date,
                    days_remaining: daysRemaining
                },
                subscription: subscription ? {
                    id: subscription.id,
                    status: subscription.status,
                    start_date: subscription.start_date,
                    end_date: subscription.end_date,
                    plan: subscription.plan ? {
                        id: subscription.plan.id,
                        name: subscription.plan.name,
                        price: subscription.plan.price,
                        max_orders_per_month: subscription.plan.max_orders_per_month,
                        duration_days: subscription.plan.duration_days
                    } : null
                } : null,
                is_active: tenant.subscription_status === 'active' && tenant.status === 'active',
                message: tenant.subscription_status === 'trial' 
                    ? `Trial berakhir dalam ${daysRemaining} hari` 
                    : tenant.subscription_status === 'active' 
                        ? 'Subscription aktif' 
                        : 'Subscription tidak aktif'
            };

            return res.status(200).send(ResponseHelper.successResponse(data, 'Operation successful'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.getTenantStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get active tenant billing history
     * GET /active-tenant-payment/history/:tenant_id
     */
    static async getBillingHistory(req, res) {
        try {
            const { tenant_id } = req.params;
            
            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get billing history
            const billings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenant.id
                },
                include: [{
                    model: Subscription,
                    as: 'subscription',
                    include: [{
                        model: SubscriptionPlan,
                        as: 'plan'
                    }]
                }],
                order: [['createdAt', 'DESC']]
            });

            // Calculate stats
            const stats = {
                unpaid: { count: 0, total_amount: 0 },
                pending: { count: 0, total_amount: 0 },
                paid: { count: 0, total_amount: 0 },
                failed: { count: 0, total_amount: 0 }
            };

            billings.forEach(billing => {
                const amount = parseFloat(billing.amount);
                if (stats[billing.status]) {
                    stats[billing.status].count++;
                    stats[billing.status].total_amount += amount;
                }
            });

            const data = {
                billings: billings,
                stats: stats
            };

            return res.status(200).send(ResponseHelper.successResponse(data, 'Operation successful'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.getBillingHistory - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get active tenant upcoming billings
     * GET /active-tenant-payment/upcoming/:tenant_id
     */
    static async getUpcomingBillings(req, res) {
        try {
            const { tenant_id } = req.params;
            

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // NEW: Validate single billing rule before returning data
            try {
                const BillingValidationService = require('../services/billingValidationService');
                await BillingValidationService.validateSingleBillingRule(tenant_id);
            } catch (error) {
                console.error('❌ ActiveTenantPaymentController.getUpcomingBillings - Billing validation error:', error);
                // Continue even if validation fails
            }

            // Get upcoming billings (unpaid and pending - user is waiting for admin confirmation)
            // First, let's test without include to see if the basic query works
            const upcomingBillings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenant.id,
                    status: {
                        [Op.in]: ['unpaid', 'pending']
                    }
                },
                order: [['due_date', 'ASC']],
                paranoid: false // Include soft deleted records for debugging
            });

            const BillingExpirationService = require('../services/billingExpirationService');
            const updatedBillings = await BillingExpirationService.checkAndUpdateExpiredBillings(upcomingBillings);

            return res.status(200).send(ResponseHelper.successResponse(updatedBillings, 'Operation successful'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.getUpcomingBillings - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Check payment status for specific billing
     * GET /active-tenant-payment/check-payment/:tenant_id/:billing_id
     */
    static async checkPaymentStatus(req, res) {
        try {
            const { tenant_id, billing_id } = req.params;
            
            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get specific billing
            const billing = await TenantPayment.findOne({
                where: {
                    id: billing_id,
                    tenant_id: tenant.id
                },
                include: [{
                    model: Subscription,
                    as: 'subscription',
                    include: [{
                        model: SubscriptionPlan,
                        as: 'plan'
                    }]
                }]
            });

            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            // Check Tripay status if payment_reference exists
            if (billing.payment_reference && billing.payment_gateway === 'tripay') {
                try {
                    
                    const TripayService = require('../services/tripayService');
                    const result = await TripayService.checkTransactionStatus(billing.payment_reference);
                    
                    if (result.success) {
                        const tripayStatus = result.data.status;
                        let newStatus = billing.status;
                        
                        if (tripayStatus === 'PAID' && billing.status !== 'paid') {
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
                            
                            await billing.update(updateData);
                            
                            // Extend subscription if payment is successful
                            if (newStatus === 'paid') {
                                try {
                                    const BillingService = require('../services/billingService');
                                    
                                    // ✅ Check if this is a change plan scenario (upgrade from NotaFree or different plan)
                                    const SubscriptionRepository = require('../repositories/subscriptionRepository');
                                    const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
                                    const PlanHelper = require('../helpers/planHelper');
                                    
                                    let shouldCreateNewSubscription = false;
                                    
                                    if (!billing.subscription_id) {
                                        shouldCreateNewSubscription = true;
                                        console.log('🔄 ActiveTenantPaymentController.checkPaymentStatus - No subscription_id, will create new subscription');
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
                                                console.log('🔄 ActiveTenantPaymentController.checkPaymentStatus - Change plan detected, will create new subscription');
                                            } else if (parseFloat(billing.amount) !== parseFloat(subscription.final_price)) {
                                                shouldCreateNewSubscription = true;
                                                console.log('🔄 ActiveTenantPaymentController.checkPaymentStatus - Amount mismatch, will create new subscription');
                                            }
                                        } else {
                                            shouldCreateNewSubscription = true;
                                            console.log('🔄 ActiveTenantPaymentController.checkPaymentStatus - Subscription not found, will create new subscription');
                                        }
                                    }
                                    
                                    if (shouldCreateNewSubscription) {
                                        await BillingService.createSubscriptionFromBilling(billing_id);
                                        console.log('✅ ActiveTenantPaymentController.checkPaymentStatus - Created new subscription from billing');
                                    } else {
                                        await BillingService.extendSubscriptionAfterPayment(billing_id);
                                        console.log('✅ ActiveTenantPaymentController.checkPaymentStatus - Extended existing subscription');
                                    }
                                } catch (extendError) {
                                    // If subscription not found, update tenant directly
                                    if (extendError.message === 'Subscription not found' || extendError.message.includes('Subscription not found')) {
                                        console.log('⚠️ ActiveTenantPaymentController.checkPaymentStatus - Subscription not found, updating tenant directly');
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
                                            console.log('✅ ActiveTenantPaymentController.checkPaymentStatus - Tenant status updated to active (no subscription)');
                                        }
                                    } else {
                                        console.error('❌ ActiveTenantPaymentController.checkPaymentStatus - Failed to extend/create subscription:', extendError);
                                    }
                                }
                            }
                            
                        }
                    }
                } catch (tripayError) {
                    console.error('❌ ActiveTenantPaymentController.checkPaymentStatus - Tripay check error:', tripayError);
                    // Continue with database status if Tripay check fails
                }
            }

            // Prepare response based on status
            let message = '';
            let needsAction = false;

            switch (billing.status) {
                case 'unpaid':
                    message = 'Billing belum dibayar. Silakan lakukan pembayaran.';
                    needsAction = true;
                    break;
                case 'pending':
                    message = 'Pembayaran sedang diverifikasi oleh admin. Silakan tunggu konfirmasi.';
                    needsAction = false;
                    break;
                case 'paid':
                    message = 'Pembayaran telah dikonfirmasi dan diterima.';
                    needsAction = false;
                    break;
                case 'failed':
                    message = 'Pembayaran gagal. Silakan coba lagi.';
                    needsAction = true;
                    break;
                case 'cancelled':
                    message = 'Billing telah dibatalkan.';
                    needsAction = false;
                    break;
                default:
                    message = 'Status pembayaran tidak diketahui.';
                    needsAction = true;
            }

            const responseData = {
                billing: {
                    id: billing.id,
                    invoice_number: billing.invoice_number,
                    amount: billing.amount,
                    status: billing.status,
                    due_date: billing.due_date,
                    paid_at: billing.paid_at,
                    payment_method: billing.payment_method,
                    payment_code: billing.payment_code,
                    notes: billing.notes
                },
                message: message,
                needs_action: needsAction,
                last_checked: new Date().toISOString()
            };

            return res.status(200).send(ResponseHelper.successResponse(responseData, 'Payment status checked successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.checkPaymentStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get subscription plans
     * GET /active-tenant-payment/subscription-plans
     */
    static async getSubscriptionPlans(req, res) {
        try {

            const plans = await SubscriptionPlan.findAll({
                where: {
                    is_active: true
                },
                order: [['sort_order', 'ASC'], ['price', 'ASC']]
            });

            return res.status(200).send(ResponseHelper.successResponse(plans, 'Operation successful'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.getSubscriptionPlans - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Change subscription plan
     * POST /active-tenant-payment/change-plan
     */
    static async changePlan(req, res) {
        try {
            const { tenant_id, plan_id, billing_id } = req.body;
            
            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);
            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get selected plan
            const selectedPlan = await SubscriptionPlan.findByPk(plan_id);
            if (!selectedPlan) {
                return res.status(404).send(ResponseHelper.errorResponse('Plan not found', 404));
            }

            // Get current subscription (active or trial)
            const currentSubscription = await Subscription.findOne({
                where: {
                    tenant_id: tenant.id,
                    status: { [Op.in]: ['trial', 'active'] } // ✅ Include both trial and active
                },
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan'
                }],
                order: [['createdAt', 'DESC']]
            });

            if (!currentSubscription) {
                return res.status(404).send(ResponseHelper.errorResponse('Active subscription not found', 404));
            }

            // Check if same plan
            if (currentSubscription.plan_id === plan_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Same plan selected', 400));
            }

            // Calculate price difference
            const currentPrice = parseFloat(currentSubscription.plan.price);
            const selectedPrice = parseFloat(selectedPlan.price);
            const priceDifference = selectedPrice - currentPrice;

            // TODO: Implement billing update/create logic
            // For now, return success with calculated data
            const responseData = {
                tenant_id: tenant.id,
                current_plan: {
                    id: currentSubscription.plan.id,
                    name: currentSubscription.plan.name,
                    price: currentSubscription.plan.price
                },
                selected_plan: {
                    id: selectedPlan.id,
                    name: selectedPlan.name,
                    price: selectedPlan.price
                },
                price_difference: priceDifference,
                action: priceDifference > 0 ? 'upgrade' : 'downgrade',
                billing_id: billing_id || null
            };

            return res.status(200).send(ResponseHelper.successResponse(responseData, 'Plan change calculated successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.changePlan - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Update existing billing
     * PUT /active-tenant-payment/update-billing/:billing_id
     */
    static async updateBilling(req, res) {
        try {
            const { billing_id } = req.params;
            const { plan_id, new_amount, reason } = req.body;
            
            // Get billing
            const billing = await TenantPayment.findByPk(billing_id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            // Update billing and clear Tripay information
            const updatedBilling = await billing.update({
                amount: new_amount,
                notes: reason || `Plan change - ${billing.notes}`,
                // Clear Tripay information when changing plan
                payment_method: null,
                payment_reference: null,
                payment_gateway: null,
                payment_url: null,
                expired_at: null,
                paid_at: null
            });

            return res.status(200).send(ResponseHelper.successResponse(updatedBilling, 'Billing updated successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.updateBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Create new billing for plan change
     * POST /active-tenant-payment/create-billing
     */
    static async createBilling(req, res) {
        try {
            const { tenant_id, plan_id, amount, reason } = req.body;
            
            // Get tenant
            const tenant = await Tenant.findByPk(tenant_id);
            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Create billing
            const billing = await TenantPayment.create({
                tenant_id: tenant_id,
                amount: amount,
                status: 'unpaid',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                invoice_number: `INV-${tenant_id}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                notes: reason || 'Plan change billing'
            });

            return res.status(201).send(ResponseHelper.successResponse(billing, 'Billing created successfully'));

        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.createBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Generate unique payment code for billing
     * POST /active-tenant-payment/generate-payment-code
     */
    static async generatePaymentCode(req, res) {
        try {
            
            const { billing_id } = req.body;
            
            if (!billing_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing ID is required', 400));
            }
            
            // Get billing with subscription plan
            const billing = await TenantPayment.findOne({
                where: {
                    id: billing_id,
                    tenant_id: req.user.tenant_id,
                    status: 'unpaid'
                },
                include: [{
                    model: SubscriptionPlan,
                    as: 'subscription_plan'
                }]
            });
            
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found or already paid', 404));
            }
            
            // Generate unique payment code (101-499, no zeros)
            const generateUniquePaymentCode = () => {
                const min = 101;
                const max = 499;
                
                // Generate random number between 101-499
                let code = Math.floor(Math.random() * (max - min + 1)) + min;
                
                // Ensure no zeros in the code
                while (code.toString().includes('0')) {
                    code = Math.floor(Math.random() * (max - min + 1)) + min;
                }
                
                return code.toString();
            };
            
            // Get original amount from subscription plan (always use base price from plan)
            // If subscription_plan is not available, get it from subscription
            let originalAmount;
            if (billing.subscription_plan?.price) {
                originalAmount = parseFloat(billing.subscription_plan.price);
            } else {
                // Get subscription plan price from subscription
                const subscription = await Subscription.findOne({
                    where: { tenant_id: req.user.tenant_id },
                    include: [{
                        model: SubscriptionPlan,
                        as: 'plan'
                    }],
                    order: [['createdAt', 'DESC']]
                });
                
                if (subscription?.plan?.price) {
                    originalAmount = parseFloat(subscription.plan.price);
                } else {
                    // Fallback to a reasonable default based on plan type
                    originalAmount = 99000; // Default NotaLite price
                }
            }
            // Generate payment code that will be the last 3 digits of final amount
            const paymentCode = generateUniquePaymentCode();
            
            // Calculate final amount: original amount + payment code
            const finalAmount = originalAmount + parseInt(paymentCode);
            
            // Update billing with payment code and final amount
            await billing.update({
                payment_code: paymentCode,
                amount: finalAmount.toString()
            });
            
            return res.status(200).send(ResponseHelper.successResponse({
                billing_id: billing.id,
                original_amount: originalAmount.toFixed(2),
                payment_code: paymentCode,
                final_amount: finalAmount.toFixed(2),
                formatted_amount: `(${finalAmount.toLocaleString('id-ID')})`,
                base_amount: originalAmount.toFixed(2)
            }, 'Payment code generated successfully'));
            
        } catch (error) {
            console.error('❌ ActiveTenantPaymentController.generatePaymentCode - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }
}

module.exports = ActiveTenantPaymentController;
