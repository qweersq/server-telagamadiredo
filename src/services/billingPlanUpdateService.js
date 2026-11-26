const { TenantPayment, SubscriptionPlan } = require('../models');

class BillingPlanUpdateService {
    /**
     * Update existing billing with new plan
     * @param {number} billingId - Billing ID to update
     * @param {number} newPlanId - New plan ID
     * @param {string} newAmount - New amount
     * @returns {Object} Updated billing result
     */
    static async updateExistingBillingPlan(billingId, newPlanId, newAmount) {
        try {
            console.log('🔍 BillingPlanUpdateService.updateExistingBillingPlan - Updating billing:', { billingId, newPlanId, newAmount });

            // Get billing details
            const billing = await this.getBillingDetails(billingId);
            if (!billing) {
                throw new Error('Billing not found');
            }

            // Get new plan details
            const newPlan = await SubscriptionPlan.findByPk(newPlanId);
            if (!newPlan) {
                throw new Error('New plan not found');
            }

            // Update billing
            const updateData = {
                amount: parseFloat(newAmount),
                subscription_plan_id: newPlanId, // ✅ Fixed: Set plan ID for change plan billing
                status: 'unpaid', // Change pending to unpaid
                notes: `Paket diubah ke ${newPlan.name}`,
                // Clear Tripay information when changing plan
                payment_method: null,
                payment_reference: null,
                payment_gateway: null,
                payment_url: null,
                expired_at: null,
                paid_at: null,
                updated_at: new Date()
            };

            const updatedBilling = await TenantPayment.update(updateData, {
                where: { id: billingId },
                returning: true
            });

            console.log('✅ BillingPlanUpdateService.updateExistingBillingPlan - Billing updated successfully');

            return {
                billing_id: billingId,
                old_amount: billing.amount,
                new_amount: parseFloat(newAmount),
                plan_name: newPlan.name,
                status: 'updated'
            };

        } catch (error) {
            console.error('❌ BillingPlanUpdateService.updateExistingBillingPlan - Error:', error);
            throw error;
        }
    }

    /**
     * Create new billing with plan
     * @param {number} tenantId - Tenant ID
     * @param {number} planId - Plan ID
     * @param {string} amount - Amount
     * @returns {Object} Created billing result
     */
    static async createNewBillingWithPlan(tenantId, planId, amount) {
        try {
            console.log('🔍 BillingPlanUpdateService.createNewBillingWithPlan - Creating new billing:', { tenantId, planId, amount });

            // Get plan details
            const plan = await SubscriptionPlan.findByPk(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            // ✅ Cancel ALL existing unpaid billings for this tenant (plan change + renewal)
            const { Op } = require('sequelize');
            const cancelledBillings = await TenantPayment.update(
                {
                    status: 'cancelled',
                    notes: 'Dibatalkan karena ada perubahan paket baru'
                },
                {
                    where: {
                        tenant_id: tenantId,
                        status: { [Op.in]: ['unpaid', 'pending'] }
                        // Removed subscription_id filter - cancel ALL unpaid billings
                    }
                }
            );
            if (cancelledBillings[0] > 0) {
                console.log(`✅ BillingPlanUpdateService.createNewBillingWithPlan - Cancelled ${cancelledBillings[0]} old unpaid billing(s) (including renewals)`);
            }

            // Create new billing
            const billingData = {
                tenant_id: tenantId,
                subscription_id: null, // Will be set when payment is confirmed
                subscription_plan_id: planId, // ✅ Fixed: Set plan ID for change plan billing
                amount: parseFloat(amount),
                status: 'unpaid',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                invoice_number: this.generateInvoiceNumber(),
                notes: `Perubahan paket ke ${plan.name}`,
                created_at: new Date(),
                updated_at: new Date()
            };

            const newBilling = await TenantPayment.create(billingData);

            console.log('✅ BillingPlanUpdateService.createNewBillingWithPlan - New billing created successfully');

            return {
                billing_id: newBilling.id,
                amount: parseFloat(amount),
                plan_name: plan.name,
                due_date: billingData.due_date,
                status: 'created'
            };

        } catch (error) {
            console.error('❌ BillingPlanUpdateService.createNewBillingWithPlan - Error:', error);
            throw error;
        }
    }

    /**
     * Get billing details
     * @param {number} billingId - Billing ID
     * @returns {Object} Billing details
     */
    static async getBillingDetails(billingId) {
        return await TenantPayment.findByPk(billingId);
    }

    /**
     * Calculate new billing amount
     * @param {Object} currentPlan - Current plan
     * @param {Object} newPlan - New plan
     * @returns {number} New amount
     */
    static calculateNewBillingAmount(currentPlan, newPlan) {
        return parseFloat(newPlan.price);
    }

    /**
     * Update billing amount
     * @param {number} billingId - Billing ID
     * @param {number} newAmount - New amount
     * @returns {Object} Updated billing
     */
    static async updateBillingAmount(billingId, newAmount) {
        const updateData = {
            amount: parseFloat(newAmount),
            updated_at: new Date()
        };

        return await TenantPayment.update(updateData, {
            where: { id: billingId },
            returning: true
        });
    }

    /**
     * Generate invoice number
     * @returns {string} Invoice number
     */
    static generateInvoiceNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `INV-${timestamp}-${random}`;
    }
}

module.exports = BillingPlanUpdateService;
