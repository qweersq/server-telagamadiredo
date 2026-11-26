const axios = require('axios');

/**
 * Test script untuk campaign batch processing
 */
async function testCampaignBatch() {
    try {
        console.log('🔄 Testing campaign batch processing...');
        
        const response = await axios.post('http://127.0.0.1:3002/campaigns/cron/process-batch', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            console.log(`✅ Success: ${response.data.data.processed} campaigns processed, ${response.data.data.errors} errors`);
            console.log(`📊 Message: ${response.data.data.message}`);
        } else {
            console.log('❌ Failed to process campaign batch');
            console.log('Error:', response.data.error);
        }
    } catch (error) {
        console.log('❌ Error testing campaign batch:', error.message);
    }
}

testCampaignBatch();
