const cron = require('node-cron');
const axios = require('axios');

// Cron job untuk update last order date setiap hari jam 12 malam
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('🔄 Starting last order date update...');
        
        const response = await axios.post('http://127.0.0.1:3002/cron/update-last-order-date', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            console.log(`✅ Last order date updated: ${response.data.data.updated} customers updated`);
        } else {
            console.log('❌ Failed to update last order date');
        }
        
    } catch (error) {
        console.log('❌ Error updating last order date:', error.message);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

console.log('📅 Last order date update cron job scheduled (daily at 12:00 AM)');
