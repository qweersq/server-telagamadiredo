const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');
const TenantRepository = require('../repositories/tenantRepository');
const SubscriptionRepository = require('../repositories/subscriptionRepository');
const moment = require('moment');

class TenantReactivationService {
    /**
     * Reactivate suspended tenant with fresh start approach
     * - Cancel old failed billings
     * - Create new subscription billing
     * - Reactivate tenant status
     */
    static async reactivateTenant(tenantId, planId, paymentData = {}) {
        try {
            console.log('🔄 TenantReactivationService.reactivateTenant - Starting reactivation:', {
                tenantId,
                planId,
                paymentData
            });

            // 1. Validate tenant is suspended
            const tenant = await TenantRepository.getById(tenantId);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            if (tenant.status !== 'suspended') {
                throw new Error('Tenant is not suspended, cannot reactivate');
            }

            console.log('✅ Tenant validation passed:', {
                tenantId: tenant.id,
                currentStatus: tenant.status,
                subscriptionStatus: tenant.subscription_status
            });

            // 2. Cancel old failed billings (Fresh Start approach)
            await this.cancelFailedBillings(tenantId);

            // 3. Create new subscription
            const newSubscription = await this.createFreshSubscription(tenantId, planId);

            // 4. Create new billing for the subscription
            const newBilling = await this.createReactivationBilling(tenantId, newSubscription, paymentData);

            // 5. Update tenant status to active
            await this.reactivateTenantStatus(tenantId);

            console.log('✅ TenantReactivationService.reactivateTenant - Reactivation completed:', {
                tenantId,
                newSubscriptionId: newSubscription.id,
                newBillingId: newBilling.id
            });

            return {
                tenant: await TenantRepository.getById(tenantId),
                subscription: newSubscription,
                billing: newBilling,
                message: 'Tenant successfully reactivated with fresh subscription'
            };

        } catch (error) {
            console.error('❌ TenantReactivationService.reactivateTenant - Error:', error);
            throw error;
        }
    }

    /**
     * Cancel all failed billings for the tenant (Fresh Start)
     */
    static async cancelFailedBillings(tenantId) {
        try {
            console.log('🗑️ Cancelling failed billings for tenant:', tenantId);

            const { TenantPayment } = require('../models');
            
            // Find all failed billings
            const failedBillings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenantId,
                    status: 'failed'
                }
            });

            console.log(`Found ${failedBillings.length} failed billings to cancel`);

            // Update status to cancelled with notes
            for (const billing of failedBillings) {
                await TenantPayment.update(
                    {
                        status: 'cancelled',
                        notes: billing.notes + ' - CANCELLED: Fresh start reactivation'
                    },
                    { where: { id: billing.id } }
                );

                console.log(`✅ Cancelled billing: ${billing.invoice_number}`);
            }

            return failedBillings.length;

        } catch (error) {
            console.error('❌ Error cancelling failed billings:', error);
            throw error;
        }
    }

    /**
     * Create fresh subscription for reactivated tenant
     */
    static async createFreshSubscription(tenantId, planId) {
        try {
            console.log('📋 Creating fresh subscription:', { tenantId, planId });

            const { Subscription, SubscriptionPlan } = require('../models');

            // Get plan details
            const plan = await SubscriptionPlan.findByPk(planId);
            if (!plan) {
                throw new Error('Subscription plan not found');
            }

            // Cancel any existing active subscriptions
            await Subscription.update(
                { status: 'cancelled' },
                { 
                    where: { 
                        tenant_id: tenantId,
                        status: ['active', 'trial']
                    }
                }
            );

            // Create new subscription
            const subscriptionData = {
                tenant_id: tenantId,
                plan_id: planId,
                status: 'active',
                start_date: new Date(),
                end_date: moment().add(plan.duration_days, 'days').toDate(),
                price: plan.price,
                final_price: plan.price,
                notes: 'Fresh subscription created during reactivation'
            };

            const newSubscription = await Subscription.create(subscriptionData);

            console.log('✅ Fresh subscription created:', {
                subscriptionId: newSubscription.id,
                planName: plan.name,
                duration: plan.duration_days,
                endDate: newSubscription.end_date
            });

            return newSubscription;

        } catch (error) {
            console.error('❌ Error creating fresh subscription:', error);
            throw error;
        }
    }

    /**
     * Create billing for reactivation
     */
    static async createReactivationBilling(tenantId, subscription, paymentData) {
        try {
            console.log('💰 Creating reactivation billing:', { tenantId, subscriptionId: subscription.id });

            const billingData = {
                subscription_id: subscription.id,
                tenant_id: tenantId,
                amount: subscription.final_price,
                status: 'pending', // Start as pending, will be updated when payment is made
                due_date: moment().add(7, 'days').toDate(), // 7 days to pay
                invoice_number: this.generateReactivationInvoiceNumber(tenantId),
                notes: 'Reactivation billing - Fresh start subscription',
                ...paymentData
            };

            const billing = await TenantPaymentRepository.create(billingData);

            console.log('✅ Reactivation billing created:', {
                billingId: billing.id,
                invoiceNumber: billing.invoice_number,
                amount: billing.amount
            });

            return billing;

        } catch (error) {
            console.error('❌ Error creating reactivation billing:', error);
            throw error;
        }
    }

    /**
     * Reactivate tenant status
     */
    static async reactivateTenantStatus(tenantId) {
        try {
            console.log('🔄 Reactivating tenant status:', tenantId);

            const { Tenant } = require('../models');

            await Tenant.update(
                {
                    status: 'active',
                    subscription_status: 'active'
                },
                { where: { id: tenantId } }
            );

            console.log('✅ Tenant status reactivated: suspended → active');

        } catch (error) {
            console.error('❌ Error reactivating tenant status:', error);
            throw error;
        }
    }

    /**
     * Generate unique invoice number for reactivation
     */
    static generateReactivationInvoiceNumber(tenantId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `REACT-${tenantId}-${timestamp}-${random}`;
    }

    /**
     * Get reactivation info for suspended tenant
     */
    static async getReactivationInfo(tenantId) {
        try {
            console.log('🔍 Getting reactivation info for tenant:', tenantId);

            const tenant = await TenantRepository.getById(tenantId);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            if (tenant.status !== 'suspended') {
                return {
                    canReactivate: false,
                    reason: 'Tenant is not suspended'
                };
            }

            // Get failed billings count
            const { TenantPayment } = require('../models');
            const failedBillingsCount = await TenantPayment.count({
                where: {
                    tenant_id: tenantId,
                    status: 'failed'
                }
            });

            // Get available plans
            const { SubscriptionPlan } = require('../models');
            const availablePlans = await SubscriptionPlan.findAll({
                where: { is_active: true },
                order: [['price', 'ASC']]
            });

            return {
                canReactivate: true,
                tenant: {
                    id: tenant.id,
                    business_name: tenant.business_name,
                    status: tenant.status,
                    subscription_status: tenant.subscription_status
                },
                failedBillingsCount,
                availablePlans,
                message: 'Account suspended due to overdue payment. Choose a plan to reactivate with fresh start.'
            };

        } catch (error) {
            console.error('❌ Error getting reactivation info:', error);
            throw error;
        }
    }
}

module.exports = TenantReactivationService;
