const ExpenseRepository = require('../repositories/expenseRepository');
const FinanceTransactionRepository = require('../repositories/financeTransactionRepository');
const FinanceAccountRepository = require('../repositories/financeAccountRepository');

const { sequelize } = require('../models');
const moment = require('moment');

class ExpenseService {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            if (isNaN(data.user_id) || data.user_id <= 0) throw new Error('Invalid ID');
            if (!data.amount || data.amount <= 0) throw new Error('Invalid amount');
            if (!data.finance_account_id) throw new Error('Finance account type is required');
            if (!data.finance_category_id) throw new Error('Finance category type is required');

            const expenseDate = data.date ? moment(data.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');

            const financeTransactionData = {
                account_id: data.finance_account_id,
                category_id: data.finance_category_id,
                amount: data.amount,
                total_fee: 0,
                final_amount: data.amount,
                description: `Uang Keluar: ${data.name}`,
                date: expenseDate,
                is_checked: false,
                status: 'completed',
                tenant_id: data.tenant_id,
                branch_id: data.branch_id
            };
            const financeTransaction = await FinanceTransactionRepository.create(
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
            const expenseData = {
                ...data,
                date: expenseDate,
                transaction_id: financeTransaction.id,
                user_id: data.user_id,
                status: 'completed'
            };

            const newExpense = await ExpenseRepository.create(expenseData, transaction);

            // update finance account balance
            const financeAccount = await FinanceAccountRepository.getById(financeTransaction.account_id, data.tenant_id, data.branch_id, transaction);
            const newBalance = parseFloat(financeAccount.balance || 0) - parseFloat(data.amount);
            await FinanceAccountRepository.updateBalance(
                financeTransaction.account_id, 
                newBalance, 
                data.tenant_id, 
                transaction
            );
            await transaction.commit();

            return newExpense;
        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to create expense: ${error.message}`);
        }
    }

    static async createExpenseShift(data) {
        const transaction = await sequelize.transaction();
        try {
            console.log('🔍 ExpenseService.createExpenseShift - Starting with data:', data);
            
            if (isNaN(data.user_id) || data.user_id <= 0) throw new Error('Invalid ID');
            if (isNaN(data.shift_id) || data.shift_id <= 0) throw new Error('Invalid ID');

            // Use dynamic account_id from frontend, fallback to 2 if not provided
            const account_id = data.finance_account_id || 2;
            console.log('🔍 ExpenseService.createExpenseShift - Using account_id:', account_id);
            
            // Create finance transaction with correct parameters
            console.log('🔍 ExpenseService.createExpenseShift - Creating FinanceTransaction...');
            const financeTransaction = await FinanceTransactionRepository.create(
                account_id, // account_id (dynamic from frontend)
                2, // category_id (expense category)
                data.amount, // amount
                data.amount, // final_amount
                `Uang Keluar: ${data.name}`, // description
                moment(data.date).format('YYYY-MM-DD HH:mm:ss'), // date
                data.tenant_id, // tenant_id
                data.branch_id, // branch_id
                transaction
            );
            console.log('✅ ExpenseService.createExpenseShift - FinanceTransaction created with ID:', financeTransaction.id);

            const expenseData = {
                ...data,
                transaction_id: financeTransaction.id,
                status: 'completed',
                user_id: data.user_id,
                tenant_id: data.tenant_id,
                branch_id: data.branch_id
                // ✅ Removed payment_method - now using finance_account.payment_method_id as single source of truth
            };
            console.log('🔍 ExpenseService.createExpenseShift - Creating Expense...');
            const newExpense = await ExpenseRepository.create(expenseData, transaction);
            console.log('✅ ExpenseService.createExpenseShift - Expense created with ID:', newExpense.id);

            // update finance account balance
            console.log('🔍 ExpenseService.createExpenseShift - Getting FinanceAccount...');
            console.log('🔍 ExpenseService.createExpenseShift - Parameters:', {
                account_id: financeTransaction.account_id,
                tenant_id: data.tenant_id,
                branch_id: data.branch_id
            });
            const financeAccount = await FinanceAccountRepository.getById(financeTransaction.account_id, data.tenant_id, data.branch_id, transaction);
            if (!financeAccount) {
                console.error('❌ ExpenseService.createExpenseShift - Finance account not found!');
                throw new Error('Finance account not found');
            }
            console.log('✅ ExpenseService.createExpenseShift - FinanceAccount found:', {
                id: financeAccount.id,
                name: financeAccount.name,
                balance: financeAccount.balance
            });
            
            const newBalance = parseFloat(financeAccount.balance || 0) - parseFloat(data.amount);
            console.log('🔍 ExpenseService.createExpenseShift - Updating balance:', {
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
            console.log('✅ ExpenseService.createExpenseShift - Balance updated successfully');

            await transaction.commit();
            console.log('✅ ExpenseService.createExpenseShift - Transaction committed successfully');
            
            // ✅ Get expense with finance account and payment method for response
            const expenseWithPaymentMethod = await ExpenseRepository.getByIdWithFinanceAccount(newExpense.id);
            return expenseWithPaymentMethod;
        } catch (error) {
            console.error('❌ ExpenseService.createExpenseShift - Error:', error.message);
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getAll({ page, pageSize, startDate, endDate, search, tenant_id, branch_id }) {
        try {
            if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new Error('Start date cannot be later than end date');

            const { statistics, expenses, pagination } = await ExpenseRepository.getAll({ 
                page, 
                pageSize, 
                startDate, 
                endDate, 
                search, 
                tenant_id, 
                branch_id 
            });

            return { statistics, expenses, pagination };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getExpenseOption() {
        try {
            const { expenseNames, expenseCategories } = await ExpenseRepository.getExpenseOption();

            const data = {
                names: expenseNames.map(expense => ({ value: expense.name, label: expense.name })),
                categories: [],
            };

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByShift(id) {
        try {
            const { expenses, totalAmount } = await ExpenseRepository.getByShift(id);

            return { expenses, totalAmount };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await ExpenseRepository.getById(id);
            if (!result) throw new Error('Expense not found');

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

            const oldExpense = await ExpenseRepository.getById(data.id, transaction);
            if (!oldExpense) throw new Error('Expense not found');

            const result = await ExpenseRepository.update(data.id, data, transaction);

            // update finance transaction
            const financeTransaction = await FinanceTransactionRepository.getById(oldExpense.transaction_id, data.tenant_id, data.branch_id, transaction);
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

            // update finance account balance
            const oldAccountId = financeTransaction.account_id;
            const newAccountId = data.finance_account_id || oldAccountId;
            
            // Rebalance old account (add back the old amount)
            const oldFinanceAccount = await FinanceAccountRepository.getById(oldAccountId, data.tenant_id, data.branch_id, transaction);
            const oldAccountNewBalance = parseFloat(oldFinanceAccount.balance) + parseFloat(oldExpense.amount);
            await FinanceAccountRepository.updateBalance(
                oldAccountId, 
                oldAccountNewBalance, 
                data.tenant_id, 
                transaction
            );
            
            // Rebalance new account (subtract the new amount)
            if (newAccountId !== oldAccountId) {
                const newFinanceAccount = await FinanceAccountRepository.getById(newAccountId, data.tenant_id, data.branch_id, transaction);
                const newAccountNewBalance = parseFloat(newFinanceAccount.balance) - parseFloat(data.amount);
                await FinanceAccountRepository.updateBalance(
                    newAccountId, 
                    newAccountNewBalance, 
                    data.tenant_id, 
                    transaction
                );
            } else {
                // Same account, just adjust the balance
                const newBalance = oldAccountNewBalance - parseFloat(data.amount);
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

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            console.log('🔍 ExpenseService.delete - Starting delete for ID:', id);
            
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            // Get expense data first
            console.log('🔍 ExpenseService.delete - Getting expense data...');
            const expense = await ExpenseRepository.getById(id, transaction);
            if (!expense) throw new Error('Expense not found');
            console.log('✅ ExpenseService.delete - Found expense:', { id: expense.id, transaction_id: expense.transaction_id, tenant_id: expense.tenant_id, branch_id: expense.branch_id });

            // Get finance transaction
            console.log('🔍 ExpenseService.delete - Getting finance transaction...');
            const financeTransaction = await FinanceTransactionRepository.getById(
                expense.transaction_id, 
                expense.tenant_id, 
                expense.branch_id, 
                transaction
            );
            
            if (financeTransaction) {
                console.log('✅ ExpenseService.delete - Found finance transaction:', { id: financeTransaction.id, account_id: financeTransaction.account_id });
                
                // Restore finance account balance
                console.log('🔍 ExpenseService.delete - Restoring finance account balance...');
                const financeAccount = await FinanceAccountRepository.getById(
                    financeTransaction.account_id, 
                    expense.tenant_id, 
                    expense.branch_id, 
                    transaction
                );
                
                if (financeAccount) {
                    const newBalance = parseFloat(financeAccount.balance || 0) + parseFloat(expense.amount);
                    console.log('🔍 ExpenseService.delete - Updating balance from', financeAccount.balance, 'to', newBalance);
                    await FinanceAccountRepository.updateBalance(
                        financeTransaction.account_id, 
                        newBalance, 
                        expense.tenant_id, 
                        transaction
                    );
                }
            } else {
                console.log('❌ ExpenseService.delete - Finance transaction not found');
            }

            // Soft delete expense
            console.log('🔍 ExpenseService.delete - Soft deleting expense...');
            await ExpenseRepository.delete(id, transaction);
            console.log('✅ ExpenseService.delete - Expense soft deleted successfully');

            // Soft delete finance transaction
            if (financeTransaction) {
                console.log('🔍 ExpenseService.delete - Soft deleting finance transaction...');
                await FinanceTransactionRepository.delete(
                    financeTransaction.id, 
                    expense.tenant_id, 
                    expense.branch_id,
                    transaction
                );
                console.log('✅ ExpenseService.delete - Finance transaction soft deleted successfully');
            }

            await transaction.commit();
            console.log('✅ ExpenseService.delete - Transaction committed successfully');
            return null;
        } catch (error) {
            console.log('❌ ExpenseService.delete - Error occurred:', error.message);
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
};

module.exports = ExpenseService;