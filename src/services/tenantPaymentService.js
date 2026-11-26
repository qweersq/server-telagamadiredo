const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');
const SubscriptionRepository = require('../repositories/subscriptionRepository');
const TenantRepository = require('../repositories/tenantRepository');
const moment = require('moment');

class TenantPaymentService {
    static async create(data) {
        try {
            // Validate required fields
            if (!data.tenant_id || !data.amount || !data.due_date) {
                throw new Error('Required fields: tenant_id, amount, due_date');
            }

            // Validate tenant exists
            const tenant = await TenantRepository.getById(data.tenant_id);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // If subscription_id is provided, validate it exists and belongs to tenant
            if (data.subscription_id) {
                const subscription = await SubscriptionRepository.getById(data.subscription_id);
                if (!subscription) {
                    throw new Error('Subscription not found');
                }

                // Validate subscription belongs to tenant
                if (subscription.tenant_id !== data.tenant_id) {
                    throw new Error('Subscription does not belong to the specified tenant');
                }
            }

            // Validate amount is positive
            if (data.amount <= 0) {
                throw new Error('Amount must be positive');
            }

            // Validate due date
            const dueDate = moment(data.due_date);
            if (!dueDate.isValid()) {
                throw new Error('Invalid due date format');
            }

            // Generate invoice number if not provided
            const invoiceNumber = data.invoice_number || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Set default values
            const paymentData = {
                subscription_id: data.subscription_id,
                tenant_id: data.tenant_id,
                amount: parseFloat(data.amount),
                status: data.status || 'pending',
                payment_method: data.payment_method || null,
                payment_reference: data.payment_reference || null,
                payment_gateway: data.payment_gateway || null,
                paid_at: data.paid_at ? moment(data.paid_at).toDate() : null,
                due_date: dueDate.toDate(),
                invoice_number: invoiceNumber,
                receipt_url: data.receipt_url || null,
                notes: data.notes || null,
                bank_name: data.bank_name || null,
                account_number: data.account_number || null,
                account_holder: data.account_holder || null,
                payment_code: data.payment_code || null
            };

            const result = await TenantPaymentRepository.create(paymentData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAll(search, subscription_id, tenant_id, status, payment_method) {
        try {
            const result = await TenantPaymentRepository.getAll(search, subscription_id, tenant_id, status, payment_method);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await TenantPaymentRepository.getById(id);
            if (!result) throw new Error('Tenant payment not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByIdWithDetails(id) {
        try {
            const result = await TenantPaymentRepository.getByIdWithDetails(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAllWithDetails(filters = {}, page = 1, pageSize = 10) {
        try {
            const result = await TenantPaymentRepository.getAllWithDetails(filters, page, pageSize);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async approvePayment(id, adminNotes = null) {
        try {
            const updateData = {
                status: 'paid',
                paid_at: new Date(),
                notes: adminNotes ? `${adminNotes} (Approved by admin)` : 'Approved by admin'
            };
            
            const result = await TenantPaymentRepository.update(id, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async rejectPayment(id, rejectionReason = null) {
        try {
            const updateData = {
                status: 'failed',
                notes: rejectionReason ? `Rejected: ${rejectionReason}` : 'Rejected by admin'
            };
            
            const result = await TenantPaymentRepository.update(id, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPaymentStats() {
        try {
            const stats = await TenantPaymentRepository.getPaymentStats();
            return stats;
        } catch (error) {
            console.error('❌ TenantPaymentService.getPaymentStats - Error:', error);
            return {
                by_status: [],
                total: { total_count: 0, total_amount: 0 }
            };
        }
    };

    static async getTabStats() {
        try {
            console.log('🔍 TenantPaymentService.getTabStats - Getting tab statistics');
            const stats = await TenantPaymentRepository.getTabStats();
            console.log('✅ TenantPaymentService.getTabStats - Stats:', stats);
            return stats;
        } catch (error) {
            console.error('❌ TenantPaymentService.getTabStats - Error:', error);
            return {
                unpaid: { count: 0, total_amount: 0 },
                pending: { count: 0, total_amount: 0 },
                paid: { count: 0, total_amount: 0 },
                total: { count: 0, total_amount: 0 }
            };
        }
    };

    static async update(id, data) {
        try {
            // Validate payment exists
            const existingPayment = await TenantPaymentRepository.getById(id);
            if (!existingPayment) throw new Error('Tenant payment not found');

            // Validate amount if provided
            if (data.amount !== undefined && data.amount <= 0) {
                throw new Error('Amount must be positive');
            }

            // Validate due date if provided
            if (data.due_date) {
                const dueDate = moment(data.due_date);
                if (!dueDate.isValid()) {
                    throw new Error('Invalid due date format');
                }
            }

            // Prepare update data
            const updateData = {};
            if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
            if (data.status !== undefined) updateData.status = data.status;
            if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
            if (data.payment_reference !== undefined) updateData.payment_reference = data.payment_reference;
            if (data.payment_gateway !== undefined) updateData.payment_gateway = data.payment_gateway;
            if (data.paid_at !== undefined) updateData.paid_at = data.paid_at ? moment(data.paid_at).toDate() : null;
            if (data.due_date !== undefined) updateData.due_date = moment(data.due_date).toDate();
            if (data.invoice_number !== undefined) updateData.invoice_number = data.invoice_number;
            if (data.receipt_url !== undefined) updateData.receipt_url = data.receipt_url;
            if (data.notes !== undefined) updateData.notes = data.notes;
            if (data.bank_name !== undefined) updateData.bank_name = data.bank_name;
            if (data.account_number !== undefined) updateData.account_number = data.account_number;
            if (data.account_holder !== undefined) updateData.account_holder = data.account_holder;
            if (data.payment_code !== undefined) updateData.payment_code = data.payment_code;

            const result = await TenantPaymentRepository.update(id, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        try {
            const result = await TenantPaymentRepository.delete(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getBySubscription(subscription_id) {
        try {
            const result = await TenantPaymentRepository.getBySubscription(subscription_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByTenant(tenant_id, statusFilter = null) {
        try {
            const result = await TenantPaymentRepository.getByTenant(tenant_id, statusFilter);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPendingPayments() {
        try {
            const result = await TenantPaymentRepository.getPendingPayments();
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getOverduePayments() {
        try {
            const result = await TenantPaymentRepository.getOverduePayments();
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateStatus(id, status) {
        try {
            const validStatuses = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid payment status');
            }

            const result = await TenantPaymentRepository.updateStatus(id, status);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async markAsPaid(id, paymentData) {
        try {
            const payment = await TenantPaymentRepository.getById(id);
            if (!payment) throw new Error('Tenant payment not found');

            if (payment.status === 'paid') {
                throw new Error('Payment is already marked as paid');
            }

            const updateData = {
                status: 'paid',
                paid_at: new Date(),
                payment_reference: paymentData.payment_reference || payment.payment_reference,
                payment_gateway: paymentData.payment_gateway || payment.payment_gateway,
                receipt_url: paymentData.receipt_url || payment.receipt_url,
                notes: paymentData.notes ? 
                    (payment.notes ? `${payment.notes}\n${paymentData.notes}` : paymentData.notes) : 
                    payment.notes
            };

            const result = await TenantPaymentRepository.update(id, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async refundPayment(id, reason = '') {
        try {
            const payment = await TenantPaymentRepository.getById(id);
            if (!payment) throw new Error('Tenant payment not found');

            if (payment.status !== 'paid') {
                throw new Error('Only paid payments can be refunded');
            }

            const updateData = {
                status: 'refunded',
                notes: payment.notes ? 
                    `${payment.notes}\nRefunded: ${reason}` : 
                    `Refunded: ${reason}`
            };

            const result = await TenantPaymentRepository.update(id, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPaymentStats(id) {
        try {
            const result = await TenantPaymentRepository.getPaymentStats(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };
}

module.exports = TenantPaymentService;
