const TenantPaymentService = require('../services/tenantPaymentService');
const { ResponseHelper } = require('../helpers');

class TenantPaymentController {
    static async create(req, res) {
        try {
            const raw = {
                subscription_id: req.body.subscription_id,
                tenant_id: req.body.tenant_id,
                amount: req.body.amount,
                status: req.body.status,
                payment_method: req.body.payment_method,
                payment_reference: req.body.payment_reference,
                payment_gateway: req.body.payment_gateway,
                paid_at: req.body.paid_at,
                due_date: req.body.due_date,
                invoice_number: req.body.invoice_number,
                receipt_url: req.body.receipt_url,
                notes: req.body.notes,
                bank_name: req.body.bank_name,
                account_number: req.body.account_number,
                account_holder: req.body.account_holder,
                payment_code: req.body.payment_code
            };

            const data = await TenantPaymentService.create(raw);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const subscription_id = req.query.subscription_id ? parseInt(req.query.subscription_id, 10) : null;
            const tenant_id = req.query.tenant_id ? parseInt(req.query.tenant_id, 10) : null;
            const status = req.query.status;
            const payment_method = req.query.payment_method;

            const data = await TenantPaymentService.getAll(search, subscription_id, tenant_id, status, payment_method);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await TenantPaymentService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async update(req, res) {
        try {
            const { id } = req.params;
            const raw = {
                amount: req.body.amount,
                status: req.body.status,
                payment_method: req.body.payment_method,
                payment_reference: req.body.payment_reference,
                payment_gateway: req.body.payment_gateway,
                paid_at: req.body.paid_at,
                due_date: req.body.due_date,
                invoice_number: req.body.invoice_number,
                receipt_url: req.body.receipt_url,
                notes: req.body.notes,
                bank_name: req.body.bank_name,
                account_number: req.body.account_number,
                account_holder: req.body.account_holder,
                payment_code: req.body.payment_code
            };

            // Remove undefined values
            Object.keys(raw).forEach(key => {
                if (raw[key] === undefined) {
                    delete raw[key];
                }
            });

            const data = await TenantPaymentService.update(id, raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const data = await TenantPaymentService.delete(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getBySubscription(req, res) {
        try {
            const { subscription_id } = req.params;
            const data = await TenantPaymentService.getBySubscription(subscription_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getByTenant(req, res) {
        try {
            const { tenant_id } = req.params;
            const data = await TenantPaymentService.getByTenant(tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getPendingPayments(req, res) {
        try {
            const data = await TenantPaymentService.getPendingPayments();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getOverduePayments(req, res) {
        try {
            const data = await TenantPaymentService.getOverduePayments();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).send(ResponseHelper.errorResponse('Status is required', 400));
            }

            const data = await TenantPaymentService.updateStatus(id, status);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async markAsPaid(req, res) {
        try {
            const { id } = req.params;
            const { payment_reference, payment_gateway, receipt_url, notes } = req.body;

            const data = await TenantPaymentService.markAsPaid(id, {
                payment_reference,
                payment_gateway,
                receipt_url,
                notes
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async refundPayment(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const data = await TenantPaymentService.refundPayment(id, reason);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getPaymentStats(req, res) {
        try {
            const { id } = req.params;
            const data = await TenantPaymentService.getPaymentStats(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getTabStats(req, res) {
        try {
            console.log('🔍 TenantPaymentController.getTabStats - Getting tab statistics');
            const data = await TenantPaymentService.getTabStats();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ TenantPaymentController.getTabStats - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async submitPayment(req, res) {
        try {
            console.log('🔍 TenantPaymentController.submitPayment - Submitting payment with unique code');
            
            const { billing_id, payment_method, bank_name, account_number, account_holder, amount, notes, payment_code } = req.body;

            if (!billing_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing ID is required', 400));
            }

            // Use payment_code from frontend (100-500 range) or generate fallback
            let finalPaymentCode = payment_code;
            if (!finalPaymentCode && amount) {
                // Generate from amount if no code provided (ensure 100-500 range)
                const price = parseFloat(amount);
                const lastThreeDigits = Math.floor(price) % 1000;
                
                // Map to range 100-500
                let code;
                if (lastThreeDigits < 100) {
                    code = lastThreeDigits + 100; // 000-099 becomes 100-199
                } else if (lastThreeDigits <= 500) {
                    code = lastThreeDigits; // 100-500 keep as is
                } else {
                    code = ((lastThreeDigits - 500) % 400) + 100; // 501+ cycles back to 100-500
                }
                
                finalPaymentCode = code.toString();
            }
            
            if (!finalPaymentCode) {
                // Fallback to timestamp-based code
                finalPaymentCode = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            }

            // Update billing with payment info and unique code
            const updateData = {
                status: 'pending', // Update status to pending
                payment_method,
                bank_name,
                account_number,
                account_holder,
                payment_code: finalPaymentCode,
                paid_at: new Date(),
                notes: notes || 'Payment submitted for reactivation'
            };

            const data = await TenantPaymentService.update(billing_id, updateData);

            console.log('✅ TenantPaymentController.submitPayment - Payment submitted with code:', finalPaymentCode);
            return res.status(200).send(ResponseHelper.successResponse({
                ...data,
                payment_code: finalPaymentCode
            }));
        } catch (error) {
            console.error('❌ TenantPaymentController.submitPayment - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async getMyPayments(req, res) {
        try {
            console.log('🚀 TenantPaymentController.getMyPayments - Method called!');
            console.log('🔍 TenantPaymentController.getMyPayments - Getting payments for tenant');
            
            let encryptedData = null;
            let tenantId = null;

            // Try to get encrypted data from request body first
            if (req.body && req.body.encrypted_data) {
                encryptedData = req.body.encrypted_data;
                console.log('🔍 Received encrypted data from body:', encryptedData.substring(0, 50) + '...');
            }
            // Fallback to Authorization header for backward compatibility
            else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                encryptedData = req.headers.authorization.replace('Bearer ', '');
                console.log('🔍 Received encrypted data from header:', encryptedData.substring(0, 50) + '...');
            }
            // Fallback to regular authentication
            else if (req.user && req.user.tenant_id) {
                tenantId = req.user.tenant_id;
                console.log('🔍 Using regular authentication, tenant_id:', tenantId);
            }
            else {
                return res.status(400).send(ResponseHelper.errorResponse('Encrypted data or authentication required', 400));
            }

            // If we have encrypted data, decrypt it
            if (encryptedData) {
                console.log('🔍 About to decrypt:', encryptedData.substring(0, 50) + '...');
                console.log('🔍 Full encrypted data length:', encryptedData.length);
                console.log('🔍 Encrypted data parts:', encryptedData.split('|').length);
                
                // Check if it's JWT token (starts with eyJ) or encrypted data (has | separator)
                if (encryptedData.startsWith('eyJ')) {
                    console.log('🔍 Detected JWT token, skipping decryption');
                    // This is a JWT token, not encrypted data
                    // We need to handle this differently - maybe use regular auth middleware
                    return res.status(400).send(ResponseHelper.errorResponse('JWT token not supported in this endpoint, use encrypted data', 400));
                } else if (encryptedData.includes('|')) {
                    console.log('🔍 Detected encrypted data format');
                    const { decryptSecureData } = require('../helpers/secureDataHelper');
                    const decryptedData = decryptSecureData(encryptedData);
                    console.log('🔐 Decrypted data:', decryptedData);
                    
                    if (!decryptedData || !decryptedData.tenant_id) {
                        console.log('❌ Invalid decrypted data or missing tenant_id');
                        console.log('❌ Decrypted data type:', typeof decryptedData);
                        console.log('❌ Decrypted data value:', decryptedData);
                        return res.status(400).send(ResponseHelper.errorResponse('Invalid encrypted data or missing tenant_id', 400));
                    }

                    tenantId = decryptedData.tenant_id;
                    console.log('🔐 Decrypted tenant_id:', tenantId);
                } else {
                    console.log('❌ Unknown data format');
                    return res.status(400).send(ResponseHelper.errorResponse('Invalid data format', 400));
                }
            }

            const data = await TenantPaymentService.getByTenant(tenantId);

            console.log('✅ TenantPaymentController.getMyPayments - Found payments:', data?.length || 0);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ TenantPaymentController.getMyPayments - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async getUpcomingBillings(req, res) {
        try {
            console.log('🔍 TenantPaymentController.getUpcomingBillings - Getting upcoming billings for tenant');
            
            let encryptedData = null;
            let tenantId = null;

            // Try to get encrypted data from request body first
            if (req.body && req.body.encrypted_data) {
                encryptedData = req.body.encrypted_data;
                console.log('🔍 Received encrypted data from body:', encryptedData.substring(0, 50) + '...');
            }
            // Fallback to Authorization header for backward compatibility
            else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                encryptedData = req.headers.authorization.replace('Bearer ', '');
                console.log('🔍 Received encrypted data from header:', encryptedData.substring(0, 50) + '...');
            }
            // Fallback to regular authentication
            else if (req.user && req.user.tenant_id) {
                tenantId = req.user.tenant_id;
                console.log('🔍 Using regular authentication, tenant_id:', tenantId);
            }
            else {
                return res.status(400).send(ResponseHelper.errorResponse('Encrypted data or authentication required', 400));
            }

            // If we have encrypted data, decrypt it
            if (encryptedData) {
                const { decryptSecureData } = require('../helpers/secureDataHelper');
                console.log('🔍 About to decrypt upcoming:', encryptedData.substring(0, 50) + '...');
                console.log('🔍 Full encrypted data length:', encryptedData.length);
                console.log('🔍 Encrypted data parts:', encryptedData.split('|').length);
                
                const decryptedData = decryptSecureData(encryptedData);
                console.log('🔐 Decrypted data:', decryptedData);
                
                if (!decryptedData || !decryptedData.tenant_id) {
                    console.log('❌ Invalid decrypted data or missing tenant_id');
                    console.log('❌ Decrypted data type:', typeof decryptedData);
                    console.log('❌ Decrypted data value:', decryptedData);
                    return res.status(400).send(ResponseHelper.errorResponse('Invalid encrypted data or missing tenant_id', 400));
                }

                tenantId = decryptedData.tenant_id;
                console.log('🔐 Decrypted tenant_id:', tenantId);
            }

            // Get upcoming billings (only unpaid status - pending should be in history)
            const data = await TenantPaymentService.getByTenant(tenantId, ['unpaid']);

            console.log('✅ TenantPaymentController.getUpcomingBillings - Found upcoming billings:', data?.length || 0);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ TenantPaymentController.getUpcomingBillings - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async getBillingHistory(req, res) {
        try {
            console.log('🔍 TenantPaymentController.getBillingHistory - Getting billing history for tenant');
            
            let encryptedData = null;
            let tenantId = null;

            // Try to get encrypted data from request body first
            if (req.body && req.body.encrypted_data) {
                encryptedData = req.body.encrypted_data;
                console.log('🔍 Received encrypted data from body:', encryptedData.substring(0, 50) + '...');
            }
            // Fallback to Authorization header for backward compatibility
            else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                encryptedData = req.headers.authorization.replace('Bearer ', '');
                console.log('🔍 Received encrypted data from header:', encryptedData.substring(0, 50) + '...');
            }
            // Fallback to regular authentication
            else if (req.user && req.user.tenant_id) {
                tenantId = req.user.tenant_id;
                console.log('🔍 Using regular authentication, tenant_id:', tenantId);
            }
            else {
                return res.status(400).send(ResponseHelper.errorResponse('Encrypted data or authentication required', 400));
            }

            // If we have encrypted data, decrypt it
            if (encryptedData) {
                const { decryptSecureData } = require('../helpers/secureDataHelper');
                const decryptedData = decryptSecureData(encryptedData);
                
                if (!decryptedData || !decryptedData.tenant_id) {
                    return res.status(400).send(ResponseHelper.errorResponse('Invalid encrypted data or missing tenant_id', 400));
                }

                tenantId = decryptedData.tenant_id;
                console.log('🔐 Decrypted tenant_id:', tenantId);
            }

            // Get all billing history for the tenant
            const allBillings = await TenantPaymentService.getByTenant(tenantId);
            
            // Group by status for tab counts
            const billingStats = {
                unpaid: allBillings.filter(b => b.status === 'unpaid'),
                pending: allBillings.filter(b => b.status === 'pending'),
                paid: allBillings.filter(b => b.status === 'paid'),
                failed: allBillings.filter(b => b.status === 'failed')
            };

            // Calculate totals
            const stats = {
                unpaid: {
                    count: billingStats.unpaid.length,
                    total_amount: billingStats.unpaid.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
                },
                pending: {
                    count: billingStats.pending.length,
                    total_amount: billingStats.pending.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
                },
                paid: {
                    count: billingStats.paid.length,
                    total_amount: billingStats.paid.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
                },
                failed: {
                    count: billingStats.failed.length,
                    total_amount: billingStats.failed.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
                }
            };

            const response = {
                billings: allBillings,
                stats: stats
            };

            console.log('✅ TenantPaymentController.getBillingHistory - Found billings:', allBillings?.length || 0);
            return res.status(200).send(ResponseHelper.successResponse(response));
        } catch (error) {
            console.error('❌ TenantPaymentController.getBillingHistory - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    /**
     * Get available subscription plans for billing
     */
    static async getAvailablePlans(req, res) {
        try {
            console.log('🔍 TenantPaymentController.getAvailablePlans - Getting available plans');
            
            const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
            const plans = await SubscriptionPlanRepository.getAll();
            
            console.log('✅ TenantPaymentController.getAvailablePlans - Found plans:', plans?.length || 0);
            return res.status(200).send(ResponseHelper.successResponse(plans));
        } catch (error) {
            console.error('❌ TenantPaymentController.getAvailablePlans - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Change subscription plan for billing
     */
    static async changePlan(req, res) {
        try {
            console.log('🔍 TenantPaymentController.changePlan - Changing plan for billing:', req.params.id);
            
            const { id } = req.params;
            const { plan_id } = req.body;

            if (!plan_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Plan ID is required', 400));
            }

            // Get billing details
            const billing = await TenantPaymentService.getById(id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            if (billing.status !== 'unpaid') {
                return res.status(400).send(ResponseHelper.errorResponse('Only unpaid billings can change plan', 400));
            }

            // Get new plan details
            const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
            const newPlan = await SubscriptionPlanRepository.getById(plan_id);
            if (!newPlan) {
                return res.status(404).send(ResponseHelper.errorResponse('Plan not found', 404));
            }

            // Update billing with new plan and amount
            const updateData = {
                amount: parseFloat(newPlan.price),
                notes: `Plan changed to ${newPlan.name} - ${newPlan.description || 'No description'}`
            };

            const updatedBilling = await TenantPaymentService.update(id, updateData);
            
            console.log('✅ TenantPaymentController.changePlan - Plan changed successfully');
            return res.status(200).send(ResponseHelper.successResponse(updatedBilling, 'Plan changed successfully'));
        } catch (error) {
            console.error('❌ TenantPaymentController.changePlan - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = TenantPaymentController;
