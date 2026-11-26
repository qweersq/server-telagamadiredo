const crypto = require('crypto');
const axios = require('axios');

class TripayService {
    constructor() {
        this.apiKey = process.env.TRIPAY_API_KEY;
        this.privateKey = process.env.TRIPAY_PRIVATE_KEY;
        this.merchantCode = process.env.TRIPAY_MERCHANT_CODE;
        this.baseUrl = process.env.TRIPAY_BASE_URL;
        this.callbackUrl = process.env.TRIPAY_CALLBACK_URL;
    }

    /**
     * Generate signature untuk request ke Tripay
     */
    generateSignature(method, url, body = '') {
        const timestamp = Math.floor(Date.now() / 1000);
        const stringToSign = `${method}${url}${body}${timestamp}`;
        const signature = crypto
            .createHmac('sha256', this.privateKey)
            .update(stringToSign)
            .digest('hex');
        
        return {
            signature,
            timestamp
        };
    }

    /**
     * Get payment channels yang tersedia
     */
    async getPaymentChannels() {
        try {
            const url = '/merchant/payment-channel';
            const { signature, timestamp } = this.generateSignature('GET', url);

            const response = await axios.get(`${this.baseUrl}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-TIMESTAMP': timestamp,
                    'X-SIGNATURE': signature
                }
            });

            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('❌ TripayService.getPaymentChannels - Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Create transaction baru
     * @param {object} transactionData
     * @param {string} transactionData.merchant_ref_prefix - Optional prefix for merchant_ref (default: 'BILLING')
     */
    async createTransaction(transactionData) {
        try {
            const {
                tenant_id,
                billing_id,
                amount,
                payment_method,
                customer_name,
                customer_email,
                customer_phone,
                order_items,
                merchant_ref_prefix = 'BILLING'
            } = transactionData;

            const url = '/transaction/create';
            const merchantRef = `${merchant_ref_prefix}-${billing_id}-${Date.now()}`;
            const body = {
                method: payment_method,
                merchant_ref: merchantRef,
                amount: parseInt(amount),
                customer_name: customer_name || 'NotaSepatu Customer',
                customer_email: customer_email || 'customer@notasepatu.com',
                customer_phone: customer_phone || '08123456789',
                order_items: order_items || [
                    {
                        sku: `BILLING-${billing_id}`,
                        name: `Pembayaran Langganan NotaSepatu`,
                        price: parseInt(amount),
                        quantity: 1,
                        product_url: 'https://notasepatu.com/product/billing',
                        image_url: 'https://notasepatu.com/images/billing.jpg'
                    }
                ],
                return_url: `https://notasepatu.id/login`,
                expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 jam
            };

            // Generate signature using Tripay format: merchant_code + merchant_ref + amount
            const transactionAmount = body.amount;
            console.log('🔍 Before generateSignature:');
            console.log('  merchantRef:', merchantRef);
            console.log('  transactionAmount:', transactionAmount);
            console.log('  merchantRef type:', typeof merchantRef);
            console.log('  transactionAmount type:', typeof transactionAmount);
            console.log('🔍 Calling generateSignature with:');
            console.log('  method: POST');
            console.log('  url:', url);
            console.log('  body: null');
            console.log('  merchantRef:', merchantRef);
            console.log('  transactionAmount:', transactionAmount);
            const { signature, timestamp } = this.generateSignature('POST', url, null, String(merchantRef), String(transactionAmount));
            
            // Add signature to body (Tripay expect it in body)
            body.signature = signature;

            console.log('🔍 TripayService.createTransaction - Request data:');
            console.log('URL:', `${this.baseUrl}${url}`);
            console.log('Body:', JSON.stringify(body, null, 2));
            console.log('Signature:', signature);
            console.log('Timestamp:', timestamp);

            const response = await axios.post(`${this.baseUrl}${url}`, body, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Handle Tripay HTTP 200 tapi success: false (misal method tidak tersedia)
            if (!response.data.success) {
                console.error('❌ TripayService.createTransaction - Tripay returned failure:', response.data.message);
                return {
                    success: false,
                    error: response.data.message || 'Tripay transaction failed'
                };
            }

            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('❌ TripayService.createTransaction - Error:', error.response?.data || error.message);
            console.error('❌ Full error response:', JSON.stringify(error.response?.data, null, 2));
            console.error('❌ Error status:', error.response?.status);
            console.error('❌ Error headers:', error.response?.headers);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Check status transaction
     */
    async checkTransactionStatus(reference) {
        try {
            const url = `/transaction/detail?reference=${reference}`;
            const { signature, timestamp } = this.generateSignature('GET', url);

            const response = await axios.get(`${this.baseUrl}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-TIMESTAMP': timestamp,
                    'X-SIGNATURE': signature
                }
            });

            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('❌ TripayService.checkTransactionStatus - Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Verify callback signature
     */
    verifyCallbackSignature(callbackBody, signature, timestamp) {
        try {
            const stringToSign = `${JSON.stringify(callbackBody)}${timestamp}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.privateKey)
                .update(stringToSign)
                .digest('hex');
            
            return signature === expectedSignature;
        } catch (error) {
            console.error('❌ TripayService.verifyCallbackSignature - Error:', error.message);
            return false;
        }
    }

    /**
     * Handle payment callback
     */
    async handleCallback(callbackData) {
        try {
            const {
                reference,
                status,
                total_amount,
                fee_merchant,
                fee_customer,
                total_fee,
                amount_received,
                is_closed_payment,
                payment_method,
                payment_method_code,
                paid_at,
                note
            } = callbackData;

            console.log('🔔 TripayService.handleCallback - Received callback:', {
                reference,
                status,
                total_amount,
                payment_method,
                paid_at
            });

            // Extract billing_id from reference (format: BILLING-{billing_id}-{timestamp})
            const billingId = reference.split('-')[1];
            
            if (!billingId) {
                throw new Error('Invalid reference format');
            }

            return {
                success: true,
                billing_id: parseInt(billingId),
                tripay_reference: reference,
                status: status === 'PAID' ? 'paid' : 'failed',
                amount: total_amount,
                fee_merchant,
                fee_customer,
                total_fee,
                amount_received,
                payment_method,
                payment_method_code,
                paid_at: paid_at ? new Date(paid_at * 1000) : new Date(),
                note
            };
        } catch (error) {
            console.error('❌ TripayService.handleCallback - Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate signature for Tripay API
     */
    generateSignature(method, url, body, merchantRef = null, amount = null) {
        const timestamp = Math.floor(Date.now() / 1000);
        
        console.log('🔍 generateSignature called with:');
        console.log('  method:', method);
        console.log('  url:', url);
        console.log('  body:', body);
        console.log('  merchantRef:', merchantRef);
        console.log('  amount:', amount);
        
        let stringToSign;
        if (method === 'GET') {
            // For GET requests
            stringToSign = `${this.merchantCode}${timestamp}`;
            console.log('🔍 Using GET format - String to sign:', stringToSign);
        } else {
            // For POST requests - use Tripay format: merchant_code + merchant_ref + amount
            console.log('🔍 Debug merchantRef:', merchantRef);
            console.log('🔍 Debug amount:', amount);
            console.log('🔍 Debug merchantRef type:', typeof merchantRef);
            console.log('🔍 Debug amount type:', typeof amount);
            console.log('🔍 Debug merchantRef truthy:', !!merchantRef);
            console.log('🔍 Debug amount truthy:', !!amount);
            console.log('🔍 Debug condition result:', !!(merchantRef && amount));
            
            if (merchantRef && amount) {
                // Ensure amount is string for signature generation
                stringToSign = `${this.merchantCode}${merchantRef}${amount.toString()}`;
                console.log('🔍 Using Tripay format - String to sign:', stringToSign);
            } else {
                // Fallback to original format if merchantRef/amount not provided
                const cleanBody = typeof body === 'string' ? body : JSON.stringify(body);
                stringToSign = `${this.merchantCode}${timestamp}${cleanBody}`;
                console.log('🔍 Using fallback format - String to sign:', stringToSign);
            }
        }
        
        const signature = crypto.createHmac('sha256', this.privateKey).update(stringToSign).digest('hex');
        
        console.log('🔍 Signature generation:');
        console.log('Merchant Code:', this.merchantCode);
        console.log('Timestamp:', timestamp);
        console.log('Body:', body);
        console.log('Merchant Ref:', merchantRef);
        console.log('Amount:', amount);
        console.log('Amount type:', typeof amount);
        console.log('String to sign:', stringToSign);
        console.log('String to sign length:', stringToSign.length);
        console.log('Private Key (first 10 chars):', this.privateKey?.substring(0, 10) + '...');
        console.log('Private Key length:', this.privateKey?.length);
        console.log('Generated signature:', signature);
        
        return {
            signature,
            timestamp: timestamp.toString()
        };
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(page = 1, limit = 50) {
        try {
            const url = `/merchant/transactions?page=${page}&per_page=${limit}`;
            const { signature, timestamp } = this.generateSignature('GET', url);

            const response = await axios.get(`${this.baseUrl}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-TIMESTAMP': timestamp,
                    'X-SIGNATURE': signature
                }
            });

            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('❌ TripayService.getTransactionHistory - Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

module.exports = new TripayService();
