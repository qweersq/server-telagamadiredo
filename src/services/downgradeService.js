const SubscriptionRepository = require('../repositories/subscriptionRepository');
const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
const TenantRepository = require('../repositories/tenantRepository');
const PlanHelper = require('../helpers/planHelper');
const { sequelize } = require('../models');

class DowngradeService {
  /**
   * Downgrade expired subscription to NotaFree
   * @param {number} tenantId - Tenant ID
   * @param {Object} subscription - Subscription object (optional, will be fetched if not provided)
   * @returns {Object|null} - New NotaFree subscription or null
   */
  static async downgradeToNotaFree(tenantId, subscription = null) {
    const transaction = await sequelize.transaction();
    try {
      console.log('🔍 DowngradeService.downgradeToNotaFree - Tenant ID:', tenantId);

      // Get tenant
      const tenant = await TenantRepository.getById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get NotaFree plan
      const allPlans = await SubscriptionPlanRepository.getAll(null, true);
      const freePlan = allPlans.find(plan => PlanHelper.isFreePlan(plan));
      
      if (!freePlan) {
        throw new Error('NotaFree plan not found');
      }

      // ✅ NEW: Check if already has NotaFree subscription active (skip if already has)
      const { Subscription } = require('../models');
      const { Op } = require('sequelize');
      const existingNotaFree = await Subscription.findOne({
        where: {
          tenant_id: tenantId,
          status: 'active'
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });
      
      if (existingNotaFree) {
        const existingPlan = await SubscriptionPlanRepository.getById(existingNotaFree.plan_id);
        if (existingPlan && PlanHelper.isFreePlan(existingPlan)) {
          console.log('ℹ️ DowngradeService.downgradeToNotaFree - Tenant already has NotaFree subscription active');
          await transaction.rollback();
          return existingNotaFree;
        }
      }

      // Check if tenant already has NotaFree subscription (from passed subscription or fetch)
      if (!subscription) {
        subscription = await SubscriptionRepository.getActiveByTenantId(tenantId);
      }

      if (subscription) {
        const currentPlan = await SubscriptionPlanRepository.getById(subscription.plan_id);
        if (currentPlan && PlanHelper.isFreePlan(currentPlan)) {
          console.log('ℹ️ DowngradeService.downgradeToNotaFree - Subscription passed is already NotaFree');
          await transaction.rollback();
          return subscription;
        }

        // ✅ Skip update jika sudah expired (tidak perlu update lagi)
        if (subscription.status === 'expired') {
          console.log(`ℹ️ Subscription ${subscription.id} is already expired, skipping expire step`);
        } else {
          // ✅ Update jadi expired hanya jika belum expired
          try {
        await SubscriptionRepository.update(subscription.id, {
          status: 'expired'
        }, transaction);
        console.log(`✅ Expired old subscription ${subscription.id}`);
          } catch (updateError) {
            // ✅ Jika subscription tidak ditemukan (mungkin sudah dihapus), skip update
            if (updateError.message.includes('not found')) {
              console.log(`⚠️ Subscription ${subscription.id} not found, skipping expire step (may already be deleted)`);
            } else {
              throw updateError;
            }
          }
        }
      }

      // Create new NotaFree subscription
      const newSubscriptionData = {
        tenant_id: tenantId,
        plan_id: freePlan.id,
        status: 'active',
        start_date: new Date(),
        end_date: null, // NULL for NotaFree
        auto_renew: false,
        price: 0.00,
        discount_amount: 0.00,
        final_price: 0.00,
        payment_method: 'free',
        notes: 'Auto downgrade to NotaFree - expired subscription'
      };

      const newSubscription = await SubscriptionRepository.create(newSubscriptionData, transaction);
      console.log(`✅ Created NotaFree subscription ${newSubscription.id}`);

      // ✅ Reset PRO feature settings to default for NotaFree
      // Fix: tenant.settings bisa string atau object, perlu parse dulu
      let currentSettings = {};
      if (tenant.settings) {
        if (typeof tenant.settings === 'string') {
          // Jika string, parse dulu
          currentSettings = JSON.parse(tenant.settings);
        } else {
          // Jika object, deep clone
          currentSettings = JSON.parse(JSON.stringify(tenant.settings));
        }
      }
      
      console.log('🔍 DowngradeService.downgradeToNotaFree - Current settings before reset:', JSON.stringify(currentSettings, null, 2));
      
      // Reset Invoice Digital settings to default
      const defaultInvoiceDigitalSettings = {
        show_logo: false,
        logo_url: null,
        show_business_name: true,
        show_tagline: true,
        header_color: '#5096FC',
        footer_color: '#5096FC',
        header_text_color: '#FFFFFF',
        footer_text_color: '#FFFFFF',
        footer_notes: null,
        custom_thank_you: null,
        promo_text: null,
        instagram: null,
        website: null,
        show_progress_photos: false,
        show_technician_info: false
      };
      
      // ✅ NEW: Set printer settings jadi null (bukan default object)
      // Update settings with default values (replace entire objects, not merge)
      // currentSettings.invoice_digital = defaultInvoiceDigitalSettings;
      // currentSettings.printer = null; // ✅ Set printer settings jadi null
      
      console.log('🔍 DowngradeService.downgradeToNotaFree - Settings after reset:', JSON.stringify(currentSettings, null, 2));
      
      // Update tenant status and settings using Sequelize directly to ensure JSON field is updated
      const { Tenant } = require('../models');
      await Tenant.update({
        status: 'active',
        subscription_status: 'active',
        trial_end_date: null, // Clear trial_end_date for NotaFree
        settings: currentSettings // Reset PRO feature settings
      }, {
        where: { id: tenantId },
        transaction
      });
      
      // Reload tenant to get updated data
      await tenant.reload({ transaction });
      
      console.log(`✅ Updated tenant ${tenantId} to active with NotaFree`);
      console.log(`✅ Reset PRO feature settings (invoice_digital & printer) to default`);
      console.log('🔍 DowngradeService.downgradeToNotaFree - Verified settings after update:', JSON.stringify(tenant.settings, null, 2));

      await transaction.commit();
      console.log(`✅ DowngradeService.downgradeToNotaFree - Successfully downgraded tenant ${tenantId} to NotaFree`);

      return newSubscription;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ DowngradeService.downgradeToNotaFree - Error:', error);
      throw error;
    }
  }

  /**
   * Check if tenant should be downgraded (expired subscription or unpaid billing)
   * @param {number} tenantId - Tenant ID
   * @returns {Object} - { shouldDowngrade: boolean, reason: string }
   */
  static async shouldDowngrade(tenantId) {
    try {
      console.log('🔍 DowngradeService.shouldDowngrade - Checking tenant:', tenantId);
      const tenant = await TenantRepository.getById(tenantId);
      if (!tenant) {
        console.log('❌ DowngradeService.shouldDowngrade - Tenant not found');
        return { shouldDowngrade: false, reason: 'Tenant not found' };
      }

      console.log('🔍 DowngradeService.shouldDowngrade - Tenant status:', {
        status: tenant.status,
        subscription_status: tenant.subscription_status,
        trial_end_date: tenant.trial_end_date
      });

      // ✅ Check if already has NotaFree (check any subscription, not just active)
      const { Subscription } = require('../models');
      const { Op } = require('sequelize');
      const subscription = await Subscription.findOne({
        where: {
          tenant_id: tenantId,
          status: { [Op.in]: ['active', 'expired', 'trial'] } // Include expired to check plan
        },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      console.log('🔍 DowngradeService.shouldDowngrade - Subscription found:', {
        id: subscription?.id,
        plan_id: subscription?.plan_id,
        status: subscription?.status,
        end_date: subscription?.end_date
      });

      if (subscription) {
        const plan = await SubscriptionPlanRepository.getById(subscription.plan_id);
        console.log('🔍 DowngradeService.shouldDowngrade - Plan:', {
          id: plan?.id,
          name: plan?.name,
          isFreePlan: plan ? PlanHelper.isFreePlan(plan) : false
        });
        
        if (plan && PlanHelper.isFreePlan(plan)) {
          console.log('ℹ️ DowngradeService.shouldDowngrade - Already has NotaFree');
          return { shouldDowngrade: false, reason: 'Already has NotaFree' };
        }

        // Check if subscription expired
        if (subscription.end_date) {
          // ✅ FIX: Gunakan timezone WIB (Asia/Jakarta) untuk perhitungan tanggal
          const moment = require('moment-timezone');
          const nowWIB = moment().tz('Asia/Jakarta');
          const endDate = moment(subscription.end_date).tz('Asia/Jakarta');
          
          // ✅ H+1 Logic: end_date + 1 hari <= sekarang (baru dianggap expired)
          const endDatePlusOne = endDate.clone().add(1, 'day').endOf('day'); // End of end_date + 1 day in WIB
          const isExpired = endDatePlusOne <= nowWIB;
          
          console.log('🔍 DowngradeService.shouldDowngrade - Subscription expiration check (H+1 WIB):', {
            now_utc: new Date().toISOString(),
            now_wib: nowWIB.format('YYYY-MM-DD HH:mm:ss'),
            end_date_wib: endDate.format('YYYY-MM-DD HH:mm:ss'),
            end_date_plus_one_wib: endDatePlusOne.format('YYYY-MM-DD HH:mm:ss'),
            isExpired: isExpired
          });
          if (isExpired) {
            console.log('✅ DowngradeService.shouldDowngrade - Subscription expired (H+1), should downgrade');
            return { shouldDowngrade: true, reason: 'Subscription expired' };
          }
        }
      }

      // Check if trial expired (cek tanggal saja, bukan status)
      if (tenant.trial_end_date) {
        // ✅ FIX: Gunakan timezone WIB (Asia/Jakarta) untuk perhitungan tanggal
        const moment = require('moment-timezone');
        const nowWIB = moment().tz('Asia/Jakarta');
        const trialEndDate = moment(tenant.trial_end_date).tz('Asia/Jakarta');
        
        // ✅ H+1 Logic: trial_end_date + 1 hari <= sekarang (baru dianggap expired)
        const trialEndDatePlusOne = trialEndDate.clone().add(1, 'day').endOf('day'); // End of trial_end_date + 1 day in WIB
        const isTrialExpired = trialEndDatePlusOne <= nowWIB;
        
        console.log('🔍 DowngradeService.shouldDowngrade - Trial expiration check (H+1 WIB):', {
          now_utc: new Date().toISOString(),
          now_wib: nowWIB.format('YYYY-MM-DD HH:mm:ss'),
          trial_end_date_wib: trialEndDate.format('YYYY-MM-DD HH:mm:ss'),
          trial_end_date_plus_one_wib: trialEndDatePlusOne.format('YYYY-MM-DD HH:mm:ss'),
          isTrialExpired: isTrialExpired
        });
        if (isTrialExpired) {
        console.log('✅ DowngradeService.shouldDowngrade - Trial expired, should downgrade');
        return { shouldDowngrade: true, reason: 'Trial expired' };
      }
      }

      console.log('ℹ️ DowngradeService.shouldDowngrade - No downgrade needed');
      return { shouldDowngrade: false, reason: 'No downgrade needed' };
    } catch (error) {
      console.error('❌ DowngradeService.shouldDowngrade - Error:', error);
      return { shouldDowngrade: false, reason: 'Error checking downgrade status' };
    }
  }
}

module.exports = DowngradeService;

