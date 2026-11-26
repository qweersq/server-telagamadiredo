class MockWhatsAppService {
    /**
     * Mock WhatsApp service untuk testing follow-up system
     * Menghasilkan response random untuk simulasi berhasil/gagal
     */

    static generateRandomResponse() {
        // 80% success rate untuk testing
        const isSuccess = Math.random() > 0.2;
        
        if (isSuccess) {
            return {
                success: true,
                message: 'Message sent successfully',
                message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'sent',
                sent_at: new Date().toISOString(),
                phone_number: null, // Will be set by caller
                response_time: Math.floor(Math.random() * 3000) + 500 // 500-3500ms
            };
        } else {
            const errorMessages = [
                'Phone number not registered on WhatsApp',
                'Message delivery failed - network error',
                'Rate limit exceeded, please try again later',
                'Invalid phone number format',
                'WhatsApp service temporarily unavailable'
            ];
            
            return {
                success: false,
                message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
                message_id: null,
                status: 'failed',
                sent_at: new Date().toISOString(),
                phone_number: null,
                error_code: Math.floor(Math.random() * 5) + 1000 // 1000-1004
            };
        }
    }

    static async sendFollowupMessage(phoneNumber, message, templateData = {}) {
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 500));
            
            const response = this.generateRandomResponse();
            response.phone_number = phoneNumber;
            
            // Log untuk debugging
            console.log(`📱 Mock WhatsApp Send:`, {
                to: phoneNumber,
                message: message.substring(0, 50) + '...',
                success: response.success,
                message_id: response.message_id
            });
            
            return response;
            
        } catch (error) {
            console.error('❌ Mock WhatsApp Error:', error);
            return {
                success: false,
                message: 'Mock service error: ' + error.message,
                message_id: null,
                status: 'failed',
                sent_at: new Date().toISOString(),
                phone_number: phoneNumber,
                error_code: 9999
            };
        }
    }

    static async sendBulkFollowupMessages(recipients) {
        try {
            const results = [];
            
            for (const recipient of recipients) {
                const { phoneNumber, message, customerData } = recipient;
                
                // Simulate individual send with small delay
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 100));
                
                const response = await this.sendFollowupMessage(phoneNumber, message, customerData);
                
                results.push({
                    customer_id: customerData?.id || null,
                    customer_name: customerData?.name || 'Unknown',
                    phone_number: phoneNumber,
                    ...response
                });
            }
            
            const successCount = results.filter(r => r.success).length;
            const failedCount = results.length - successCount;
            
            console.log(`📊 Mock Bulk Send Summary:`, {
                total: results.length,
                success: successCount,
                failed: failedCount,
                success_rate: ((successCount / results.length) * 100).toFixed(2) + '%'
            });
            
            return {
                success: true,
                message: `Bulk send completed: ${successCount}/${results.length} successful`,
                results: results,
                summary: {
                    total: results.length,
                    success: successCount,
                    failed: failedCount,
                    success_rate: parseFloat(((successCount / results.length) * 100).toFixed(2))
                }
            };
            
        } catch (error) {
            console.error('❌ Mock Bulk WhatsApp Error:', error);
            return {
                success: false,
                message: 'Bulk send failed: ' + error.message,
                results: [],
                summary: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    success_rate: 0
                }
            };
        }
    }

    static async testConnection() {
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isConnected = Math.random() > 0.1; // 90% success rate
        
        if (isConnected) {
            return {
                success: true,
                message: 'WhatsApp service connected successfully',
                status: 'connected',
                session_id: `session_${Date.now()}`,
                tested_at: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                message: 'Failed to connect to WhatsApp service',
                status: 'disconnected',
                session_id: null,
                tested_at: new Date().toISOString(),
                error: 'Connection timeout or service unavailable'
            };
        }
    }

    static processTemplate(templateContent, variables = {}) {
        try {
            let processedContent = templateContent;
            
            // Replace variables in template
            for (const [key, value] of Object.entries(variables)) {
                const placeholder = `{${key}}`;
                processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || '');
            }
            
            return {
                success: true,
                processed_content: processedContent,
                variables_used: variables,
                original_content: templateContent
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'Template processing failed: ' + error.message,
                processed_content: templateContent,
                variables_used: {},
                original_content: templateContent
            };
        }
    }

    static generateMockStatistics(dateRange = {}) {
        // Generate mock statistics for testing
        const totalSent = Math.floor(Math.random() * 1000) + 100;
        const successRate = 0.7 + (Math.random() * 0.25); // 70-95%
        const responseRate = 0.1 + (Math.random() * 0.3); // 10-40%
        
        const successful = Math.floor(totalSent * successRate);
        const failed = totalSent - successful;
        const responses = Math.floor(successful * responseRate);
        
        return {
            period: dateRange,
            total_sent: totalSent,
            successful: successful,
            failed: failed,
            responses: responses,
            success_rate: parseFloat((successRate * 100).toFixed(2)),
            response_rate: parseFloat((responseRate * 100).toFixed(2)),
            generated_at: new Date().toISOString(),
            is_mock_data: true
        };
    }
}

module.exports = MockWhatsAppService;
