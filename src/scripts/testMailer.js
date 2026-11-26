const { transferQrisToBca } = require('../services/financeTransactionService.js');
const { sendDailyReport, sendWeeklyReport } = require('../services/mailerServices.js');
// const { sendDailyReport } = require('../services/mailerServices.js');


(async () => {
  console.log('⏳ Sending report...');
  await transferQrisToBca();
  // await sendDailyReport();/
  // await sendWeeklyReport();
  console.log('✅ Done');
})();