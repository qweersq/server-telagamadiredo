const { TenantPayment, Tenant, Subscription, SubscriptionPlan } = require('../models');
const { Op } = require('sequelize');

class BillingReminderService {
  /**
   * Check and send H-3 reminders (3 days before due date)
   */
  static async sendH3Reminders() {
    try {
      console.log('🔍 BillingReminderService.sendH3Reminders - Starting');

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      twoDaysFromNow.setHours(23, 59, 59, 999);

      const billings = await TenantPayment.findAll({
        where: {
          status: 'unpaid',
          reminder_h3_sent: false,
          due_date: {
            [Op.between]: [twoDaysFromNow, threeDaysFromNow]
          }
        },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            required: true
          },
          {
            model: Subscription,
            as: 'subscription',
            where: { status: 'active' }, // ✅ Only ACTIVE subscriptions
            required: true
          },
          {
            model: SubscriptionPlan,
            as: 'subscription_plan'
          }
        ]
      });

      console.log(`📊 Found ${billings.length} billings for H-3 reminder`);

      const EmailNotificationService = require('./email/emailNotificationService');
      let sentCount = 0;

      for (const billing of billings) {
        try {
          await EmailNotificationService.sendBillingReminderH3({
            tenant_email: billing.tenant.email,
            tenant_name: billing.tenant.business_name || billing.tenant.name,
            amount: billing.amount,
            due_date: billing.due_date,
            invoice_number: billing.invoice_number,
            plan_name: billing.subscription_plan?.name || 'Premium Plan'
          });

          await billing.update({ reminder_h3_sent: true });
          sentCount++;
          console.log(`✅ H-3 reminder sent for billing ${billing.id}`);
        } catch (error) {
          console.error(`❌ Failed to send H-3 reminder for billing ${billing.id}:`, error);
        }
      }

      console.log(`✅ BillingReminderService.sendH3Reminders - Sent ${sentCount} reminders`);
      return { success: true, count: sentCount };
    } catch (error) {
      console.error('❌ BillingReminderService.sendH3Reminders - Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and send H-1 reminders (1 day before due date)
   */
  static async sendH1Reminders() {
    try {
      console.log('🔍 BillingReminderService.sendH1Reminders - Starting');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const billings = await TenantPayment.findAll({
        where: {
          status: 'unpaid',
          reminder_h1_sent: false,
          due_date: {
            [Op.between]: [today, tomorrow]
          }
        },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            required: true
          },
          {
            model: Subscription,
            as: 'subscription',
            where: { status: 'active' }, // ✅ Only ACTIVE subscriptions
            required: true
          },
          {
            model: SubscriptionPlan,
            as: 'subscription_plan'
          }
        ]
      });

      console.log(`📊 Found ${billings.length} billings for H-1 reminder`);

      const EmailNotificationService = require('./email/emailNotificationService');
      let sentCount = 0;

      for (const billing of billings) {
        try {
          await EmailNotificationService.sendBillingReminderH1({
            tenant_email: billing.tenant.email,
            tenant_name: billing.tenant.business_name || billing.tenant.name,
            amount: billing.amount,
            due_date: billing.due_date,
            invoice_number: billing.invoice_number,
            plan_name: billing.subscription_plan?.name || 'Premium Plan'
          });

          await billing.update({ reminder_h1_sent: true });
          sentCount++;
          console.log(`✅ H-1 reminder sent for billing ${billing.id}`);
        } catch (error) {
          console.error(`❌ Failed to send H-1 reminder for billing ${billing.id}:`, error);
        }
      }

      console.log(`✅ BillingReminderService.sendH1Reminders - Sent ${sentCount} reminders`);
      return { success: true, count: sentCount };
    } catch (error) {
      console.error('❌ BillingReminderService.sendH1Reminders - Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and send H-0 reminders (due date today)
   */
  static async sendH0Reminders() {
    try {
      console.log('🔍 BillingReminderService.sendH0Reminders - Starting');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const billings = await TenantPayment.findAll({
        where: {
          status: 'unpaid',
          reminder_h0_sent: false,
          due_date: {
            [Op.between]: [today, endOfToday]
          }
        },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            required: true
          },
          {
            model: Subscription,
            as: 'subscription',
            where: { status: 'active' }, // ✅ Only send H-0 for active subscriptions
            required: true
          },
          {
            model: SubscriptionPlan,
            as: 'subscription_plan'
          }
        ]
      });

      console.log(`📊 Found ${billings.length} billings for H-0 reminder`);

      const EmailNotificationService = require('./email/emailNotificationService');
      let sentCount = 0;

      for (const billing of billings) {
        try {
          await EmailNotificationService.sendBillingReminderH0({
            tenant_email: billing.tenant.email,
            tenant_name: billing.tenant.business_name || billing.tenant.name,
            amount: billing.amount,
            due_date: billing.due_date,
            invoice_number: billing.invoice_number,
            plan_name: billing.subscription_plan?.name || 'Premium Plan'
          });

          await billing.update({ reminder_h0_sent: true });
          sentCount++;
          console.log(`✅ H-0 reminder sent for billing ${billing.id}`);
        } catch (error) {
          console.error(`❌ Failed to send H-0 reminder for billing ${billing.id}:`, error);
        }
      }

      console.log(`✅ BillingReminderService.sendH0Reminders - Sent ${sentCount} reminders`);
      return { success: true, count: sentCount };
    } catch (error) {
      console.error('❌ BillingReminderService.sendH0Reminders - Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send all daily reminders (H-3, H-1, H-0)
   */
  static async sendAllReminders() {
    try {
      console.log('🔔 BillingReminderService.sendAllReminders - Starting daily reminders');

      const results = await Promise.all([
        this.sendH3Reminders(),
        this.sendH1Reminders(),
        this.sendH0Reminders()
      ]);

      const totalSent = results.reduce((sum, r) => sum + (r.count || 0), 0);
      console.log(`✅ BillingReminderService.sendAllReminders - Total ${totalSent} reminders sent`);

      return {
        success: true,
        h3: results[0],
        h1: results[1],
        h0: results[2],
        total: totalSent
      };
    } catch (error) {
      console.error('❌ BillingReminderService.sendAllReminders - Error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = BillingReminderService;

