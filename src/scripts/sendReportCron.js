const cron = require('node-cron');
const { sendWeeklyReport, sendDailyReport } = require('../services/mailerServices');
const { transferQrisToBca } = require('../services/financeTransactionService');
const whatsappAutomationService = require('../services/whatsappAutomationService');

// Cron: Setiap Minggu jam 07:00
cron.schedule('0 7 * * 0', async () => {
  console.log('🕒 Mengirim laporan mingguan...');
  await sendWeeklyReport();
});

// Cron: Setiap hari jam 06:00
cron.schedule('0 6 * * *', async () => {
  console.log('🌅 Mengirim laporan harian...');
  await sendDailyReport();
});

// Cron: Setiap hari jam 05:00
cron.schedule('0 5 * * *', async () => {
  console.log('🌅 Transfer otomatis QRIS to BCA...');
  await transferQrisToBca();
});

// Cron: WhatsApp Automation Daily Check - Setiap hari jam 08:00
cron.schedule('0 8 * * *', async () => {
  console.log('🤖 WhatsApp Automation Daily Check...');
  try {
    const result = await whatsappAutomationService.performDailyCheck();
    if (result) {
      console.log('✅ WhatsApp automation daily check completed successfully');
    } else {
      console.log('❌ WhatsApp automation daily check failed');
    }
  } catch (error) {
    console.error('❌ Error in WhatsApp automation daily check:', error.message);
  }
});

// Cron: WhatsApp Status Report - Setiap hari jam 18:00
cron.schedule('0 18 * * *', async () => {
  console.log('📊 WhatsApp Automation Status Report...');
  try {
    const result = await whatsappAutomationService.sendSystemStatusReport();
    if (result.success) {
      console.log('✅ WhatsApp automation status report sent successfully');
    } else {
      console.log('❌ WhatsApp automation status report failed');
    }
  } catch (error) {
    console.error('❌ Error in WhatsApp automation status report:', error.message);
  }
});

// Cron: WhatsApp Error Recovery Check - Setiap 6 jam (02:00, 08:00, 14:00, 20:00)
cron.schedule('0 */6 * * *', async () => {
  console.log('🔍 WhatsApp Automation Error Recovery Check...');
  try {
    const statusCheck = await whatsappAutomationService.checkStatus();
    
    if (!statusCheck.success) {
      console.log('❌ WhatsApp automation server is down, sending error notification');
      await whatsappAutomationService.sendErrorNotification('Server WhatsApp automation tidak merespons');
    } else if (!statusCheck.isReady) {
      console.log('⚠️ WhatsApp is not connected, sending reminder');
      await whatsappAutomationService.sendErrorNotification('WhatsApp tidak terhubung - QR code perlu di-scan ulang');
    } else {
      console.log('✅ WhatsApp automation is working properly');
    }
  } catch (error) {
    console.error('❌ Error in WhatsApp automation error recovery check:', error.message);
  }
});

console.log('🚀 Cron jobs initialized successfully');
console.log('📅 Scheduled jobs:');
console.log('  - Weekly Report: Every Sunday at 07:00');
console.log('  - Daily Report: Every day at 06:00');
console.log('  - QRIS Transfer: Every day at 05:00');
console.log('  - WhatsApp Daily Check: Every day at 08:00');
console.log('  - WhatsApp Status Report: Every day at 18:00');
console.log('  - WhatsApp Error Recovery: Every 6 hours');