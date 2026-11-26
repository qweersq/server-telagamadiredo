const EmailNotificationService = require('../services/email/emailNotificationService');

/**
 * Test controller untuk email notification
 */
class TestEmailController {
  /**
   * Test tenant account created email
   */
  async testTenantAccountCreated(req, res) {
    try {
      const result = await EmailNotificationService.sendTenantAccountCreated({
        tenant_email: 'akbarhadadal@gmail.com', // Test email
        tenant_name: 'Test Laundry',
        owner_name: 'Hadad Test',
        plan_name: 'NotaPro',
        trial_days: 3
      });

      return res.json({
        success: true,
        message: 'Test email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test billing created trial email
   */
  async testBillingCreatedTrial(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingCreatedTrial({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invoice_number: 'INV-TEST-001',
        plan_name: 'NotaPro'
      });

      return res.json({
        success: true,
        message: 'Test email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test billing created renewal email
   */
  async testBillingCreatedRenewal(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingCreatedRenewal({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invoice_number: 'RENEWAL-TEST-001',
        plan_name: 'NotaPro'
      });

      return res.json({
        success: true,
        message: 'Test email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test billing expired email
   */
  async testBillingExpired(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingExpired({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        invoice_number: 'INV-TEST-002',
        days_overdue: 5
      });

      return res.json({
        success: true,
        message: 'Test email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test billing paid email
   */
  async testBillingPaid(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingPaid({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        invoice_number: 'INV-TEST-003',
        paid_date: new Date(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      return res.json({
        success: true,
        message: 'Test email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test billing choose payment (Tripay) email
   */
  async testBillingChoosePayment(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingChoosePayment({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        payment_method: 'OVO',
        payment_url: 'https://tripay.co.id/checkout/T1234567890',
        invoice_number: 'INV-TEST-004',
        expired_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      return res.json({
        success: true,
        message: 'Test email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test H-3 reminder email
   */
  async testReminderH3(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingReminderH3({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        invoice_number: 'INV-REMINDER-H3',
        plan_name: 'NotaPro'
      });

      return res.json({
        success: true,
        message: 'Test H-3 reminder email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test H-1 reminder email
   */
  async testReminderH1(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingReminderH1({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        invoice_number: 'INV-REMINDER-H1',
        plan_name: 'NotaPro'
      });

      return res.json({
        success: true,
        message: 'Test H-1 reminder email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test H-0 reminder email
   */
  async testReminderH0(req, res) {
    try {
      const result = await EmailNotificationService.sendBillingReminderH0({
        tenant_email: 'akbarhadadal@gmail.com',
        tenant_name: 'Test Laundry',
        amount: 99000,
        due_date: new Date(), // Today
        invoice_number: 'INV-REMINDER-H0',
        plan_name: 'NotaPro'
      });

      return res.json({
        success: true,
        message: 'Test H-0 reminder email sent',
        result
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TestEmailController();

