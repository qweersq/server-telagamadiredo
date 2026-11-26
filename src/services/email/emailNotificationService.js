const nodemailer = require('nodemailer');
const EmailTemplateService = require('./emailTemplateService');

class EmailNotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Use 'service: gmail' for better reliability
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, html, text = '' }) {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'NotaSepatu'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send tenant account created email
   */
  async sendTenantAccountCreated({ tenant_email, tenant_name, owner_name, plan_name, trial_days }) {
    const html = EmailTemplateService.render('tenant/tenant_account_created', {
      tenant_name,
      owner_name,
      plan_name,
      trial_days,
      login_url: `${process.env.CLIENT_URL}/login` || 'https://notasepatu.id/login'
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `🎉 Selamat Datang di NotaSepatu, ${owner_name}!`,
      html
    });
  }

  /**
   * Send billing created for trial tenant
   */
  async sendBillingCreatedTrial({ tenant_email, tenant_name, amount, due_date, invoice_number, plan_name }) {
    const html = EmailTemplateService.render('billing/billing_created_trial', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      due_date: EmailTemplateService.formatDate(due_date),
      invoice_number,
      plan_name,
      payment_url: `${process.env.CLIENT_URL}/billing-active-tenant-payment`
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `🧾 Tagihan NotaSepatu - ${tenant_name}`,
      html
    });
  }

  /**
   * Send billing created for subscription renewal (H-7)
   */
  async sendBillingCreatedRenewal({ tenant_email, tenant_name, amount, due_date, invoice_number, plan_name }) {
    const html = EmailTemplateService.render('billing/billing_created_renewal', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      due_date: EmailTemplateService.formatDate(due_date),
      invoice_number,
      plan_name,
      payment_url: `${process.env.CLIENT_URL}/billing-active-tenant-payment`
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `🔄 Perpanjangan Langganan NotaSepatu - ${tenant_name}`,
      html
    });
  }

  /**
   * Send billing expired notification
   */
  async sendBillingExpired({ tenant_email, tenant_name, amount, invoice_number, days_overdue }) {
    const html = EmailTemplateService.render('billing/billing_expired', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      invoice_number,
      days_overdue,
      payment_url: `${process.env.FRONTEND_URL}/billing-payment`
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `⚠️ Tagihan Overdue - ${tenant_name}`,
      html
    });
  }

  /**
   * Send billing paid confirmation
   */
  async sendBillingPaid({ tenant_email, tenant_name, amount, invoice_number, paid_date, next_billing_date }) {
    const html = EmailTemplateService.render('billing/billing_paid', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      invoice_number,
      paid_date: EmailTemplateService.formatDate(paid_date),
      next_billing_date: EmailTemplateService.formatDate(next_billing_date)
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `✅ Pembayaran Berhasil - ${tenant_name}`,
      html
    });
  }

  /**
   * Send Tripay payment link notification
   */
  async sendBillingChoosePayment({ tenant_email, tenant_name, amount, payment_method, payment_url, invoice_number, expired_time }) {
    const html = EmailTemplateService.render('billing/billing_choose_payment', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      payment_method,
      payment_url,
      invoice_number,
      expired_time: EmailTemplateService.formatDate(expired_time)
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `💳 Link Pembayaran NotaSepatu - ${tenant_name}`,
      html
    });
  }

  /**
   * Send H-3 billing reminder
   */
  async sendBillingReminderH3({ tenant_email, tenant_name, amount, due_date, invoice_number, plan_name }) {
    const html = EmailTemplateService.render('billing/billing_reminder_h3', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      due_date: EmailTemplateService.formatDate(due_date),
      invoice_number,
      plan_name,
      payment_url: `${process.env.CLIENT_URL}/billing-active-tenant-payment`
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `⏰ Tagihan Jatuh Tempo 3 Hari Lagi`,
      html
    });
  }

  /**
   * Send H-1 billing reminder
   */
  async sendBillingReminderH1({ tenant_email, tenant_name, amount, due_date, invoice_number, plan_name }) {
    const html = EmailTemplateService.render('billing/billing_reminder_h1', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      due_date: EmailTemplateService.formatDate(due_date),
      invoice_number,
      plan_name,
      payment_url: `${process.env.CLIENT_URL}/billing-active-tenant-payment`
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `⚠️ Tagihan Jatuh Tempo Besok!`,
      html
    });
  }

  /**
   * Send H-0 billing reminder (due today)
   */
  async sendBillingReminderH0({ tenant_email, tenant_name, amount, due_date, invoice_number, plan_name }) {
    const html = EmailTemplateService.render('billing/billing_reminder_h0', {
      tenant_name,
      amount: EmailTemplateService.formatCurrency(amount),
      due_date: EmailTemplateService.formatDate(due_date),
      invoice_number,
      plan_name,
      payment_url: `${process.env.CLIENT_URL}/billing-active-tenant-payment`
    });

    return await this.sendEmail({
      to: tenant_email,
      subject: `🚨 Tagihan Jatuh Tempo Hari Ini!`,
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset({ user_email, user_name, reset_url }) {
    const html = EmailTemplateService.render('auth/password_reset', {
      user_name,
      reset_url,
      expires_in: '1 jam'
    });

    return await this.sendEmail({
      to: user_email,
      subject: '🔐 Reset Password NotaSepatu',
      html
    });
  }
}

module.exports = new EmailNotificationService();

