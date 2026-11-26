const BillingExpirationService = require('./billingExpirationService');
const BillingValidationService = require('./billingValidationService');
const PlanHelper = require('../helpers/planHelper');

class BillingGenerationService {
  /**
   * Generate billing for expired tenants before 402 response
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object
   * @param {string} status - Tenant status (trial_expired, invalid, etc.)
   * @returns {Object|null} - Generated billing or null
   */
  static async generateBillingForExpiredTenant(user, tenant, status) {
    try {
      // ✅ NEW: Skip billing generation for NotaFree plan
      const { Subscription } = require('../models');
      const subscription = await Subscription.findOne({
        where: { tenant_id: tenant.id, status: { [Op.in]: ['active', 'trial'] } },
        include: [{ 
          model: require('../models').SubscriptionPlan,
          as: 'plan'
        }]
      });
      
      if (subscription && PlanHelper.shouldSkipBillingGeneration(subscription, subscription.plan)) {
        console.log('⏭️ BillingGenerationService.generateBillingForExpiredTenant - Skipping generation, NotaFree plan');
        return null;
      }

      // NEW: Validate single billing rule before generating
      const canGenerate = await BillingValidationService.canGenerateBilling(tenant.id);
      if (!canGenerate) {
        console.log('⏭️ BillingGenerationService.generateBillingForExpiredTenant - Skipping generation, unpaid billing exists');
        return null;
      }

      // Only generate billing for trial expired tenants
      if (status === 'trial_expired') {
        console.log('🔍 Trial expired detected, generating billing...');
        
        const trialSubscription = await Subscription.findOne({
          where: { tenant_id: tenant.id, status: 'active' }
        });
        
        console.log('🔍 Trial subscription found:', trialSubscription ? trialSubscription.id : 'null');
        
        const billing = await BillingExpirationService.generateBillingForExpired(
          tenant, 
          trialSubscription, 
          user, 
          'trial'
        );
        
        console.log('🔍 Billing generated:', billing ? billing.id : 'null');
        return billing;
      }

      // For other statuses, no billing generation needed
      console.log('ℹ️ No billing generation needed for status:', status);
      return null;

    } catch (error) {
      console.error('❌ Error generating billing for expired tenant:', error.message);
      return null;
    }
  }

  /**
   * Generate billing for H-1 (trial) and H-7 (active) tenants
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object
   * @param {Object} subscription - Subscription object (optional)
   */
  static async generateBillingForH1H7(user, tenant, subscription = null) {
    try {
      // ✅ NEW: Skip billing generation for NotaFree plan
      if (subscription && PlanHelper.shouldSkipBillingGeneration(subscription, subscription.plan)) {
        console.log('⏭️ BillingGenerationService.generateBillingForH1H7 - Skipping H-1/H-7 generation, NotaFree plan');
        return;
      }

      // NEW: Validate single billing rule before H-1/H-7 generation
      const canGenerate = await BillingValidationService.canGenerateBilling(tenant.id);
      if (!canGenerate) {
        console.log('⏭️ BillingGenerationService.generateBillingForH1H7 - Skipping H-1/H-7 generation, unpaid billing exists');
        return;
      }

      // Check if trial tenant is expiring tomorrow (H-1)
      if (tenant.status === 'trial' && tenant.subscription_status === 'trial') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (tenant.trial_end_date && 
            new Date(tenant.trial_end_date) >= today && 
            new Date(tenant.trial_end_date) <= tomorrow) {
          console.log('🔍 H-1 Trial billing check for tenant:', tenant.id);
          await BillingExpirationService.generateBillingForTrialH1();
        }
      }

      // Check if active subscription is expiring in 7 days (H-7)
      if (tenant.status === 'active' && subscription) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        sevenDaysFromNow.setHours(23, 59, 59, 999);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (subscription.end_date && 
            new Date(subscription.end_date) >= today && 
            new Date(subscription.end_date) <= sevenDaysFromNow) {
          console.log('🔍 H-7 Active billing check for tenant:', tenant.id);
          await BillingExpirationService.generateBillingForActiveH7();
        }
      }
    } catch (error) {
      console.error('Error in H-1/H-7 billing generation:', error.message);
    }
  }
}

module.exports = BillingGenerationService;
