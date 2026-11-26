const IncomeRepository = require('../repositories/incomeRepository');
const FinanceTransactionRepository = require('../repositories/financeTransactionRepository');
const FinanceAccountRepository = require('../repositories/financeAccountRepository');

const { sequelize } = require('../models');
const moment = require('moment');

class IncomeService {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            console.log('🔍 IncomeService.create - Starting with data:', data);

            if (isNaN(data.user_id) || data.user_id <= 0) throw new Error('Invalid user ID');
            if (!data.amount || data.amount <= 0) throw new Error('Invalid amount');
            if (!data.finance_account_id) throw new Error('Finance account is required');
            if (!data.finance_category_id) throw new Error('Finance category is required');

            const incomeDate = data.date ? moment(data.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');

            // Create finance transaction - "Uang Masuk" instead of "Uang Keluar"
            console.log('🔍 IncomeService.create - Creating FinanceTransaction...');
            const financeTransaction = await FinanceTransactionRepository.create(
                data.finance_account_id,
                data.finance_category_id,
                data.amount,
                data.amount,
                `Uang Masuk: ${data.name}`,
                incomeDate,
                data.tenant_id,
                data.branch_id,
                transaction
            );
            console.log('✅ IncomeService.create - FinanceTransaction created with ID:', financeTransaction.id);

            const incomeData = {
                ...data,
                date: incomeDate,
                transaction_id: financeTransaction.id,
                user_id: data.user_id,
                status: 'completed'
            };

            console.log('🔍 IncomeService.create - Creating Income record...');
            const newIncome = await IncomeRepository.create(incomeData, transaction);
            console.log('✅ IncomeService.create - Income created with ID:', newIncome.id);

            // Update finance account balance - ADD instead of subtract (difference from expense)
            console.log('🔍 IncomeService.create - Updating FinanceAccount balance...');
            const financeAccount = await FinanceAccountRepository.getById(
                financeTransaction.account_id,
                data.tenant_id,
                data.branch_id,
                transaction
            );

            if (!financeAccount) {
                throw new Error('Finance account not found');
            }

            // ADD balance for income (opposite of expense which subtracts)
            const newBalance = parseFloat(financeAccount.balance || 0) + parseFloat(data.amount);
            console.log('🔍 IncomeService.create - Balance update:', {
                oldBalance: financeAccount.balance,
                amount: data.amount,
                newBalance: newBalance
            });

            await FinanceAccountRepository.updateBalance(
                financeTransaction.account_id,
                newBalance,
                data.tenant_id,
                transaction
            );
            console.log('✅ IncomeService.create - Balance updated successfully');

            await transaction.commit();
            console.log('✅ IncomeService.create - Transaction committed successfully');

            const incomeWithPaymentMethod = await IncomeRepository.getByIdWithFinanceAccount(newIncome.id);
            return incomeWithPaymentMethod;
        } catch (error) {
            console.error('❌ IncomeService.create - Error:', error.message);
            await transaction.rollback();
            throw new Error(`Failed to create income: ${error.message}`);
        }
    }

    static async getAll({ page, pageSize, startDate, endDate, search, tenant_id, branch_id }) {
        try {
            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                throw new Error('Start date cannot be later than end date');
            }

            const { statistics, incomes, pagination } = await IncomeRepository.getAll({
                page,
                pageSize,
                startDate,
                endDate,
                search,
                tenant_id,
                branch_id
            });

            return { statistics, incomes, pagination };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await IncomeRepository.getById(id);
            if (!result) throw new Error('Income not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw) {
        const transaction = await sequelize.transaction();
        try {
            if (isNaN(raw.id) || raw.id <= 0) throw new Error('Invalid ID');

            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
            );

            if (data.date) data.date = moment(data.date).format('YYYY-MM-DD');

            const oldIncome = await IncomeRepository.getById(data.id, transaction);
            if (!oldIncome) throw new Error('Income not found');

            const result = await IncomeRepository.update(data.id, data, transaction);

            // Update finance transaction
            const financeTransaction = await FinanceTransactionRepository.getById(
                oldIncome.transaction_id,
                data.tenant_id,
                data.branch_id,
                transaction
            );

            await FinanceTransactionRepository.update(
                financeTransaction.id,
                data.finance_account_id || financeTransaction.account_id,
                data.finance_category_id || financeTransaction.category_id,
                data.amount,
                data.amount,
                data.description || financeTransaction.description,
                data.date || financeTransaction.date,
                financeTransaction.is_checked,
                data.tenant_id,
                data.branch_id
            );

            // Update finance account balance
            const oldAccountId = financeTransaction.account_id;
            const newAccountId = data.finance_account_id || oldAccountId;

            // Rebalance old account (subtract the old amount - reverse the income)
            const oldFinanceAccount = await FinanceAccountRepository.getById(oldAccountId, data.tenant_id, data.branch_id, transaction);
            const oldAccountNewBalance = parseFloat(oldFinanceAccount.balance) - parseFloat(oldIncome.amount);
            await FinanceAccountRepository.updateBalance(
                oldAccountId,
                oldAccountNewBalance,
                data.tenant_id,
                transaction
            );

            // Rebalance new account (add the new amount)
            if (newAccountId !== oldAccountId) {
                const newFinanceAccount = await FinanceAccountRepository.getById(newAccountId, data.tenant_id, data.branch_id, transaction);
                const newAccountNewBalance = parseFloat(newFinanceAccount.balance) + parseFloat(data.amount);
                await FinanceAccountRepository.updateBalance(
                    newAccountId,
                    newAccountNewBalance,
                    data.tenant_id,
                    transaction
                );
            } else {
                const newBalance = oldAccountNewBalance + parseFloat(data.amount);
                await FinanceAccountRepository.updateBalance(
                    oldAccountId,
                    newBalance,
                    data.tenant_id,
                    transaction
                );
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id, branch_id) {
        const transaction = await sequelize.transaction();
        try {
            console.log('🔍 IncomeService.delete - Starting delete for ID:', id);

            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const income = await IncomeRepository.getById(id, transaction);
            if (!income) throw new Error('Income not found');
            console.log('✅ IncomeService.delete - Found income:', { id: income.id, transaction_id: income.transaction_id });

            const financeTransaction = await FinanceTransactionRepository.getById(
                income.transaction_id,
                tenant_id || income.tenant_id,
                branch_id || income.branch_id,
                transaction
            );

            if (financeTransaction) {
                console.log('✅ IncomeService.delete - Found finance transaction, restoring balance...');

                const financeAccount = await FinanceAccountRepository.getById(
                    financeTransaction.account_id,
                    tenant_id || income.tenant_id,
                    branch_id || income.branch_id,
                    transaction
                );

                if (financeAccount) {
                    // SUBTRACT balance when deleting income (reverse of add)
                    const newBalance = parseFloat(financeAccount.balance || 0) - parseFloat(income.amount);
                    console.log('🔍 IncomeService.delete - Updating balance from', financeAccount.balance, 'to', newBalance);
                    await FinanceAccountRepository.updateBalance(
                        financeTransaction.account_id,
                        newBalance,
                        tenant_id || income.tenant_id,
                        transaction
                    );
                }
            }

            console.log('🔍 IncomeService.delete - Soft deleting income...');
            await IncomeRepository.delete(id, transaction);

            if (financeTransaction) {
                console.log('🔍 IncomeService.delete - Soft deleting finance transaction...');
                await FinanceTransactionRepository.delete(
                    financeTransaction.id,
                    tenant_id || income.tenant_id,
                    branch_id || income.branch_id,
                    transaction
                );
            }

            await transaction.commit();
            console.log('✅ IncomeService.delete - Transaction committed successfully');
            return null;
        } catch (error) {
            console.log('❌ IncomeService.delete - Error occurred:', error.message);
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
};

module.exports = IncomeService;
