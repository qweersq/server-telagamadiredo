const axios = require('axios');

// Test manual untuk update last order date
async function testLastOrderUpdate() {
    try {
        console.log('🔄 Testing last order date update...');
        
        const response = await axios.post('http://127.0.0.1:3002/cron/update-last-order-date', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            console.log(`✅ Success: ${response.data.data.updated} updated, ${response.data.data.unchanged} unchanged, ${response.data.data.errors} errors`);
            console.log(`📊 Total customers: ${response.data.data.total_customers}`);
        } else {
            console.log('❌ Failed to update last order date');
        }
        
    } catch (error) {
        console.log('❌ Error updating last order date:', error.message);
    }
}

// Jalankan test
testLastOrderUpdate();
