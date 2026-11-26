const SubscriptionService = require('../services/subscriptionService');
const { ResponseHelper } = require('../helpers');
const { decryptSecureData } = require('../helpers/secureDataHelper');
const { User, Tenant, Order, Subscription, SubscriptionPlan, Op } = require('../models');

class SubscriptionController {
    static async create(req, res) {
        try {
            const raw = {
                tenant_id: req.body.tenant_id,
                plan_id: req.body.plan_id,
                status: req.body.status,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                auto_renew: req.body.auto_renew,
                price: req.body.price,
                discount_amount: req.body.discount_amount,
                final_price: req.body.final_price,
                payment_method: req.body.payment_method,
                notes: req.body.notes
            };

            const data = await SubscriptionService.create(raw);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const tenant_id = req.query.tenant_id ? parseInt(req.query.tenant_id, 10) : null;
            const plan_id = req.query.plan_id ? parseInt(req.query.plan_id, 10) : null;
            const status = req.query.status;

            const data = await SubscriptionService.getAll(search, tenant_id, plan_id, status);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await SubscriptionService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async update(req, res) {
        try {
            const { id } = req.params;
            const raw = {
                plan_id: req.body.plan_id,
                status: req.body.status,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                auto_renew: req.body.auto_renew,
                price: req.body.price,
                discount_amount: req.body.discount_amount,
                final_price: req.body.final_price,
                payment_method: req.body.payment_method,
                notes: req.body.notes
            };

            // Remove undefined values
            Object.keys(raw).forEach(key => {
                if (raw[key] === undefined) {
                    delete raw[key];
                }
            });

            const data = await SubscriptionService.update(id, raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const data = await SubscriptionService.delete(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getByTenant(req, res) {
        try {
            const { tenant_id } = req.params;
            const data = await SubscriptionService.getByTenant(tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getMySubscriptionStatus(req, res) {
        try {
            let user = null;
            let tenant = null;

            // Try to get encrypted data from request body first
            if (req.body && req.body.encrypted_data) {
                const encryptedData = req.body.encrypted_data;
                console.log('🔍 Received encrypted data from body:', encryptedData.substring(0, 50) + '...');
                
                try {
                    const decryptedData = decryptSecureData(encryptedData);
                    if (decryptedData && decryptedData.tenant_id) {
                        user = await User.findByPk(decryptedData.user_id);
                        tenant = await Tenant.findByPk(decryptedData.tenant_id);
                        
                        if (!user || !tenant) {
                            return res.status(404).send(ResponseHelper.errorResponse('User or tenant not found', 404));
                        }
                        
                        console.log('🔐 Using encrypted data for subscription status:', {
                            user_id: decryptedData.user_id,
                            tenant_id: decryptedData.tenant_id,
                            tenant_status: decryptedData.tenant_status
                        });
                    }
                } catch (error) {
                    console.log('❌ Failed to decrypt authorization data:', error.message);
                }
            }
            
            // Fallback to regular authentication if no encrypted data
            if (!user || !tenant) {
                user = req.user;
                tenant = user?.tenant;
                
                if (!tenant) {
                    return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
                }
            }

            // Calculate days remaining for trial
            let daysRemaining = 0;
            if (tenant.trial_end_date && tenant.subscription_status === 'trial') {
                const now = new Date();
                const trialEnd = new Date(tenant.trial_end_date);
                const diffTime = trialEnd - now;
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const data = {
                tenant: {
                    id: tenant.id,
                    business_name: tenant.business_name,
                    status: tenant.status,
                    subscription_status: tenant.subscription_status,
                    trial_end_date: tenant.trial_end_date,
                    days_remaining: daysRemaining
                },
                user: {
                    id: user.id,
                    name: user.name,
                    // role_asli dipakai bila role sudah dinormalisasi (supervisor -> superadmin)
                    role: user.role_asli || user.role
                },
                is_active: tenant.subscription_status === 'active' && tenant.status === 'active',
                message: tenant.subscription_status === 'trial' 
                    ? `Trial berakhir dalam ${daysRemaining} hari` 
                    : tenant.subscription_status === 'active' 
                        ? 'Subscription aktif' 
                        : 'Subscription tidak aktif'
            };

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async checkPendingPayment(req, res) {
        try {
            // Handle authentication manually for suspended tenants
            let user, tenant;
            
            if (req.user && req.user.tenant) {
                // Normal authentication flow
                user = req.user;
                tenant = user.tenant;
            } else {
                // Manual authentication from token - simplified approach
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    // Return 200 with no pending payment instead of 401 to avoid redirect
                    return res.status(200).send(ResponseHelper.successResponse({
                        has_pending_payment: false
                    }));
                }
                
                const token = authHeader.substring(7);
                
                try {
                    // Decrypt encrypted data - jika bisa di-decrypt berarti valid
                    const decryptedData = decryptSecureData(token);
                    
                    if (!decryptedData) {
                        console.log('❌ Failed to decrypt data - invalid or tampered');
                        return res.status(200).send(ResponseHelper.successResponse({
                            has_pending_payment: false
                        }));
                    }
                    
                    // Data berhasil di-decrypt, ambil user_id dan tenant_id
                    const { user_id, tenant_id } = decryptedData;
                    
                    console.log('✅ Data successfully decrypted:', {
                        user_id,
                        tenant_id,
                        role: decryptedData.role,
                        tenant_name: decryptedData.tenant_name
                    });
                    
                    const userData = await User.findByPk(user_id, {
                        include: [{ model: Tenant, as: 'tenant' }]
                    });
                    
                    if (!userData || !userData.tenant) {
                        console.log('❌ User or tenant not found after decryption');
                        return res.status(200).send(ResponseHelper.successResponse({
                            has_pending_payment: false
                        }));
                    }
                    
                    user = userData;
                    tenant = userData.tenant;
                    
                } catch (decryptError) {
                    console.log('❌ Error decrypting data:', decryptError.message);
                    // Return 200 with no pending payment instead of 401 to avoid redirect
                    return res.status(200).send(ResponseHelper.successResponse({
                        has_pending_payment: false
                    }));
                }
            }
            
            if (!tenant) {
                // Return 200 with no pending payment instead of 404 to avoid redirect
                return res.status(200).send(ResponseHelper.successResponse({
                    has_pending_payment: false
                }));
            }

            // Check if there's a pending payment for this tenant
            const pendingPayment = await SubscriptionService.getPendingPaymentByTenant(tenant.id);
            
            if (pendingPayment) {
                const data = {
                    has_pending_payment: true,
                    payment_data: {
                        payment_id: pendingPayment.payment_reference || `PAY-${pendingPayment.id}`,
                        status: pendingPayment.status,
                        plan_name: pendingPayment.notes ? pendingPayment.notes.split('for ')[1]?.split(' subscription')[0] || 'Unknown Plan' : 'Unknown Plan',
                        amount: pendingPayment.amount,
                        bank_name: pendingPayment.notes ? pendingPayment.notes.split('Bank: ')[1]?.split(',')[0] || 'Unknown Bank' : 'Unknown Bank',
                        account_number: pendingPayment.notes ? pendingPayment.notes.split('Account: ')[1]?.split(',')[0] || 'Unknown Account' : 'Unknown Account',
                        account_holder: pendingPayment.notes ? pendingPayment.notes.split('Holder: ')[1]?.split('.')[0] || 'Unknown Holder' : 'Unknown Holder',
                        submitted_at: pendingPayment.createdAt
                    }
                };
                return res.status(200).send(ResponseHelper.successResponse(data));
            } else {
                const data = {
                    has_pending_payment: false
                };
                return res.status(200).send(ResponseHelper.successResponse(data));
            }
        } catch (error) {
            // Return 200 with no pending payment instead of 500 to avoid redirect
            return res.status(200).send(ResponseHelper.successResponse({
                has_pending_payment: false
            }));
        }
    };

    static async checkPendingPaymentSimple(req, res) {
        try {
            // Simple approach - just need tenant_id from query parameter
            const { tenant_id } = req.query;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id is required', 400));
            }

            // Check if there's a pending payment for this tenant
            const pendingPayment = await SubscriptionService.getPendingPaymentByTenant(parseInt(tenant_id));
            
            if (pendingPayment) {
                const data = {
                    has_pending_payment: true,
                    payment_data: {
                        payment_id: pendingPayment.payment_reference || `PAY-${pendingPayment.id}`,
                        status: pendingPayment.status,
                        plan_name: pendingPayment.notes ? pendingPayment.notes.split('for ')[1]?.split(' subscription')[0] || 'Unknown Plan' : 'Unknown Plan',
                        amount: pendingPayment.amount,
                        bank_name: pendingPayment.notes ? pendingPayment.notes.split('Bank: ')[1]?.split(',')[0] || 'Unknown Bank' : 'Unknown Bank',
                        account_number: pendingPayment.notes ? pendingPayment.notes.split('Account: ')[1]?.split(',')[0] || 'Unknown Account' : 'Unknown Account',
                        account_holder: pendingPayment.notes ? pendingPayment.notes.split('Holder: ')[1]?.split('.')[0] || 'Unknown Holder' : 'Unknown Holder',
                        submitted_at: pendingPayment.createdAt
                    }
                };
                return res.status(200).send(ResponseHelper.successResponse(data));
            } else {
                const data = {
                    has_pending_payment: false
                };
                return res.status(200).send(ResponseHelper.successResponse(data));
            }
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async submitPayment(req, res) {
        try {
            let user, tenant;
            
            // Check if this is a suspended tenant using encrypted data
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                const encryptedData = req.headers.authorization.replace('Bearer ', '');
                try {
                    const decryptedData = decryptSecureData(encryptedData);
                    if (decryptedData) {
                        // Use decrypted data for suspended tenants
                        user = await User.findByPk(decryptedData.user_id);
                        tenant = await Tenant.findByPk(decryptedData.tenant_id);
                        
                        if (!user || !tenant) {
                            return res.status(404).send(ResponseHelper.errorResponse('User or tenant not found', 404));
                        }
                        
                        console.log('🔐 Using encrypted data for suspended tenant:', {
                            user_id: decryptedData.user_id,
                            tenant_id: decryptedData.tenant_id,
                            tenant_status: decryptedData.tenant_status
                        });
                    }
                } catch (error) {
                    console.log('❌ Failed to decrypt authorization data:', error.message);
                }
            }
            
            // Fallback to regular authentication if no encrypted data
            if (!user || !tenant) {
                user = req.user;
                tenant = user?.tenant;
                
                if (!tenant) {
                    return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
                }
            }

            const { plan_id, payment_method, bank_name, account_number, account_holder, amount, notes } = req.body;
            const payment_proof = req.file;

            console.log('📋 Payment submission data:', {
                tenant_id: tenant.id,
                plan_id,
                payment_method,
                bank_name,
                account_number,
                account_holder,
                amount,
                notes,
                file_uploaded: !!payment_proof
            });

            if (!plan_id || !payment_method || !bank_name || !account_number || !account_holder || !amount) {
                return res.status(400).send(ResponseHelper.errorResponse('Required fields missing', 400));
            }

            if (!payment_proof) {
                return res.status(400).send(ResponseHelper.errorResponse('Payment proof is required', 400));
            }

            // Generate unique payment ID
            const payment_id = `PAY-${Date.now()}-${tenant.id}`;
            
            // Create payment record data for database
            const paymentData = {
                tenant_id: tenant.id,
                subscription_id: null, // Will be set when subscription is created
                amount: parseFloat(amount),
                status: 'pending',
                payment_method: payment_method,
                payment_reference: payment_id,
                payment_gateway: 'manual_bank_transfer',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                invoice_number: `INV-${Date.now()}-${tenant.id}`,
                receipt_url: payment_proof.path,
                notes: `Bank: ${bank_name}, Account: ${account_number}, Holder: ${account_holder}. ${notes || ''}`
            };

            // Save to database
            const TenantPaymentService = require('../services/tenantPaymentService');
            const savedPayment = await TenantPaymentService.create(paymentData);

            const data = {
                message: 'Payment proof submitted successfully',
                payment_id,
                status: 'pending_verification',
                estimated_verification_time: '1x24 jam',
                payment_data: {
                    id: savedPayment.id,
                    payment_id,
                    tenant_id: tenant.id,
                    plan_id: parseInt(plan_id),
                    payment_method,
                    bank_name,
                    account_number,
                    account_holder,
                    amount: parseFloat(amount),
                    notes: notes || '',
                    payment_proof_path: payment_proof.path,
                    payment_proof_filename: payment_proof.filename,
                    status: 'pending_verification',
                    submitted_at: new Date(),
                    estimated_verification_time: '1x24 jam'
                }
            };

            console.log('✅ Payment submitted successfully:', payment_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            console.error('❌ Error submitting payment:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };

    static async getActiveSubscriptions(req, res) {
        try {
            const data = await SubscriptionService.getActiveSubscriptions();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getExpiredSubscriptions(req, res) {
        try {
            const data = await SubscriptionService.getExpiredSubscriptions();

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

            const data = await SubscriptionService.updateStatus(id, status);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async renewSubscription(req, res) {
        try {
            const { id } = req.params;
            const { days } = req.body;

            const data = await SubscriptionService.renewSubscription(id, days);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async cancelSubscription(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const data = await SubscriptionService.cancelSubscription(id, reason);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getSubscriptionStats(req, res) {
        try {
            const { id } = req.params;
            const data = await SubscriptionService.getSubscriptionStats(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async checkOrderLimit(req, res) {
        try {
            const user = req.user;
            if (!user || !user.tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('User atau tenant tidak ditemukan', 400));
            }

            const subscription = await Subscription.findOne({
                where: { tenant_id: user.tenant_id, status: 'active' },
                include: [{ model: SubscriptionPlan, as: 'plan' }]
            });

            if (!subscription || !subscription.plan) {
                return res.status(200).send(ResponseHelper.successResponse({
                    current: 0,
                    max: null,
                    canCreate: true,
                    percentage: 0
                }));
            }

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const endOfMonth = new Date();
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            endOfMonth.setDate(0);
            endOfMonth.setHours(23, 59, 59, 999);

            const current = await Order.count({
                where: {
                    tenant_id: user.tenant_id,
                    createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
                }
            });

            const max = subscription.plan.max_orders_per_month;
            const canCreate = max === null || max === undefined || current < max;
            const percentage = max ? Math.round((current / max) * 100) : 0;

            return res.status(200).send(ResponseHelper.successResponse({
                current,
                max,
                canCreate,
                percentage
            }));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    };
}

module.exports = SubscriptionController;
