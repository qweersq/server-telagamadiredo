const { TenantPayment, Subscription, SubscriptionPlan } = require('../models');
const { Op } = require('sequelize');
const PlanHelper = require('../helpers/planHelper');

class BillingValidationService {
    /**
     * Main validation function - ensures only one unpaid/pending billing per tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Object} Validation result
     */
    static async validateSingleBillingRule(tenantId) {
        try {
            console.log('🔍 BillingValidationService.validateSingleBillingRule - Tenant ID:', tenantId);

            // Get all unpaid/pending billings for tenant
            const unpaidBillings = await this.getUnpaidBillings(tenantId);
            
            if (unpaidBillings.length <= 1) {
                console.log('✅ BillingValidationService.validateSingleBillingRule - Valid: Only', unpaidBillings.length, 'billing(s) found');
                return {
                    isValid: true,
                    count: unpaidBillings.length,
                    billings: unpaidBillings
                };
            }

            // Multiple billings found - cleanup required
            console.log('⚠️ BillingValidationService.validateSingleBillingRule - Multiple billings found:', unpaidBillings.length);
            
            const cleanupResult = await this.cleanupMultipleBillings(tenantId, true);
            
            return {
                isValid: true,
                count: cleanupResult.remainingCount,
                billings: cleanupResult.remainingBillings,
                cleanup: {
                    deleted: cleanupResult.deletedCount,
                    deletedIds: cleanupResult.deletedIds
                }
            };

        } catch (error) {
            console.error('❌ BillingValidationService.validateSingleBillingRule - Error:', error);
            throw error;
        }
    }

    /**
     * Get all unpaid/pending billings for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Array} Array of billings
     */
    static async getUnpaidBillings(tenantId) {
        try {
            const billings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenantId,
                    status: {
                        [Op.in]: ['unpaid', 'pending']
                    }
                },
                order: [['createdAt', 'DESC']]
            });

            console.log('📊 BillingValidationService.getUnpaidBillings - Found', billings.length, 'billings for tenant', tenantId);
            return billings;

        } catch (error) {
            console.error('❌ BillingValidationService.getUnpaidBillings - Error:', error);
            return [];
        }
    }

    /**
     * Cleanup multiple billings - keep only the latest one
     * @param {number} tenantId - Tenant ID
     * @param {boolean} keepLatest - Whether to keep the latest billing (default: true)
     * @returns {Object} Cleanup result
     */
    static async cleanupMultipleBillings(tenantId, keepLatest = true) {
        try {
            console.log('🧹 BillingValidationService.cleanupMultipleBillings - Tenant ID:', tenantId, 'Keep latest:', keepLatest);

            const billings = await this.getUnpaidBillings(tenantId);
            
            if (billings.length <= 1) {
                console.log('✅ BillingValidationService.cleanupMultipleBillings - No cleanup needed');
                return {
                    remainingCount: billings.length,
                    remainingBillings: billings,
                    deletedCount: 0,
                    deletedIds: []
                };
            }

            if (keepLatest) {
                // Keep the first one (latest by createdAt DESC), delete the rest
                const toKeep = billings[0];
                const toDelete = billings.slice(1);
                
                const deletedIds = toDelete.map(billing => billing.id);
                
                await TenantPayment.destroy({
                    where: {
                        id: {
                            [Op.in]: deletedIds
                        }
                    }
                });

                console.log('🗑️ BillingValidationService.cleanupMultipleBillings - Deleted', toDelete.length, 'billings:', deletedIds);
                console.log('✅ BillingValidationService.cleanupMultipleBillings - Kept billing:', toKeep.id);

                return {
                    remainingCount: 1,
                    remainingBillings: [toKeep],
                    deletedCount: toDelete.length,
                    deletedIds: deletedIds
                };
            } else {
                // Delete all billings
                const deletedIds = billings.map(billing => billing.id);
                
                await TenantPayment.destroy({
                    where: {
                        id: {
                            [Op.in]: deletedIds
                        }
                    }
                });

                console.log('🗑️ BillingValidationService.cleanupMultipleBillings - Deleted all', billings.length, 'billings');

                return {
                    remainingCount: 0,
                    remainingBillings: [],
                    deletedCount: billings.length,
                    deletedIds: deletedIds
                };
            }

        } catch (error) {
            console.error('❌ BillingValidationService.cleanupMultipleBillings - Error:', error);
            throw error;
        }
    }

    /**
     * Check if billing can be generated (no existing unpaid billings)
     * @param {number} tenantId - Tenant ID
     * @returns {boolean} Whether billing can be generated
     */
    static async canGenerateBilling(tenantId) {
        try {
            console.log('🔍 BillingValidationService.canGenerateBilling - Tenant ID:', tenantId);

            // ✅ NEW: Check if tenant has NotaFree plan - skip billing generation
            const subscription = await Subscription.findOne({
                where: { tenant_id: tenantId, status: { [Op.in]: ['active', 'trial'] } },
                include: [{ association: 'plan' }]
            });
            
            if (subscription && PlanHelper.shouldSkipBillingGeneration(subscription, subscription.plan)) {
                console.log('⏭️ BillingValidationService.canGenerateBilling - NotaFree plan, cannot generate billing');
                return false; // Return false to prevent billing generation
            }

            const unpaidBillings = await this.getUnpaidBillings(tenantId);
            const canGenerate = unpaidBillings.length === 0;

            console.log('📊 BillingValidationService.canGenerateBilling - Can generate:', canGenerate, 'Unpaid billings:', unpaidBillings.length);
            return canGenerate;

        } catch (error) {
            console.error('❌ BillingValidationService.canGenerateBilling - Error:', error);
            return false;
        }
    }

    /**
     * Get billing summary for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Object} Billing summary
     */
    static async getBillingSummary(tenantId) {
        try {
            const unpaidBillings = await this.getUnpaidBillings(tenantId);
            
            const summary = {
                tenant_id: tenantId,
                total_unpaid: unpaidBillings.length,
                billings: unpaidBillings.map(billing => ({
                    id: billing.id,
                    invoice_number: billing.invoice_number,
                    amount: billing.amount,
                    status: billing.status,
                    due_date: billing.due_date,
                    created_at: billing.createdAt
                })),
                total_amount: unpaidBillings.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0),
                latest_billing: unpaidBillings.length > 0 ? unpaidBillings[0] : null
            };

            console.log('📊 BillingValidationService.getBillingSummary - Summary:', summary);
            return summary;

        } catch (error) {
            console.error('❌ BillingValidationService.getBillingSummary - Error:', error);
            return {
                tenant_id: tenantId,
                total_unpaid: 0,
                billings: [],
                total_amount: 0,
                latest_billing: null
            };
        }
    }

    /**
     * Force cleanup all billings for tenant (admin function)
     * @param {number} tenantId - Tenant ID
     * @returns {Object} Cleanup result
     */
    static async forceCleanupAllBillings(tenantId) {
        try {
            console.log('🧹 BillingValidationService.forceCleanupAllBillings - Tenant ID:', tenantId);

            const result = await this.cleanupMultipleBillings(tenantId, false);
            
            console.log('✅ BillingValidationService.forceCleanupAllBillings - Cleanup completed:', result);
            return result;

        } catch (error) {
            console.error('❌ BillingValidationService.forceCleanupAllBillings - Error:', error);
            throw error;
        }
    }
}

module.exports = BillingValidationService;
