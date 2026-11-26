/**
 * Helper functions for subscription plan checks
 */
class PlanHelper {
  /**
   * Check if a plan is NotaFree (free plan)
   * @param {Object|number} plan - Plan object or plan ID
   * @returns {boolean} - True if NotaFree
   */
  static isFreePlan(plan) {
    if (!plan) return false;
    
    // If plan is ID, we need to check by ID (4 is NotaFree)
    if (typeof plan === 'number') {
      return plan === 4;
    }
    
    // If plan is object, check by name or price
    if (plan.name === 'NotaFree' || parseFloat(plan.price || 0) === 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if subscription should skip billing generation
   * @param {Object} subscription - Subscription object
   * @param {Object} plan - Plan object (optional)
   * @returns {boolean} - True if should skip billing
   */
  static shouldSkipBillingGeneration(subscription, plan = null) {
    if (!subscription) return false;
    
    // If subscription has no end_date, it's likely NotaFree
    if (!subscription.end_date) {
      return true;
    }
    
    // Check plan if provided
    if (plan && this.isFreePlan(plan)) {
      return true;
    }
    
    // Check by plan_id if available
    if (subscription.plan_id === 4) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if subscription should skip expiration check
   * @param {Object} subscription - Subscription object
   * @param {Object} plan - Plan object (optional)
   * @returns {boolean} - True if should skip expiration check
   */
  static shouldSkipExpirationCheck(subscription, plan = null) {
    return this.shouldSkipBillingGeneration(subscription, plan);
  }
}

module.exports = PlanHelper;

