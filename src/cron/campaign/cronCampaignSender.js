const cron = require('node-cron');
const axios = require('axios');

/**
 * Cron job untuk mengirim campaign messages
 * Setiap 10 detik dari jam 7 AM sampai 7 PM
 */
cron.schedule('*/10 * 7-19 * * *', async () => {
    try {
        console.log('🔄 Starting campaign batch processing...');
        
        const response = await axios.post('http://127.0.0.1:3002/campaigns/cron/process-batch', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            console.log(`✅ Campaign batch processed: ${response.data.data.processed} campaigns, ${response.data.data.errors} errors`);
        } else {
            console.log('❌ Failed to process campaign batch');
        }
    } catch (error) {
        console.log('❌ Error processing campaign batch:', error.message);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

console.log('📅 Campaign sender cron job scheduled (every 10 seconds, 7 AM - 7 PM)');
