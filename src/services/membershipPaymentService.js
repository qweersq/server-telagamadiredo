const MembershipPaymentRepository = require('../repositories/membershipPaymentRepository');
const PaymentRepository = require('../repositories/paymentRepository');
const PaymentDetailRepository = require('../repositories/paymentDetailRepository');
const FinanceTransactionRepository = require('../repositories/financeTransactionRepository');
const FinanceAccountRepository = require('../repositories/financeAccountRepository');
const CustomerMembershipRepository = require('../repositories/customerMembershipRepository');
const { sequelize } = require('../models');
const moment = require('moment');

class MembershipPaymentService {
    /**
     * Create membership payment
     */
    static async create(data) {
        // Set transaction timeout to prevent long locks
        const transaction = await sequelize.transaction({
            timeout: 30000 // 30 seconds timeout
        });
        
        try {
            console.log('🔍 MembershipPaymentService.create - Starting transaction');
            console.log('🔍 MembershipPaymentService.create - Data:', data);

            // 1. Validate membership exists and get details
            const membership = await this.validateMembership(data.membership_id, data.user_tenant_id);
            if (!membership) {
                throw new Error('Membership tidak ditemukan');
            }

            // 2. Validate customer exists
            const customer = await this.validateCustomer(data.customer_id, data.user_tenant_id);
            if (!customer) {
                throw new Error('Customer tidak ditemukan');
            }

            // 3. Validate finance account exists and belongs to tenant
            const financeAccount = await this.validateFinanceAccount(data.finance_account_id, data.user_tenant_id);
            if (!financeAccount) {
                throw new Error('Finance account tidak ditemukan atau tidak memiliki akses');
            }

            // 4. Validate shift exists and is active
            const shift = await this.validateShift(data.shift_id, data.user_tenant_id);
            if (!shift) {
                throw new Error('Shift tidak ditemukan atau tidak aktif');
            }

            // 5. Validate payment amount
            const membershipPrice = parseFloat(membership.price);
            const paymentAmount = parseFloat(data.amount);
            
            if (paymentAmount <= 0) {
                throw new Error('Nominal pembayaran harus lebih dari 0');
            }
            
            if (paymentAmount < membershipPrice) {
                throw new Error(`Nominal pembayaran tidak boleh kurang dari harga membership (${membershipPrice.toLocaleString()})`);
            }
            
            if (paymentAmount > membershipPrice) {
                throw new Error(`Nominal pembayaran tidak boleh lebih dari harga membership (${membershipPrice.toLocaleString()}). Pembayaran lebih tidak diperbolehkan untuk membership.`);
            }

            // 6. Generate payment code
            const paymentCode = await this.generatePaymentCode();

            // 7. Create Payment header
            const paymentData = {
                code: paymentCode,
                status: 'paid', // Membership always paid in full
                final_price: data.amount,
                subtotal: data.amount,
                total_discount: 0,
                additional_cost: 0,
                paid_amount: data.amount,
                remaining_amount: 0, // Always fully paid
                due_date: null, // No due date for membership
                notes: data.notes || `Membership ${membership.name} - ${customer.name}`,
                tenant_id: data.user_tenant_id,
                branch_id: data.branch_id || null, // Add branch_id from request
                // Required fields for payments table
                total_service: 1, // 1 membership service
                total_process_time_cost: 0,
                total_price: data.amount
            };

            console.log('🔍 MembershipPaymentService.create - Creating payment:', paymentData);
            const newPayment = await PaymentRepository.create(paymentData, transaction);

            // 6. Get account name for description
            const accountName = await this.getAccountName(data.finance_account_id, data.user_tenant_id, data.user_branch_id);

            // 7. Create Finance Transaction
            const financeTransactionData = {
                account_id: data.finance_account_id,
                is_checked: false,
                category_id: data.finance_category_id,
                type: 'debit', // Income
                amount: data.amount,
                total_fee: 0,
                final_amount: data.amount,
                description: `Uang Masuk: ${accountName} dari ${newPayment.code}`,
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                tenant_id: data.user_tenant_id,
                branch_id: data.user_branch_id
            };

            console.log('🔍 MembershipPaymentService.create - Creating finance transaction:', financeTransactionData);
            const newFinanceTransaction = await FinanceTransactionRepository.create(
                financeTransactionData.account_id,
                financeTransactionData.category_id,
                financeTransactionData.amount,
                financeTransactionData.final_amount,
                financeTransactionData.description,
                financeTransactionData.date,
                financeTransactionData.tenant_id,
                financeTransactionData.branch_id,
                transaction
            );

            // 8. Create Payment Detail
            const paymentMethodCode = await this.getPaymentMethodFromId(data.payment_method_id);
            const paymentDetailData = {
                payment_id: newPayment.id,
                transaction_id: newFinanceTransaction.id,
                method: paymentMethodCode,
                amount: data.amount,
                fee: 0,
                interest: 0,
                final_amount: data.amount,
                evidence_photo: null,
                finance_account_id: data.finance_account_id,
                finance_category_id: data.finance_category_id,
                shift_id: data.shift_id,
                payment_method_id: data.payment_method_id,
                date: moment().format('YYYY-MM-DD HH:mm:ss')
            };

            console.log('🔍 MembershipPaymentService.create - Creating payment detail:', paymentDetailData);
            const newPaymentDetail = await PaymentDetailRepository.create(paymentDetailData, transaction);

            // 9. Update finance account balance (moved after customer membership creation to reduce lock time)
            const currentBalance = parseFloat(financeAccount.balance);
            const newBalance = currentBalance + parseFloat(data.amount);
            console.log('🔍 MembershipPaymentService.create - Will update balance:', { currentBalance, newBalance });

            // 10. Calculate membership dates
            const startDate = moment().format('YYYY-MM-DD');
            const endDate = moment().add(membership.duration_days, 'days').format('YYYY-MM-DD');

            // 11. Create Customer Membership
            const customerMembershipData = {
                customer_id: data.customer_id,
                membership_id: data.membership_id,
                payment_id: newPayment.id, // Link to payment
                start_date: startDate,
                end_date: endDate,
                status: 'active',
                tenant_id: data.user_tenant_id,
                branch_id: data.user_branch_id
            };

            console.log('🔍 MembershipPaymentService.create - Creating customer membership:', customerMembershipData);
            const newCustomerMembership = await CustomerMembershipRepository.create(customerMembershipData, transaction);
            console.log('✅ MembershipPaymentService.create - Customer membership created:', newCustomerMembership.id);

            // 12. Update customer's current membership
            console.log('🔍 MembershipPaymentService.create - Updating customer current membership');
            await this.updateCustomerCurrentMembership(data.customer_id, newCustomerMembership.id, data.user_tenant_id, transaction);
            console.log('✅ MembershipPaymentService.create - Customer current membership updated');

            // 13. Update finance account balance (moved here to reduce lock contention)
            console.log('🔍 MembershipPaymentService.create - Updating balance:', { currentBalance, newBalance });
            await FinanceAccountRepository.updateBalance(data.finance_account_id, newBalance, data.user_tenant_id, transaction);
            console.log('✅ MembershipPaymentService.create - Balance updated');

            // 14. Commit transaction
            console.log('🔍 MembershipPaymentService.create - Committing transaction');
            await transaction.commit();
            console.log('✅ MembershipPaymentService.create - Transaction committed successfully');

            // 12. Return result with all related data
            const result = {
                id: newCustomerMembership.id,
                customer_membership: newCustomerMembership,
                payment: newPayment,
                payment_detail: newPaymentDetail,
                finance_transaction: newFinanceTransaction,
                membership: membership,
                customer: customer,
                finance_account: financeAccount,
                start_date: startDate,
                end_date: endDate,
                duration_days: membership.duration_days,
                discount_percentage: membership.discount_percentage
            };

            console.log('✅ MembershipPaymentService.create - Success:', result.id);
            return result;

        } catch (error) {
            console.error('❌ MembershipPaymentService.create - Error:', error);
            await transaction.rollback();
            
            // Check if it's a lock timeout error and suggest retry
            if (error.message.includes('Lock wait timeout') || error.message.includes('Deadlock found')) {
                throw new Error(`Database sedang sibuk. Silakan coba lagi dalam beberapa detik. Error: ${error.message}`);
            }
            
            throw new Error(`Gagal membuat membership payment: ${error.message}`);
        }
    }

    /**
     * Get all membership payments
     */
    static async getAll(filters) {
        try {
            return await MembershipPaymentRepository.getAll(filters);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get membership payment by ID
     */
    static async getById(id, user_tenant_id, user_branch_id, user_role) {
        try {
            return await MembershipPaymentRepository.getById(id, user_tenant_id, user_branch_id, user_role);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Validate membership exists and belongs to tenant
     */
    static async validateMembership(membershipId, tenantId) {
        const { Membership } = require('../models');
        return await Membership.findOne({
            where: {
                id: membershipId,
                tenant_id: tenantId,
                is_active: true
            }
        });
    }

    /**
     * Validate shift exists and is active
     */
    static async validateShift(shiftId, tenantId) {
        const { Shift } = require('../models');
        return await Shift.findOne({
            where: {
                id: shiftId,
                tenant_id: tenantId,
                end_time: null // Active shift has no end_time
            }
        });
    }

    /**
     * Validate customer exists and belongs to tenant
     */
    static async validateCustomer(customerId, tenantId) {
        const { Customer } = require('../models');
        return await Customer.findOne({
            where: {
                id: customerId,
                tenant_id: tenantId
            }
        });
    }

    /**
     * Validate finance account exists and belongs to tenant
     */
    static async validateFinanceAccount(accountId, tenantId) {
        const { FinanceAccount } = require('../models');
        return await FinanceAccount.findOne({
            where: {
                id: accountId,
                tenant_id: tenantId,
                is_active: true
            }
        });
    }

    /**
     * Get account name for description
     */
    static async getAccountName(accountId, tenantId, branchId = null) {
        const { FinanceAccount, Op } = require('../models');
        const whereClause = {
            id: accountId,
            tenant_id: tenantId
        };
        
        if (branchId) {
            whereClause[Op.or] = [
                { branch_id: branchId },
                { is_global: true },
                { branch_id: null }
            ];
        }
        
        const account = await FinanceAccount.findOne({
            where: whereClause
        });
        return account ? account.name : 'Unknown Account';
    }

    /**
     * Generate unique payment code
     */
    static async generatePaymentCode() {
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `MEM${timestamp}${random}`;
    }

    /**
     * Get payment method string from payment method ID
     */
    static async getPaymentMethodFromId(paymentMethodId) {
        const { PaymentMethod } = require('../models');
        const paymentMethod = await PaymentMethod.findByPk(paymentMethodId);
        return paymentMethod ? paymentMethod.code : 'cash';
    }

    /**
     * Update customer's current membership
     */
    static async updateCustomerCurrentMembership(customerId, membershipId, tenantId, transaction) {
        const { Customer } = require('../models');
        await Customer.update(
            { current_membership_id: membershipId },
            {
                where: {
                    id: customerId,
                    tenant_id: tenantId
                },
                transaction
            }
        );
    }

    /**
     * Delete membership payment (soft delete)
     */
    static async delete(id, user_tenant_id, user_branch_id) {
        const transaction = await sequelize.transaction();
        
        try {
            console.log('🔍 MembershipPaymentService.delete - Starting transaction for ID:', id);
            
            // 1. Get customer membership with related data
            const customerMembership = await CustomerMembershipRepository.getById(id, user_tenant_id, user_branch_id);
            if (!customerMembership) {
                throw new Error('Customer membership not found');
            }
            
            console.log('🔍 MembershipPaymentService.delete - Found customer membership:', customerMembership.id);
            
            // 2. Get payment details
            const paymentDetails = await PaymentDetailRepository.getByPaymentId(customerMembership.payment_id);
            console.log('🔍 MembershipPaymentService.delete - Found payment details:', paymentDetails.length);
            
            // 3. Process each payment detail for balance reversal
            for (const detail of paymentDetails) {
                if (detail.transaction_id) {
                    // Get finance transaction
                    const financeTransaction = await FinanceTransactionRepository.getById(
                        detail.transaction_id, 
                        user_tenant_id, 
                        user_branch_id, 
                        transaction
                    );
                    
                    if (financeTransaction) {
                        console.log('🔍 MembershipPaymentService.delete - Processing finance transaction:', financeTransaction.id);
                        
                        // Reverse balance (subtract amount since it was income)
                        const financeAccount = await FinanceAccountRepository.getById(
                            financeTransaction.account_id, 
                            user_tenant_id, 
                            user_branch_id, 
                            transaction
                        );
                        
                        if (financeAccount) {
                            const currentBalance = parseFloat(financeAccount.balance || 0);
                            const newBalance = currentBalance - parseFloat(financeTransaction.amount);
                            
                            console.log('🔍 MembershipPaymentService.delete - Reversing balance:', {
                                currentBalance,
                                amount: financeTransaction.amount,
                                newBalance
                            });
                            
                            await FinanceAccountRepository.updateBalance(
                                financeTransaction.account_id, 
                                newBalance, 
                                user_tenant_id, 
                                transaction
                            );
                        }
                        
                        // Soft delete finance transaction
                        await FinanceTransactionRepository.delete(
                            financeTransaction.id, 
                            user_tenant_id, 
                            user_branch_id, 
                            transaction
                        );
                        console.log('✅ MembershipPaymentService.delete - Soft deleted finance transaction:', financeTransaction.id);
                    }
                }
            }
            
            // 4. Soft delete Payment dan PaymentDetails secara eksplisit
            if (customerMembership.payment_id) {
                console.log('🔍 MembershipPaymentService.delete - Soft deleting payment:', customerMembership.payment_id);
                
                // Soft delete Payment
                await PaymentRepository.delete(customerMembership.payment_id, transaction);
                console.log('✅ MembershipPaymentService.delete - Soft deleted payment:', customerMembership.payment_id);
                
                // Soft delete PaymentDetails
                const paymentDetailIds = paymentDetails.map(detail => detail.id);
                if (paymentDetailIds.length > 0) {
                    console.log('🔍 MembershipPaymentService.delete - Soft deleting payment details:', paymentDetailIds);
                    await PaymentDetailRepository.bulkDelete(paymentDetailIds, transaction);
                    console.log('✅ MembershipPaymentService.delete - Soft deleted payment details:', paymentDetailIds);
                }
            }
            
            // 5. Soft delete customer membership
            await CustomerMembershipRepository.delete(id, transaction);
            console.log('✅ MembershipPaymentService.delete - Soft deleted customer membership:', id);
            
            // 6. Reset customer's current membership
            await this.resetCustomerCurrentMembership(customerMembership.customer_id, user_tenant_id, transaction);
            console.log('✅ MembershipPaymentService.delete - Reset customer current membership');
            
            await transaction.commit();
            console.log('✅ MembershipPaymentService.delete - Transaction committed successfully');
            
            return { message: 'Membership payment deleted successfully', membership_id: id };
            
        } catch (error) {
            await transaction.rollback();
            console.error('❌ MembershipPaymentService.delete - Error:', error.message);
            throw new Error(`Failed to delete membership payment: ${error.message}`);
        }
    }

    /**
     * Reset customer's current membership
     */
    static async resetCustomerCurrentMembership(customerId, tenantId, transaction) {
        const { Customer } = require('../models');
        await Customer.update(
            { current_membership_id: null },
            {
                where: {
                    id: customerId,
                    tenant_id: tenantId
                },
                transaction
            }
        );
    }
}

module.exports = MembershipPaymentService;
