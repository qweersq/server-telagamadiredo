const { TenantPayment } = require('../models');
const PlanHelper = require('../helpers/planHelper');

class BillingExpirationService {
  /**
 * Check and update expired transactions for multiple billings
 * @param {Array} billings - Array of billing objects
 * @returns {Array} - Updated billings array
 */
  static async checkAndUpdateExpiredBillings(billings) {
    console.log('🔍 BillingExpirationService.checkAndUpdateExpiredBillings - Starting:', {
      billings_count: billings?.length || 0,
      billings: billings?.map(b => ({
        id: b.id,
        status: b.status,
        expired_at: b.expired_at,
        payment_reference: b.payment_reference
      }))
    });

    if (!billings || !Array.isArray(billings)) {
      console.log('⚠️ BillingExpirationService.checkAndUpdateExpiredBillings - Invalid billings data');
      return billings;
    }

    const now = new Date();
    const updatedBillings = [];

    console.log('🕐 BillingExpirationService.checkAndUpdateExpiredBillings - Current time:', now.toISOString());

    for (const billing of billings) {
      try {
        console.log(`🔍 BillingExpirationService.checkAndUpdateExpiredBillings - Checking billing ${billing.id}:`, {
          status: billing.status,
          expired_at: billing.expired_at,
          payment_reference: billing.payment_reference,
          isExpired: this.isExpired(billing)
        });

        // Check if billing is expired
        if (this.isExpired(billing)) {
          console.log(`🕐 Billing ${billing.id} is expired, updating status to cancelled`);

          // Update status to cancelled in database
          const updateResult = await TenantPayment.update(
            {
              status: 'cancelled',
              notes: billing.notes ?
                `${billing.notes} | Auto-cancelled due to expiration` :
                'Auto-cancelled due to expiration'
            },
            { where: { id: billing.id } }
          );

          console.log(`✅ BillingExpirationService.checkAndUpdateExpiredBillings - Database update result for billing ${billing.id}:`, updateResult);

          // Update local billing object
          const updatedBilling = {
            ...billing,
            status: 'cancelled',
            notes: billing.notes ?
              `${billing.notes} | Auto-cancelled due to expiration` :
              'Auto-cancelled due to expiration'
          };

          updatedBillings.push(updatedBilling);
          console.log(`✅ BillingExpirationService.checkAndUpdateExpiredBillings - Updated billing ${billing.id} to cancelled`);
        } else {
          // Keep billing as is if not expired
          updatedBillings.push(billing);
          console.log(`ℹ️ BillingExpirationService.checkAndUpdateExpiredBillings - Billing ${billing.id} not expired, keeping as is`);
        }
      } catch (error) {
        console.error(`❌ Error updating expired billing ${billing.id}:`, error);
        // If error occurs, keep original billing
        updatedBillings.push(billing);
      }
    }

    console.log('✅ BillingExpirationService.checkAndUpdateExpiredBillings - Completed:', {
      original_count: billings.length,
      updated_count: updatedBillings.length,
      updated_billings: updatedBillings.map(b => ({
        id: b.id,
        status: b.status,
        expired_at: b.expired_at,
        payment_reference: b.payment_reference
      }))
    });

    return updatedBillings;
  }

  /**
   * Check if a single billing is expired
   * @param {Object} billing - Billing object
   * @returns {Boolean} - True if expired, false otherwise
   */
  static isExpired(billing) {
    console.log(`🔍 BillingExpirationService.isExpired - Checking billing ${billing?.id}:`, {
      billing_exists: !!billing,
      expired_at: billing?.expired_at,
      status: billing?.status,
      status_is_pending: billing?.status === 'pending',
      status_is_unpaid: billing?.status === 'unpaid'
    });

    // Check if billing exists and has expired_at
    if (!billing || !billing.expired_at) {
      console.log(`ℹ️ BillingExpirationService.isExpired - Billing ${billing?.id} not eligible for expiration check (no expired_at)`);
      return false;
    }

    // Check if billing status allows expiration check
    // Both 'unpaid' and 'pending' can be expired
    if (billing.status !== 'pending' && billing.status !== 'unpaid') {
      console.log(`ℹ️ BillingExpirationService.isExpired - Billing ${billing?.id} not eligible for expiration check (status: ${billing.status})`);
      return false;
    }

    const now = new Date();
    const expiredAt = new Date(billing.expired_at);
    const isExpired = expiredAt < now;

    console.log(`🔍 BillingExpirationService.isExpired - Date comparison for billing ${billing.id}:`, {
      now: now.toISOString(),
      expired_at: expiredAt.toISOString(),
      isExpired: isExpired
    });

    return isExpired;
  }

  /**
   * Get expired billings count for a tenant
   * @param {Number} tenantId - Tenant ID
   * @returns {Number} - Count of expired billings
   */
  static async getExpiredBillingsCount(tenantId) {
    try {
      const now = new Date();

      const count = await TenantPayment.count({
        where: {
          tenant_id: tenantId,
          status: 'pending',
          expired_at: {
            [require('sequelize').Op.lt]: now
          }
        }
      });

      return count;
    } catch (error) {
      console.error('❌ Error getting expired billings count:', error);
      return 0;
    }
  }

  /**
 * Clean up expired transactions (for cron job)
 * @param {Number} tenantId - Optional tenant ID, if not provided clean all
 * @returns {Object} - Cleanup result
 */
  static async cleanupExpiredTransactions(tenantId = null) {
    try {
      const now = new Date();
      const whereClause = {
        status: 'pending',
        expired_at: {
          [require('sequelize').Op.lt]: now
        }
      };

      if (tenantId) {
        whereClause.tenant_id = tenantId;
      }

      const result = await TenantPayment.update(
        {
          status: 'cancelled',
          notes: require('sequelize').literal(`CONCAT(COALESCE(notes, ''), ' | Auto-cancelled due to expiration at ${now.toISOString()}')`)
        },
        {
          where: whereClause,
          returning: true
        }
      );

      console.log(`🧹 Cleaned up ${result[1]?.length || 0} expired transactions`);

      return {
        success: true,
        updatedCount: result[1]?.length || 0,
        message: `Cleaned up ${result[1]?.length || 0} expired transactions`
      };
    } catch (error) {
      console.error('❌ Error cleaning up expired transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
 * Check if billing can create new transaction
 * @param {Object} billing - Billing object
 * @returns {Object} - Result with canCreate and reason
 */
  static canCreateNewTransaction(billing) {
    if (!billing) {
      return {
        canCreate: false,
        reason: 'Billing not found'
      };
    }

    if (billing.status === 'paid') {
      return {
        canCreate: false,
        reason: 'Billing already paid'
      };
    }

    if (billing.status === 'cancelled') {
      return {
        canCreate: false,
        reason: 'Billing is cancelled'
      };
    }

    // Check if has active (non-expired) transaction
    if (billing.payment_reference && billing.expired_at) {
      if (!this.isExpired(billing)) {
        return {
          canCreate: false,
          reason: 'Billing already has active transaction'
        };
      }
    }

    return {
      canCreate: true,
      reason: 'Can create new transaction'
    };
  }

  /**
   * Generate billing for trial tenant H-1 (expiring tomorrow or already expired)
   * @returns {Object} - Generated billing result
     */
  static async generateBillingForTrialH1() {
    try {
      console.log('🔍 BillingExpirationService.generateBillingForTrialH1 - Starting H-1 trial billing generation');

      const { Tenant, Subscription } = require('../models');
      const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');

      // Find trial tenants that will expire tomorrow OR already expired
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const trialTenants = await Tenant.findAll({
        where: {
          status: 'trial',
          subscription_status: 'trial',
          trial_end_date: {
            [require('sequelize').Op.lt]: tomorrow // H-1 sampai kapanpun (sudah expired juga)
          }
        }
      });

      console.log(`🔍 BillingExpirationService.generateBillingForTrialH1 - Found ${trialTenants.length} trial tenants expiring tomorrow`);

      const results = [];
      for (const tenant of trialTenants) {
        try {
          // Check if already has unpaid billing
          const existingBilling = await TenantPaymentRepository.getUnpaidByTenantId(tenant.id);
          if (existingBilling) {
            console.log(`⏭️ BillingExpirationService.generateBillingForTrialH1 - Tenant ${tenant.id} already has unpaid billing, skipping`);
            continue;
          }

          // Get tenant's subscription (trial status for trial tenants) with plan
          const subscription = await Subscription.findOne({
            where: { tenant_id: tenant.id, status: 'trial' },
            include: [{
              model: require('../models').SubscriptionPlan,
              as: 'plan'
            }]
          });

          if (!subscription || !subscription.plan) {
            console.log(`⚠️ BillingExpirationService.generateBillingForTrialH1 - No subscription or plan found for tenant ${tenant.id}`);
            continue;
          }

          // ✅ NEW: Skip billing generation for NotaFree plan
          if (PlanHelper.shouldSkipBillingGeneration(subscription, subscription.plan)) {
            console.log(`⏭️ BillingExpirationService.generateBillingForTrialH1 - Tenant ${tenant.id} has NotaFree plan, skipping`);
            continue;
          }

          // Generate invoice number
          const invoiceNumber = `TRIAL-${tenant.id}-${Date.now()}`;

          // Create trial billing
          const billingData = {
            subscription_id: subscription.id,
            subscription_plan_id: subscription.plan_id,
            tenant_id: tenant.id,
            amount: subscription.final_price || subscription.price,
            status: 'unpaid',
            due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
            invoice_number: invoiceNumber,
            notes: `Trial billing - Upgrade to ${subscription.plan?.name || 'Premium Plan'}`
          };

          const billing = await TenantPaymentRepository.create(billingData);
          console.log(`✅ BillingExpirationService.generateBillingForTrialH1 - Created billing ${billing.id} for tenant ${tenant.id}`);

          // 📧 Send billing created email (non-blocking)
          const EmailNotificationService = require('./email/emailNotificationService');
          EmailNotificationService.sendBillingCreatedTrial({
            tenant_email: tenant.email,
            tenant_name: tenant.business_name || tenant.name,
            amount: billing.amount,
            due_date: billing.due_date,
            invoice_number: billing.invoice_number,
            plan_name: subscription.plan?.name || 'Premium Plan'
          }).catch(err => {
            console.error(`⚠️ Failed to send billing_created_trial email for tenant ${tenant.id}:`, err);
          });

          results.push({
            tenant_id: tenant.id,
            billing_id: billing.id,
            amount: billing.amount,
            due_date: billing.due_date
          });

        } catch (error) {
          console.error(`❌ BillingExpirationService.generateBillingForTrialH1 - Error for tenant ${tenant.id}:`, error.message);
        }
      }

      console.log(`✅ BillingExpirationService.generateBillingForTrialH1 - Generated ${results.length} trial billings`);
      return {
        success: true,
        count: results.length,
        results: results
      };

    } catch (error) {
      console.error('❌ BillingExpirationService.generateBillingForTrialH1 - Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check active subscription expiration and update status
   * @param {Number} tenantId - Tenant ID
   * @returns {Object} - Expiration check result
   */
  static async checkActiveSubscriptionExpiration(tenantId) {
    try {
      console.log('🔍 BillingExpirationService.checkActiveSubscriptionExpiration - Starting for tenant:', tenantId);

      const { Subscription, Tenant, SubscriptionPlan } = require('../models');
      const { Op } = require('sequelize');
      const PlanHelper = require('../helpers/planHelper');

      // ✅ NEW: Cek NotaFree dulu - kalau sudah ada, return early
      const existingNotaFree = await Subscription.findOne({
        where: {
          tenant_id: tenantId,
          status: 'active'
        },
        include: [{
          model: SubscriptionPlan,
          as: 'plan'
        }],
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      if (existingNotaFree && existingNotaFree.plan && PlanHelper.isFreePlan(existingNotaFree.plan)) {
        console.log('ℹ️ BillingExpirationService.checkActiveSubscriptionExpiration - Already has NotaFree subscription active');
        return {
          success: true,
          expired: false,
          message: 'Already has NotaFree subscription'
        };
      }

      // ✅ NEW: Ambil subscription terbaru (tidak peduli status) untuk cek end_date
      const subscription = await Subscription.findOne({
        where: {
          tenant_id: tenantId
        },
        include: [{
          model: Tenant,
          as: 'tenant'
        }, {
          model: SubscriptionPlan,
          as: 'plan'
        }],
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      if (!subscription) {
        console.log('ℹ️ BillingExpirationService.checkActiveSubscriptionExpiration - No subscription found');
        return {
          success: true,
          expired: false,
          message: 'No subscription found'
        };
      }

      // ✅ NEW: Skip expiration check for NotaFree plan (jika subscription yang ditemukan adalah NotaFree)
      if (subscription.plan && PlanHelper.isFreePlan(subscription.plan)) {
        console.log('✅ BillingExpirationService.checkActiveSubscriptionExpiration - Subscription is NotaFree, no expiration check needed');
        return {
          success: true,
          expired: false,
          message: 'NotaFree plan - no expiration'
        };
      }

      // ✅ NEW: Cek end_date - tidak peduli status, pokoknya end_date sudah lewat → buat NotaFree
      if (!subscription.end_date) {
        console.log('ℹ️ BillingExpirationService.checkActiveSubscriptionExpiration - Subscription has no end_date');
        return {
          success: true,
          expired: false,
          message: 'Subscription has no end_date'
        };
      }

      // ✅ FIX: Gunakan timezone WIB (Asia/Jakarta) untuk perhitungan tanggal
      const moment = require('moment-timezone');
      const nowWIB = moment().tz('Asia/Jakarta');
      const endDate = moment(subscription.end_date).tz('Asia/Jakarta');

      // ✅ H+1 Logic: end_date + 1 hari <= sekarang (baru dianggap expired)
      const endDatePlusOne = endDate.clone().add(1, 'day').endOf('day'); // End of end_date + 1 day in WIB
      const isExpired = endDatePlusOne <= nowWIB;

      console.log('🔍 BillingExpirationService.checkActiveSubscriptionExpiration - Date check (H+1 WIB):', {
        now_utc: new Date().toISOString(),
        now_wib: nowWIB.format('YYYY-MM-DD HH:mm:ss'),
        end_date_wib: endDate.format('YYYY-MM-DD HH:mm:ss'),
        end_date_plus_one_wib: endDatePlusOne.format('YYYY-MM-DD HH:mm:ss'),
        isExpired: isExpired
      });

      if (isExpired) {
        // ✅ NEW: Check for recent paid billing before downgrading
        // This prevents downgrade when payment was made but subscription not yet extended
        console.log('🔍 BillingExpirationService.checkActiveSubscriptionExpiration - Checking recent paid billing before downgrade...');

        const recentPaidBilling = await TenantPayment.findOne({
          where: {
            tenant_id: tenantId,
            status: 'paid',
            paid_at: {
              [Op.gte]: moment().subtract(7, 'days').toDate() // Paid in last 7 days
            }
          },
          order: [['paid_at', 'DESC']]
        });

        if (recentPaidBilling) {
          console.log('⏭️ BillingExpirationService.checkActiveSubscriptionExpiration - Recent payment found, skipping downgrade:', {
            billing_id: recentPaidBilling.id,
            paid_at: recentPaidBilling.paid_at,
            amount: recentPaidBilling.amount
          });

          return {
            success: true,
            expired: false,
            message: 'Recent payment found - skipping downgrade (subscription extension may be pending)'
          };
        }

        // Update subscription status to expired
        await Subscription.update(
          { status: 'expired' },
          { where: { id: subscription.id } }
        );

        // ✅ REMOVED: Tidak update tenant status jadi expired
        // ✅ NEW: Langsung buat NotaFree subscription (price 0) - tenant tetap active
        // Karena subscription sudah pasti expired (baru di-update), harus langsung buat NotaFree
        console.log('🔄 BillingExpirationService.checkActiveSubscriptionExpiration - Auto creating NotaFree subscription (price 0) for expired subscription...');
        console.log('🔍 BillingExpirationService.checkActiveSubscriptionExpiration - Subscription before downgrade:', {
          id: subscription.id,
          plan_id: subscription.plan_id,
          status: subscription.status,
          end_date: subscription.end_date
        });

        try {
          const DowngradeService = require('./downgradeService');
          const downgradeResult = await DowngradeService.downgradeToNotaFree(tenantId, subscription);

          console.log('✅ BillingExpirationService.checkActiveSubscriptionExpiration - Successfully created NotaFree subscription');
          console.log('✅ BillingExpirationService.checkActiveSubscriptionExpiration - New subscription:', {
            id: downgradeResult?.id,
            plan_id: downgradeResult?.plan_id,
            status: downgradeResult?.status,
            price: downgradeResult?.price
          });
        } catch (downgradeError) {
          console.error('❌ BillingExpirationService.checkActiveSubscriptionExpiration - Failed to create NotaFree:', downgradeError.message);
          console.error('❌ Downgrade error stack:', downgradeError.stack);
          // Continue even if downgrade fails
        }

        console.log('✅ BillingExpirationService.checkActiveSubscriptionExpiration - Subscription expired and updated');
        return {
          success: true,
          expired: true,
          message: 'Subscription expired and status updated'
        };
      }


      // Check trial expiration for active subscriptions
      if (subscription.tenant && subscription.tenant.trial_end_date) {
        // ✅ FIX: Gunakan timezone WIB (Asia/Jakarta) untuk perhitungan tanggal
        const moment = require('moment-timezone');
        const nowWIB = moment().tz('Asia/Jakarta');
        const trialEndDate = moment(subscription.tenant.trial_end_date).tz('Asia/Jakarta');

        // ✅ H+1 Logic: trial_end_date + 1 hari <= sekarang (baru dianggap expired)
        const trialEndDatePlusOne = trialEndDate.clone().add(1, 'day').endOf('day'); // End of trial_end_date + 1 day in WIB

        if (trialEndDatePlusOne <= nowWIB) {
          // ✅ REMOVED: Tidak update tenant status jadi expired
          // ✅ NEW: Langsung buat NotaFree subscription (price 0) - tenant tetap active
          console.log('🔄 BillingExpirationService.checkActiveSubscriptionExpiration - Trial expired, creating NotaFree subscription (price 0)...');
          try {
            const DowngradeService = require('./downgradeService');
            const downgradeResult = await DowngradeService.downgradeToNotaFree(tenantId, subscription);
            console.log('✅ BillingExpirationService.checkActiveSubscriptionExpiration - Successfully created NotaFree subscription for expired trial:', {
              id: downgradeResult?.id,
              plan_id: downgradeResult?.plan_id,
              status: downgradeResult?.status,
              price: downgradeResult?.price
            });
          } catch (downgradeError) {
            console.error('❌ BillingExpirationService.checkActiveSubscriptionExpiration - Failed to create NotaFree for expired trial:', downgradeError.message);
          }
        }
      }

      return {
        success: true,
        expired: false,
        message: 'Subscription is still active'
      };

    } catch (error) {
      console.error('❌ BillingExpirationService.checkActiveSubscriptionExpiration - Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate billing for active expired subscriptions
   * @param {Number} tenantId - Tenant ID
   * @returns {Object} - Generated billing result
   */
  static async generateBillingForActiveExpired(tenantId) {
    try {
      console.log('🔍 BillingExpirationService.generateBillingForActiveExpired - Starting for tenant:', tenantId);

      const { Subscription, Tenant } = require('../models');
      const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');

      // Get expired subscriptions (any status) - exclude NotaFree (end_date IS NULL)
      const now = new Date();
      const expiredSubscriptions = await Subscription.findAll({
        where: {
          end_date: {
            [require('sequelize').Op.lt]: now,
            [require('sequelize').Op.ne]: null // Exclude NULL (NotaFree)
          }
        },
        include: [{
          model: Tenant,
          as: 'tenant',
          where: {
            ...(tenantId ? { id: tenantId } : {})
          }
        }, {
          model: require('../models').SubscriptionPlan,
          as: 'plan'
        }]
      });

      console.log(`🔍 BillingExpirationService.generateBillingForActiveExpired - Found ${expiredSubscriptions.length} expired subscriptions`);

      const results = [];
      for (const subscription of expiredSubscriptions) {
        try {
          const tenant = subscription.tenant;

          // ✅ NEW: Skip billing generation for NotaFree plan
          if (PlanHelper.shouldSkipBillingGeneration(subscription, subscription.plan)) {
            console.log(`⏭️ BillingExpirationService.generateBillingForActiveExpired - Tenant ${tenant.id} has NotaFree plan, skipping`);
            continue;
          }

          // ✅ NEW: Check for recent paid billing (within 30 days) before generating EXPIRED billing
          // This prevents generation when payment was made but subscription not yet extended
          const recentPaidBilling = await TenantPayment.findOne({
            where: {
              tenant_id: tenant.id,
              status: 'paid',
              paid_at: {
                [Op.gte]: moment().subtract(30, 'days').toDate() // Paid in last 30 days
              }
            },
            order: [['paid_at', 'DESC']]
          });

          if (recentPaidBilling) {
            console.log(`⏭️ BillingExpirationService.generateBillingForActiveExpired - Tenant ${tenant.id} has recent paid billing, skipping:`, {
              billing_id: recentPaidBilling.id,
              paid_at: recentPaidBilling.paid_at,
              amount: recentPaidBilling.amount
            });
            continue;
          }

          // Check if already has unpaid billing
          const existingBilling = await TenantPaymentRepository.getUnpaidByTenantId(tenant.id);
          if (existingBilling) {
            console.log(`⏭️ BillingExpirationService.generateBillingForActiveExpired - Tenant ${tenant.id} already has unpaid billing, skipping`);
            continue;
          }

          // Generate invoice number
          const invoiceNumber = `EXPIRED-${tenant.id}-${Date.now()}`;

          // Create expired billing
          const billingData = {
            subscription_id: subscription.id,
            subscription_plan_id: subscription.plan_id, // ✅ Fixed: use plan_id instead of subscription_plan_id
            tenant_id: tenant.id,
            amount: subscription.final_price || subscription.price,
            status: 'unpaid',
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            invoice_number: invoiceNumber,
            notes: `Expired subscription billing - ${subscription.plan?.name || 'Premium Plan'}`
          };

          const billing = await TenantPaymentRepository.create(billingData);
          console.log(`✅ BillingExpirationService.generateBillingForActiveExpired - Created billing ${billing.id} for tenant ${tenant.id}`);

          results.push({
            tenant_id: tenant.id,
            billing_id: billing.id,
            amount: billing.amount,
            due_date: billing.due_date
          });

        } catch (error) {
          console.error(`❌ BillingExpirationService.generateBillingForActiveExpired - Error for subscription ${subscription.id}:`, error.message);
        }
      }

      console.log(`✅ BillingExpirationService.generateBillingForActiveExpired - Generated ${results.length} expired billings`);
      return {
        success: true,
        count: results.length,
        results: results
      };

    } catch (error) {
      console.error('❌ BillingExpirationService.generateBillingForActiveExpired - Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
 * Generate billing for active subscription H-7 (expiring in 7 days or already expired)
 * @returns {Object} - Generated billing result
   */
  static async generateBillingForActiveH7() {
    try {
      console.log('🔍 BillingExpirationService.generateBillingForActiveH7 - Starting H-7 active billing generation');

      const { Tenant, Subscription } = require('../models');
      const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');

      // Find active subscriptions that will expire in 7 days OR already expired
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999);

      const expiringSubscriptions = await Subscription.findAll({
        where: {
          status: 'active',
          end_date: {
            [require('sequelize').Op.lt]: sevenDaysFromNow, // H-7 sampai kapanpun (sudah expired juga)
            [require('sequelize').Op.ne]: null // Exclude NULL (NotaFree)
          }
        },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            where: { status: 'active' }
          },
          {
            model: require('../models').SubscriptionPlan,
            as: 'plan'
          }
        ]
      });

      console.log(`🔍 BillingExpirationService.generateBillingForActiveH7 - Found ${expiringSubscriptions.length} active subscriptions expiring in 7 days`);

      const results = [];
      for (const subscription of expiringSubscriptions) {
        try {
          const tenant = subscription.tenant;

          // ✅ NEW: Skip billing generation for NotaFree plan
          if (PlanHelper.shouldSkipBillingGeneration(subscription, subscription.plan)) {
            console.log(`⏭️ BillingExpirationService.generateBillingForActiveH7 - Tenant ${tenant.id} has NotaFree plan, skipping`);
            continue;
          }

          // Check if already has unpaid billing
          const existingBilling = await TenantPaymentRepository.getUnpaidByTenantId(tenant.id);
          if (existingBilling) {
            console.log(`⏭️ BillingExpirationService.generateBillingForActiveH7 - Tenant ${tenant.id} already has unpaid billing, skipping`);
            continue;
          }

          // Generate invoice number
          const invoiceNumber = `RENEWAL-${tenant.id}-${Date.now()}`;

          // Create renewal billing
          const billingData = {
            subscription_id: subscription.id,
            subscription_plan_id: subscription.plan_id, // ✅ Fixed: use plan_id instead of subscription_plan_id
            tenant_id: tenant.id,
            amount: subscription.final_price || subscription.price,
            status: 'unpaid',
            due_date: subscription.end_date, // ✅ Fixed: use subscription end_date instead of +7 days
            invoice_number: invoiceNumber,
            notes: `Renewal billing - ${subscription.plan?.name || 'Premium Plan'}`
          };

          const billing = await TenantPaymentRepository.create(billingData);
          console.log(`✅ BillingExpirationService.generateBillingForActiveH7 - Created billing ${billing.id} for tenant ${tenant.id}`);

          // 📧 Send renewal billing email (non-blocking)
          const EmailNotificationService = require('./email/emailNotificationService');
          EmailNotificationService.sendBillingCreatedRenewal({
            tenant_email: tenant.email,
            tenant_name: tenant.business_name || tenant.name,
            amount: billing.amount,
            due_date: billing.due_date,
            invoice_number: billing.invoice_number,
            plan_name: subscription.plan?.name || 'Premium Plan'
          }).catch(err => {
            console.error(`⚠️ Failed to send billing_created_renewal email for tenant ${tenant.id}:`, err);
          });

          results.push({
            tenant_id: tenant.id,
            billing_id: billing.id,
            amount: billing.amount,
            due_date: billing.due_date
          });

        } catch (error) {
          console.error(`❌ BillingExpirationService.generateBillingForActiveH7 - Error for subscription ${subscription.id}:`, error.message);
        }
      }

      console.log(`✅ BillingExpirationService.generateBillingForActiveH7 - Generated ${results.length} renewal billings`);
      return {
        success: true,
        count: results.length,
        results: results
      };

    } catch (error) {
      console.error('❌ BillingExpirationService.generateBillingForActiveH7 - Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = BillingExpirationService;