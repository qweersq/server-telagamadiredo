const FinanceTransactionRepository = require('../repositories/financeTransactionRepository');
const { FinanceAccount, FinanceCategory, Op } = require('../models');

class FinanceTransactionService {
    static async create(account_id, category_id, amount, final_amount, description, date, tenant_id, branch_id) {
        try {
            // Validate account belongs to tenant
            const account = await FinanceAccount.findOne({
                where: { 
                    id: account_id, 
                    tenant_id,
                    [Op.or]: [
                        { branch_id: branch_id },
                        { is_global: true }
                    ]
                }
            });

            if (!account) {
                throw new Error('Finance account not found or access denied');
            }

            // Validate category belongs to tenant
            const category = await FinanceCategory.findOne({
                where: { id: category_id, tenant_id }
            });

            if (!category) {
                throw new Error('Finance category not found or access denied');
            }

            const financeTransaction = await FinanceTransactionRepository.create(
                account_id, 
                category_id, 
                amount, 
                final_amount, 
                description, 
                date, 
                tenant_id, 
                branch_id
            );

            return financeTransaction;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id, branch_id, page = 1, limit = 10, search = null, type = null, startDate = null, endDate = null) {
        try {
            const result = await FinanceTransactionRepository.getAll(
                tenant_id, 
                branch_id, 
                page, 
                limit, 
                search, 
                type, 
                startDate, 
                endDate
            );

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id, branch_id) {
        try {
            const financeTransaction = await FinanceTransactionRepository.getById(id, tenant_id, branch_id);

            return financeTransaction;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, account_id, category_id, amount, final_amount, description, date, is_checked, tenant_id, branch_id) {
        try {
            // Validate account belongs to tenant
            const account = await FinanceAccount.findOne({
                where: { 
                    id: account_id, 
                    tenant_id,
                    [Op.or]: [
                        { branch_id: branch_id },
                        { is_global: true }
                    ]
                }
            });

            if (!account) {
                throw new Error('Finance account not found or access denied');
            }

            // Validate category belongs to tenant
            const category = await FinanceCategory.findOne({
                where: { id: category_id, tenant_id }
            });

            if (!category) {
                throw new Error('Finance category not found or access denied');
            }

            const financeTransaction = await FinanceTransactionRepository.update(
                id, 
                account_id, 
                category_id, 
                amount, 
                final_amount, 
                description, 
                date, 
                is_checked, 
                tenant_id, 
                branch_id
            );

            return financeTransaction;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id, branch_id) {
        try {
            const financeTransaction = await FinanceTransactionRepository.delete(id, tenant_id, branch_id);

            return financeTransaction;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = FinanceTransactionService;