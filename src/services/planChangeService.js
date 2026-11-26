const BillingPlanUpdateService = require('./billingPlanUpdateService');
const SubscriptionPlanService = require('./subscriptionPlanService');
const DowngradeService = require('./downgradeService');
const SubscriptionRepository = require('../repositories/subscriptionRepository');
const PlanHelper = require('../helpers/planHelper');
const { Tenant, SubscriptionPlan, Subscription, TenantPayment } = require('../models');
const { Op } = require('sequelize');

class PlanChangeService {
    /**
     * Main entry point for plan change
     * @param {number} tenantId - Tenant ID
     * @param {number} planId - New plan ID
     * @param {number} billingId - Existing billing ID (optional)
     * @returns {Object} Plan change result
     */
    static async changePlan(tenantId, planId, billingId) {
        try {
            console.log('🔍 PlanChangeService.changePlan - Starting plan change:', { tenantId, planId, billingId });

            // Validate input
            await this.validatePlanChangeRequest(tenantId, planId, billingId);

            // Get current subscription and new plan details
            const currentSubscription = await this.getCurrentSubscription(tenantId);
            const newPlan = await this.getPlanDetails(planId);

            // ✅ NEW: Check if downgrading to NotaFree - handle immediately without payment
            if (PlanHelper.isFreePlan(newPlan)) {
                console.log('🔄 PlanChangeService.changePlan - Downgrading to NotaFree, processing immediately without payment');

                // Use DowngradeService for consistency
                const newSubscription = await DowngradeService.downgradeToNotaFree(tenantId, currentSubscription);

                // Calculate price difference
                const priceDifference = this.calculatePriceDifference(currentSubscription.plan.price, newPlan.price);

                return {
                    success: true,
                    tenant_id: tenantId,
                    current_plan: {
                        id: currentSubscription.plan.id,
                        name: currentSubscription.plan.name,
                        price: currentSubscription.plan.price
                    },
                    selected_plan: {
                        id: newPlan.id,
                        name: newPlan.name,
                        price: newPlan.price
                    },
                    price_difference: priceDifference,
                    action: 'downgrade',
                    subscription_id: newSubscription.id,
                    message: 'Downgraded to NotaFree successfully - no payment required',
                    auto_completed: true
                };
            }

            // ✅ NEW: Auto-cancel any existing unpaid billing before creating new billing
            // This prevents multiple unpaid billings when user changes plan multiple times
            console.log('🔍 PlanChangeService.changePlan - Checking for existing unpaid billing...');
            const existingUnpaidBilling = await TenantPayment.findOne({
                where: {
                    tenant_id: tenantId,
                    status: 'unpaid'
                },
                order: [['createdAt', 'DESC']]
            });

            if (existingUnpaidBilling) {
                console.log('🔄 PlanChangeService.changePlan - Auto-cancelling existing unpaid billing:', {
                    billing_id: existingUnpaidBilling.id,
                    invoice_number: existingUnpaidBilling.invoice_number,
                    amount: existingUnpaidBilling.amount
                });

                await existingUnpaidBilling.update({
                    status: 'cancelled',
                    notes: (existingUnpaidBilling.notes || '') + ' | Auto-cancelled due to plan change'
                });

                console.log('✅ PlanChangeService.changePlan - Existing unpaid billing cancelled successfully');
            }

            // For paid plans, proceed with normal billing flow
            // Calculate price difference
            const priceDifference = this.calculatePriceDifference(currentSubscription.plan.price, newPlan.price);

            // Determine strategy based on billingId
            const strategy = await this.determineChangeStrategy(tenantId, billingId);

            let result;
            if (strategy === 'update_existing') {
                result = await BillingPlanUpdateService.updateExistingBillingPlan(billingId, planId, newPlan.price);
            } else {
                result = await BillingPlanUpdateService.createNewBillingWithPlan(tenantId, planId, newPlan.price);
            }

            // ✅ Subscription aktif tetap aktif sampai payment confirmed
            // Subscription akan di-expire dan dibuat baru saat payment confirmed (callback tripay atau manual confirm)
            // Logic expire subscription ada di: billingService.createSubscriptionFromBilling() dan extendSubscriptionAfterPayment()
            console.log('ℹ️ PlanChangeService.changePlan - Subscription will be expired and created after payment is confirmed');

            return {
                success: true,
                tenant_id: tenantId,
                current_plan: {
                    id: currentSubscription.plan.id,
                    name: currentSubscription.plan.name,
                    price: currentSubscription.plan.price
                },
                selected_plan: {
                    id: newPlan.id,
                    name: newPlan.name,
                    price: newPlan.price
                },
                price_difference: priceDifference,
                action: priceDifference > 0 ? 'upgrade' : 'downgrade',
                billing_id: result.billing_id,
                strategy: strategy,
                message: 'Subscription will be updated after payment is confirmed'
            };

        } catch (error) {
            console.error('❌ PlanChangeService.changePlan - Error:', error);
            throw error;
        }
    }

    /**
     * Validate plan change request
     */
    static async validatePlanChangeRequest(tenantId, planId, billingId) {
        await this.validateTenantExists(tenantId);
        await this.validatePlanExists(planId);

        if (billingId) {
            await this.validateBillingExists(billingId, tenantId);
        }
    }

    /**
     * Validate tenant exists
     */
    static async validateTenantExists(tenantId) {
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        return tenant;
    }

    /**
     * Validate plan exists
     */
    static async validatePlanExists(planId) {
        const plan = await SubscriptionPlan.findByPk(planId);
        if (!plan || !plan.is_active) {
            throw new Error('Plan not found or inactive');
        }
        return plan;
    }

    /**
     * Validate billing exists and belongs to tenant
     */
    static async validateBillingExists(billingId, tenantId) {
        const billing = await TenantPayment.findOne({
            where: {
                id: billingId,
                tenant_id: tenantId,
                status: {
                    [Op.in]: ['unpaid', 'pending']
                }
            }
        });

        if (!billing) {
            throw new Error('Billing not found or not unpaid/pending');
        }
        return billing;
    }

    /**
     * Get current subscription
     */
    static async getCurrentSubscription(tenantId) {
        const subscription = await Subscription.findOne({
            where: {
                tenant_id: tenantId,
                status: 'active'
            },
            include: [{
                model: SubscriptionPlan,
                as: 'plan'
            }],
            order: [['createdAt', 'DESC']]
        });

        if (!subscription) {
            throw new Error('Active subscription not found');
        }
        return subscription;
    }

    /**
     * Get plan details
     */
    static async getPlanDetails(planId) {
        return await SubscriptionPlan.findByPk(planId);
    }

    /**
     * Calculate price difference
     */
    static calculatePriceDifference(currentPrice, newPrice) {
        return parseFloat(newPrice) - parseFloat(currentPrice);
    }

    /**
     * Determine change strategy
     */
    static async determineChangeStrategy(tenantId, billingId) {
        if (billingId) {
            return 'update_existing';
        } else {
            return 'create_new';
        }
    }
}

module.exports = PlanChangeService;
