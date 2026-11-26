const { FinanceTransaction, FinanceAccount, FinanceCategory, Op, sequelize } = require('../models');
const FinanceTransactionRepository = require('../repositories/financeTransactionRepository');
const FinanceAccountRepository = require('../repositories/financeAccountRepository');
const moment = require('moment');

class FinanceTransferService {
    // Helper function to get account where clause
    static getAccountWhereClause(accountId, tenantId, branchId) {
        const whereClause = {
            id: accountId,
            tenant_id: tenantId,
            is_active: true
        };

        if (branchId) {
            whereClause[Op.or] = [
                { branch_id: branchId },
                { branch_id: { [Op.is]: null } },
                { is_global: true }
            ];
        }

        return whereClause;
    }

    static async create(data) {
        const transaction = await sequelize.transaction();

        try {
            const { from_account_id, to_account_id, amount, description, tenant_id, branch_id } = data;

            console.log('🔍 FinanceTransferService - Transfer request:', {
                from_account_id,
                to_account_id,
                amount,
                tenant_id,
                branch_id
            });

            // Validate source account exists and belongs to tenant
            const fromAccountWhere = FinanceTransferService.getAccountWhereClause(from_account_id, tenant_id, branch_id);

            const fromAccount = await FinanceAccount.findOne({
                where: fromAccountWhere
            });

            console.log('🔍 FinanceTransferService - From account found:', fromAccount ? {
                id: fromAccount.id,
                name: fromAccount.name,
                branch_id: fromAccount.branch_id,
                is_global: fromAccount.is_global
            } : null);

            if (!fromAccount) {
                throw new Error('Source account not found or access denied');
            }

            // Validate destination account exists and belongs to tenant
            const toAccountWhere = FinanceTransferService.getAccountWhereClause(to_account_id, tenant_id, branch_id);

            const toAccount = await FinanceAccount.findOne({
                where: toAccountWhere
            });

            console.log('🔍 FinanceTransferService - To account found:', toAccount ? {
                id: toAccount.id,
                name: toAccount.name,
                branch_id: toAccount.branch_id,
                is_global: toAccount.is_global
            } : null);

            if (!toAccount) {
                throw new Error('Destination account not found or access denied');
            }

            // Check if source account has sufficient balance
            if (parseFloat(fromAccount.balance) < parseFloat(amount)) {
                throw new Error(`Insufficient balance. Available: ${fromAccount.balance}, Required: ${amount}`);
            }

            // Get transfer category (use existing "Transfer & Penyesuaian" category from default data)
            const transferCategory = await FinanceCategory.findOne({
                where: {
                    name: 'Transfer & Penyesuaian',
                    tenant_id,
                    type: 'neutral' // Use neutral type for transfers
                }
            });

            if (!transferCategory) {
                throw new Error('Transfer category not found. Please create "Transfer & Penyesuaian" category first.');
            }

            const transferDate = moment().format('YYYY-MM-DD HH:mm:ss');
            const transferDescription = description || `Transfer dari ${fromAccount.name} ke ${toAccount.name}`;

            // Create outgoing transaction (debit from source account)
            const outgoingTransaction = await FinanceTransactionRepository.create(
                from_account_id,
                transferCategory.id,
                parseFloat(amount),
                parseFloat(amount), // final_amount same as amount for transfers
                `Transfer Keluar: ${transferDescription}`,
                transferDate,
                tenant_id,
                branch_id,
                transaction
            );

            // Create incoming transaction (credit to destination account)
            const incomingTransaction = await FinanceTransactionRepository.create(
                to_account_id,
                transferCategory.id,
                parseFloat(amount),
                parseFloat(amount), // final_amount same as amount for transfers
                `Transfer Masuk: ${transferDescription}`,
                transferDate,
                tenant_id,
                branch_id,
                transaction
            );

            // Update source account balance (subtract)
            const newFromBalance = parseFloat(fromAccount.balance) - parseFloat(amount);
            await FinanceAccountRepository.updateBalance(
                from_account_id,
                newFromBalance,
                tenant_id,
                transaction
            );

            // Update destination account balance (add)
            const newToBalance = parseFloat(toAccount.balance) + parseFloat(amount);
            await FinanceAccountRepository.updateBalance(
                to_account_id,
                newToBalance,
                tenant_id,
                transaction
            );

            await transaction.commit();

            return {
                transfer_id: outgoingTransaction.id,
                from_account: {
                    id: fromAccount.id,
                    name: fromAccount.name,
                    old_balance: fromAccount.balance,
                    new_balance: newFromBalance
                },
                to_account: {
                    id: toAccount.id,
                    name: toAccount.name,
                    old_balance: toAccount.balance,
                    new_balance: newToBalance
                },
                amount: parseFloat(amount),
                description: transferDescription,
                date: transferDate,
                outgoing_transaction_id: outgoingTransaction.id,
                incoming_transaction_id: incomingTransaction.id
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to create transfer: ${error.message}`);
        }
    }

    static async getHistory(filters) {
        try {
            const { tenant_id, branch_id, page, limit, from_account_id, to_account_id } = filters;

            let whereClause = {
                tenant_id,
                description: {
                    [Op.like]: '%Transfer%'
                }
            };

            // Add branch filter if specified
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Add account filters if specified
            if (from_account_id) {
                whereClause.account_id = from_account_id;
            }

            const offset = (page - 1) * limit;

            const { count, rows: transactions } = await FinanceTransaction.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['id', 'name', 'balance']
                    },
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: ['id', 'name', 'type']
                    }
                ],
                order: [['date', 'DESC']],
                offset,
                limit,
                subQuery: false
            });

            const totalPages = Math.ceil(count / limit);

            return {
                transfers: transactions,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            throw new Error(`Failed to get transfer history: ${error.message}`);
        }
    }
}

module.exports = FinanceTransferService;
