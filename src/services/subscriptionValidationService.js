const { Op } = require('sequelize');
const PlanHelper = require('../helpers/planHelper');
const DowngradeService = require('./downgradeService');

class SubscriptionValidationService {
  /**
   * Validate subscription status and handle trial expiration
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object
   * @returns {Object} - Validation result with status and data
   */
  static async validateSubscription(user, tenant) {
    try {
      console.log('🔍 Subscription validation:', {
        userId: user.id,
        tenantId: tenant.id
      });

      const SubscriptionRepository = require('../repositories/subscriptionRepository');
      const { SubscriptionPlan } = require('../models');

      // Get latest subscription (ignore status, validasi cukup dari end_date)
      const activeSubscription = await SubscriptionRepository.getLatestSubscription(tenant.id);

      // Check if tenant has NotaFree plan - skip validation
      if (activeSubscription) {
        const plan = await SubscriptionPlan.findByPk(activeSubscription.plan_id);
        if (plan && PlanHelper.isFreePlan(plan)) {
          console.log('✅ Subscription validation passed: NotaFree plan (no expiration)');
          return { isValid: true, status: 'active', isFreePlan: true };
        }
      }

      // If no subscription found, try to downgrade
      if (!activeSubscription) {
        console.log('⚠️ No active subscription found, attempting downgrade to NotaFree');
        try {
          await DowngradeService.downgradeToNotaFree(tenant.id);
          await tenant.reload();
          console.log('✅ Subscription validation passed: Auto downgraded to NotaFree');
          return { isValid: true, status: 'active', isFreePlan: true, autoDowngraded: true };
        } catch (downgradeError) {
          console.error('❌ Failed to auto downgrade:', downgradeError.message);
          return {
            isValid: false,
            status: 'invalid',
            message: 'Subscription tidak ditemukan'
          };
        }
      }

      // Check if subscription end_date is passed (H+1 WIB)
      if (activeSubscription.end_date) {
        const moment = require('moment-timezone');
        const nowWIB = moment().tz('Asia/Jakarta');
        const endDate = moment(activeSubscription.end_date).tz('Asia/Jakarta');

        // H+1 Logic: end_date + 1 hari <= sekarang (baru dianggap expired)
        const endDatePlusOne = endDate.clone().add(1, 'day').endOf('day');

        if (endDatePlusOne <= nowWIB) {
          console.log('❌ Subscription expired (H+1), downgrading to NotaFree');

          try {
            await DowngradeService.downgradeToNotaFree(tenant.id, activeSubscription);
            await tenant.reload();
            console.log('✅ Subscription validation passed: Auto downgraded to NotaFree');
            return { isValid: true, status: 'active', isFreePlan: true, autoDowngraded: true };
          } catch (downgradeError) {
            console.error('❌ Failed to auto downgrade:', downgradeError.message);
            return {
              isValid: false,
              status: 'expired',
              message: 'Subscription telah berakhir'
            };
          }
        }
      }

      console.log('✅ Subscription validation passed: Active subscription');
      return { isValid: true, status: 'active' };

    } catch (error) {
      console.error('❌ Subscription validation error:', error);
      throw error;
    }
  }

  /**
   * Update tenant and subscription status when trial expires
   * @param {Object} tenant - Tenant object
   * @deprecated No longer needed - validation now handles downgrade directly
   */
  static async updateTrialExpired(tenant) {
    try {
      const SubscriptionRepository = require('../repositories/subscriptionRepository');
      const activeSubscription = await SubscriptionRepository.getLatestSubscription(tenant.id);
      if (activeSubscription) {
        await SubscriptionRepository.update(activeSubscription.id, { status: 'expired' });
        await DowngradeService.downgradeToNotaFree(tenant.id, activeSubscription);
      }
      await tenant.reload();
    } catch (error) {
      console.error('❌ Failed to update subscription status:', error.message);
    }
  }

  /**
   * Check if tenant needs payment (expired trial or invalid subscription)
   * @param {Object} validationResult - Result from validateSubscription
   * @returns {boolean} - True if payment is required
   */
  static needsPayment(validationResult) {
    return !validationResult.isValid && 
           (validationResult.status === 'expired' || validationResult.status === 'invalid');
  }

  /**
   * Validasi apakah user bisa membuat user baru
   * @param {number} tenantId - ID tenant
   * @param {Object} subscriptionData - Data subscription dari get-profile API
   * @returns {Object} - { isValid: boolean, message: string, current: number, max: number }
   */
  static async validateUserCreation(tenantId, subscriptionData) {
    try {
      if (!subscriptionData || !subscriptionData.plan) {
        return {
          isValid: false,
          message: 'Data subscription tidak ditemukan',
          current: 0,
          max: 0,
          type: 'error'
        };
      }

      const { max_users, current_users } = subscriptionData.plan;
      
      // Jika max_users null atau undefined, berarti unlimited
      if (max_users === null || max_users === undefined) {
        return {
          isValid: true,
          message: 'Users unlimited',
          current: current_users,
          max: 'unlimited',
          type: 'success'
        };
      }

      if (current_users >= max_users) {
        return {
          isValid: false,
          message: `Anda telah mencapai batas maksimal ${max_users} user. Upgrade paket untuk menambah user.`,
          current: current_users,
          max: max_users,
          type: 'error'
        };
      }

      // Warning jika mendekati limit (80% threshold)
      const percentage = (current_users / max_users) * 100;
      if (percentage >= 80) {
        return {
          isValid: true,
          message: `Anda dapat membuat user baru (${current_users}/${max_users}) - Mendekati batas maksimal`,
          current: current_users,
          max: max_users,
          type: 'warning'
        };
      }

      return {
        isValid: true,
        message: `Anda dapat membuat user baru (${current_users}/${max_users})`,
        current: current_users,
        max: max_users,
        type: 'success'
      };
    } catch (error) {
      console.error('❌ SubscriptionValidationService.validateUserCreation error:', error);
      return {
        isValid: false,
        message: 'Terjadi kesalahan saat validasi subscription',
        current: 0,
        max: 0,
        type: 'error'
      };
    }
  }

  /**
   * Validasi apakah user bisa membuat branch baru
   * @param {number} tenantId - ID tenant
   * @param {Object} subscriptionData - Data subscription dari get-profile API
   * @returns {Object} - { isValid: boolean, message: string, current: number, max: number }
   */
  static async validateBranchCreation(tenantId, subscriptionData) {
    try {
      if (!subscriptionData || !subscriptionData.plan) {
        return {
          isValid: false,
          message: 'Data subscription tidak ditemukan',
          current: 0,
          max: 0,
          type: 'error'
        };
      }

      const { max_branches, current_branches } = subscriptionData.plan;
      
      // Jika max_branches null atau undefined, berarti unlimited
      if (max_branches === null || max_branches === undefined) {
        return {
          isValid: true,
          message: 'Branches unlimited',
          current: current_branches,
          max: 'unlimited',
          type: 'success'
        };
      }

      if (current_branches >= max_branches) {
        return {
          isValid: false,
          message: `Anda telah mencapai batas maksimal ${max_branches} outlet. Upgrade paket untuk menambah outlet.`,
          current: current_branches,
          max: max_branches,
          type: 'error'
        };
      }

      // Warning jika mendekati limit (80% threshold)
      const percentage = (current_branches / max_branches) * 100;
      if (percentage >= 80) {
        return {
          isValid: true,
          message: `Anda dapat membuat outlet baru (${current_branches}/${max_branches}) - Mendekati batas maksimal`,
          current: current_branches,
          max: max_branches,
          type: 'warning'
        };
      }

      return {
        isValid: true,
        message: `Anda dapat membuat outlet baru (${current_branches}/${max_branches})`,
        current: current_branches,
        max: max_branches,
        type: 'success'
      };
    } catch (error) {
      console.error('❌ SubscriptionValidationService.validateBranchCreation error:', error);
      return {
        isValid: false,
        message: 'Terjadi kesalahan saat validasi subscription',
        current: 0,
        max: 0,
        type: 'error'
      };
    }
  }
}

module.exports = SubscriptionValidationService;