const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { getReportData, getReportDailyData } = require('./reportService');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'notasepatu@gmail.com',
    pass: process.env.EMAIL_PASSWORD,
  },
});

const renderTemplate = (data) => {
  const templatePath = path.join(__dirname, '../templates/weeklyReport.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  for (const key in data) {
    const placeholder = `{{${key}}}`;
    template = template.replaceAll(placeholder, data[key]);
  }
  return template;
};
const renderTemplateDaily = (data) => {
  const templatePath = path.join(__dirname, '../templates/dailyReport.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  for (const key in data) {
    const placeholder = `{{${key}}}`;
    template = template.replaceAll(placeholder, data[key]);
  }
  return template;
};

const sendWeeklyReport = async () => {
  const data = await getReportData();
  const html = renderTemplate(data);

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'NotaSepatu'} - Weekly Report" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'notasepatu@gmail.com'}>`,
    to: ['akbarhadadal@gmail.com'],
    subject: 'Laporan Mingguan NotaSepatu',
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error };
  }
};
const sendDailyReport = async () => {
  const data = await getReportDailyData();
  const html = renderTemplateDaily(data);

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'NotaSepatu'} - Daily Report" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'notasepatu@gmail.com'}>`,
    to: ['akbarhadadal@gmail.com'],
    subject: 'Laporan Harian NotaSepatu',
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email Daily sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error };
  }
};

/**
 * Generate HTML template for new tenant registration email
 */
const generateTenantRegistrationEmail = (data) => {
  const { business_name, owner_name, email, whatsapp, selected_plan, city, tenant_id } = data;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p style="font-size: 16px; color: #374151;">
        <strong>${owner_name}</strong> mendaftar paket <strong>${selected_plan}</strong>
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Bisnis</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${business_name}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Owner</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${owner_name}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Email</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">WhatsApp</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${whatsapp}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Paket</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${selected_plan}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Kota</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${city}</td>
        </tr>
      </table>
      
      <p style="margin-top: 20px; padding: 12px; background-color: #dbeafe; border-left: 4px solid #2563eb; color: #1e40af;">
        <strong>Tenant ID:</strong> ${tenant_id}
      </p>
    </div>
  `;
};

/**
 * Send notification email (generic function)
 * Reusable untuk berbagai notification
 */
const sendNotificationEmail = async ({ to, subject, html, text = '' }) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'NotaSepatu'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'notasepatu@gmail.com'}>`,
    to: to,
    subject: subject,
    html: html,
    text: text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Notification email sent:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send new tenant registration notification to admin
 */
const sendTenantRegistrationNotification = async (tenantData) => {
  const html = generateTenantRegistrationEmail(tenantData);
  
  return await sendNotificationEmail({
    to: ['akbarhadadal@gmail.com', 'ellinafahraazzahri@gmail.com'],
    subject: `🎉 Registrasi Baru: ${tenantData.business_name} - ${tenantData.selected_plan}`,
    html: html
  });
};

/**
 * Send payment success notification to admin
 */
const sendPaymentNotificationToAdmin = async ({ tenant_name, owner_name, tenant_email, plan_name, amount, invoice_number, paid_date, subscription_status, end_date }) => {
  const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  const formattedDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(paid_date));
  const formattedEndDate = end_date ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date(end_date)) : '-';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">✅ Pembayaran Berhasil</h2>
      <p style="font-size: 16px; color: #374151;">
        Tenant <strong>${tenant_name}</strong> telah melakukan pembayaran.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb; width: 40%;">Bisnis</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${tenant_name}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Owner</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${owner_name}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Email Tenant</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${tenant_email}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Paket</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${plan_name}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Jumlah</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Invoice</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${invoice_number}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Dibayar</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Status Subscription</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${subscription_status}</strong></td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Due Date (Akhir)</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${formattedEndDate}</td>
        </tr>
      </table>

      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
        Email ini dikirim otomatis dari sistem NotaSepatu.
      </p>
    </div>
  `;

  return await sendNotificationEmail({
    to: ['akbarhadadal@gmail.com'],
    subject: `💰 Pembayaran: ${tenant_name} - ${plan_name} (${formattedAmount})`,
    html: html
  });
};

module.exports = {
  sendWeeklyReport,
  sendDailyReport,
  sendNotificationEmail,
  sendTenantRegistrationNotification,
  sendPaymentNotificationToAdmin
};
