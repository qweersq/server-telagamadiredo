const cron = require('node-cron');
const axios = require('axios');

// Cron job untuk expire poin yang sudah kadaluarsa setiap hari jam 1 pagi
cron.schedule('0 1 * * *', async () => {
    try {
        console.log('🔄 Starting point expiration process...');
        
        const response = await axios.post('http://127.0.0.1:3002/cron/expire-points', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            const data = response.data.data;
            console.log(`✅ Points expired: ${data.expired_count} transactions, ${data.total_points_expired} total points, ${data.customers_affected} customers affected`);
        } else {
            console.log('❌ Failed to expire points');
        }
        
    } catch (error) {
        console.log('❌ Error expiring points:', error.message);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

console.log('📅 Point expiration cron job scheduled (daily at 1:00 AM)');
