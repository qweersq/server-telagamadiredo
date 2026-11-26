const fetch = require('node-fetch');

// WhatsApp API Gateway URL
const WA_GATEWAY_URL = process.env.WA_GATEWAY_URL || 'http://localhost:4437/api';

/**
 * Send campaign message to single customer
 * @param {string} phone - Customer phone number
 * @param {string} message - Message content
 * @param {string} sessionId - WhatsApp session ID
 * @returns {Object} - Result object with success status
 */
exports.sendCampaignMessage = async (phone, message, sessionId) => {
    try {
        console.log(`📱 Sending campaign message to ${phone}`);
        
        const response = await fetch(`${WA_GATEWAY_URL}/send-message/${sessionId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                to: phone,
                text: message
            })
        });
        
        const data = await response.json();
        
        // API returns array of results
        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];
            if (result.success) {
                console.log(`✅ Campaign message sent to ${phone}`);
                return {
                    success: true,
                    message: 'Message sent successfully',
                    data: result
                };
            } else {
                console.error(`❌ Campaign message failed to ${phone}:`, result.message);
                return {
                    success: false,
                    message: result.message,
                    error: result.error
                };
            }
        } else if (data.success === false) {
            console.error(`❌ Campaign message failed to ${phone}:`, data.message);
            return {
                success: false,
                message: data.message,
                error: data.error
            };
        } else {
            console.error(`❌ Campaign message failed to ${phone}: Unknown response format`);
            return {
                success: false,
                message: 'Unknown response format',
                error: 'Invalid response from WA Gateway'
            };
        }
    } catch (error) {
        console.error(`❌ Error sending campaign message to ${phone}:`, error);
        return {
            success: false,
            message: 'Failed to send campaign message',
            error: error.message
        };
    }
};

/**
 * Send campaign message with file attachment
 * @param {string} phone - Customer phone number
 * @param {string} message - Message content
 * @param {string} filePath - Path to file
 * @param {string} sessionId - WhatsApp session ID
 * @returns {Object} - Result object with success status
 */
exports.sendCampaignMessageWithFile = async (phone, message, filePath, sessionId) => {
    try {
        console.log(`📱 Sending campaign message with file to ${phone}`);
        
        const response = await fetch(`${WA_GATEWAY_URL}/send-message-with-file/${sessionId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                to: phone,
                text: message,
                filePath: filePath
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Campaign message with file sent to ${phone}`);
            return {
                success: true,
                message: 'Message with file sent successfully',
                data: data.data
            };
        } else {
            console.error(`❌ Campaign message with file failed to ${phone}:`, data.message);
            return {
                success: false,
                message: data.message,
                error: data.error
            };
        }
    } catch (error) {
        console.error(`❌ Error sending campaign message with file to ${phone}:`, error);
        return {
            success: false,
            message: 'Failed to send campaign message with file',
            error: error.message
        };
    }
};

/**
 * Send batch campaign messages
 * @param {Array} recipients - Array of phone numbers
 * @param {string} message - Message content
 * @param {string} sessionId - WhatsApp session ID
 * @param {Object} options - Options for batch processing
 * @returns {Object} - Result object with batch results
 */
exports.sendBatchCampaignMessages = async (recipients, message, sessionId, options = {}) => {
    try {
        const {
            batchSize = 10,
            delayBetweenBatches = 2000,
            delayBetweenMessages = 100
        } = options;

        console.log(`📱 Sending batch campaign to ${recipients.length} recipients`);
        
        const results = [];
        const batches = [];
        
        // Split recipients into batches
        for (let i = 0; i < recipients.length; i += batchSize) {
            batches.push(recipients.slice(i, i + batchSize));
        }
        
        // Process each batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} recipients)`);
            
            // Send messages in parallel within batch
            const batchPromises = batch.map(async (phone, index) => {
                // Add delay between messages
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
                }
                
                const result = await this.sendCampaignMessage(phone, message, sessionId);
                return {
                    phone,
                    ...result
                };
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Add delay between batches (except for last batch)
            if (batchIndex < batches.length - 1) {
                console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        console.log(`📊 Batch campaign completed: ${successCount} success, ${failureCount} failed`);
        
        return {
            success: true,
            message: `Batch campaign completed: ${successCount} success, ${failureCount} failed`,
            data: {
                total: recipients.length,
                success: successCount,
                failed: failureCount,
                results: results
            }
        };
        
    } catch (error) {
        console.error('❌ Error in batch campaign:', error);
        return {
            success: false,
            message: 'Failed to send batch campaign',
            error: error.message
        };
    }
};

/**
 * Check WhatsApp session status
 * @param {string} sessionId - WhatsApp session ID
 * @returns {Object} - Session status
 */
exports.checkSessionStatus = async (sessionId) => {
    try {
        const response = await fetch(`${WA_GATEWAY_URL}/session/status?id=${sessionId}`);
        const data = await response.json();
        
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('❌ Error checking session status:', error);
        return {
            success: false,
            message: 'Failed to check session status',
            error: error.message
        };
    }
};

/**
 * Get available WhatsApp sessions
 * @returns {Object} - Available sessions
 */
exports.getAvailableSessions = async () => {
    try {
        const response = await fetch(`${WA_GATEWAY_URL}/session/list`);
        const data = await response.json();
        
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('❌ Error getting available sessions:', error);
        return {
            success: false,
            message: 'Failed to get available sessions',
            error: error.message
        };
    }
};

/**
 * Create new WhatsApp session for campaign
 * @param {string} sessionName - Name for the session
 * @returns {Object} - Session creation result
 */
exports.createSession = async (sessionName) => {
    try {
        const response = await fetch(`${WA_GATEWAY_URL}/session/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                sessionName: sessionName
            })
        });
        
        const data = await response.json();
        
        return {
            success: data.success,
            message: data.message,
            data: data.data || { id: data.id } // Handle both response formats
        };
    } catch (error) {
        console.error('❌ Error creating session:', error);
        return {
            success: false,
            message: 'Failed to create session',
            error: error.message
        };
    }
};

/**
 * Send message through WA Gateway (compatible with campaign service)
 * @param {string} sessionId - WhatsApp session ID
 * @param {string} phone - Phone number
 * @param {string} message - Message content
 * @returns {Object} - Send result
 */
exports.sendMessage = async (sessionId, phone, message) => {
    try {
        console.log(`📱 Sending message to ${phone} via session ${sessionId}`);
        
        const response = await fetch(`${WA_GATEWAY_URL}/send-message/${sessionId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                to: phone,
                text: message
            })
        });
        
        const data = await response.json();
        
        // API returns array of results
        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];
            if (result.success) {
                console.log(`✅ Message sent to ${phone}`);
                return {
                    success: true,
                    message: 'Message sent successfully',
                    data: result
                };
            } else {
                console.error(`❌ Message failed to ${phone}:`, result.message);
                return {
                    success: false,
                    message: result.message,
                    error: result.error
                };
            }
        } else if (data.success === false) {
            console.error(`❌ Message failed to ${phone}:`, data.message);
            return {
                success: false,
                message: data.message,
                error: data.error
            };
        } else {
            console.error(`❌ Message failed to ${phone}: Unknown response format`);
            return {
                success: false,
                message: 'Unknown response format',
                error: 'Invalid response from WA Gateway'
            };
        }
    } catch (error) {
        console.error(`❌ Error sending message to ${phone}:`, error);
        return {
            success: false,
            message: 'Failed to send message',
            error: error.message
        };
    }
};

/**
 * Get QR code for session authentication
 * @param {string} sessionId - WhatsApp session ID
 * @returns {Object} - QR code data
 */
exports.getQRCode = async (sessionId) => {
    try {
        const response = await fetch(`${WA_GATEWAY_URL}/session/qr?id=${sessionId}`);
        const data = await response.json();
        
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('❌ Error getting QR code:', error);
        return {
            success: false,
            message: 'Failed to get QR code',
            error: error.message
        };
    }
};

/**
 * Logout WhatsApp session
 * @param {string} sessionId - WhatsApp session ID
 * @returns {Object} - Logout result
 */
exports.logoutSession = async (sessionId) => {
    try {
        const response = await fetch(`${WA_GATEWAY_URL}/session/logout?id=${sessionId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        return {
            success: data.success,
            message: data.message,
            data: data.data
        };
    } catch (error) {
        console.error('❌ Error logging out session:', error);
        return {
            success: false,
            message: 'Failed to logout session',
            error: error.message
        };
    }
};

/**
 * Process campaign with error handling and retry logic
 * @param {Object} campaignData - Campaign data
 * @param {Array} customers - Array of customer data
 * @param {string} sessionId - WhatsApp session ID
 * @returns {Object} - Campaign processing result
 */
exports.processCampaign = async (campaignData, customers, sessionId) => {
    try {
        console.log(`🚀 Starting campaign: ${campaignData.name}`);
        console.log(`📱 Processing ${customers.length} customers`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;
        
        // Process customers in batches
        const batchSize = 5; // Small batches for better control
        const delayBetweenBatches = 3000; // 3 seconds between batches
        const delayBetweenMessages = 200; // 200ms between messages
        
        for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(customers.length / batchSize)}`);
            
            // Process batch
            for (let j = 0; j < batch.length; j++) {
                const customer = batch[j];
                
                try {
                    // Add delay between messages
                    if (j > 0) {
                        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
                    }
                    
                    const result = await this.sendCampaignMessage(
                        customer.phone, 
                        campaignData.message_content, 
                        sessionId
                    );
                    
                    results.push({
                        customer_id: customer.id,
                        phone: customer.phone,
                        success: result.success,
                        message: result.message,
                        error: result.error
                    });
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                    
                } catch (error) {
                    console.error(`❌ Error processing customer ${customer.phone}:`, error);
                    results.push({
                        customer_id: customer.id,
                        phone: customer.phone,
                        success: false,
                        message: 'Processing error',
                        error: error.message
                    });
                    failureCount++;
                }
            }
            
            // Add delay between batches
            if (i + batchSize < customers.length) {
                console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
        
        console.log(`📊 Campaign completed: ${successCount} success, ${failureCount} failed, ${skippedCount} skipped`);
        
        return {
            success: true,
            message: 'Campaign processing completed',
            data: {
                total: customers.length,
                success: successCount,
                failed: failureCount,
                skipped: skippedCount,
                results: results
            }
        };
        
    } catch (error) {
        console.error('❌ Error processing campaign:', error);
        return {
            success: false,
            message: 'Failed to process campaign',
            error: error.message
        };
    }
};
