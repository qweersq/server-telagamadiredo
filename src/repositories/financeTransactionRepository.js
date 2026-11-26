const { FinanceTransaction, FinanceAccount, FinanceCategory, Op } = require('../models');

class FinanceTransactionRepository {
    static async create(account_id, category_id, amount, final_amount, description, date, tenant_id, branch_id, transaction = null) {
        try {
            console.log('Creating finance transaction - tenant_id:', tenant_id, 'branch_id:', branch_id);

            const createData = {
                account_id,
                category_id,
                amount,
                final_amount,
                description,
                date,
                tenant_id,
                branch_id,
                is_checked: false
            };

            const result = await FinanceTransaction.create(createData, { transaction });

            return result;
        } catch (error) {
            console.error('FinanceTransaction.create error:', error);
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id, branch_id, page = 1, limit = 10, search = null, type = null, startDate = null, endDate = null) {
        try {
            const offset = (page - 1) * limit;
            
            // Build where clause
            const whereClause = { tenant_id };
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Add search filter
            if (search) {
                whereClause[Op.or] = [
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            // Add type filter
            if (type) {
                whereClause['$finance_category.type$'] = type;
            }

            // Add date range filter
            if (startDate && endDate) {
                whereClause.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                whereClause.date = {
                    [Op.gte]: startDate
                };
            } else if (endDate) {
                whereClause.date = {
                    [Op.lte]: endDate
                };
            }

            // Get total count
            const totalItems = await FinanceTransaction.count({
                where: whereClause,
                include: [
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: []
                    }
                ]
            });

            // Get transactions with pagination
            const transactions = await FinanceTransaction.findAll({
                where: whereClause,
                include: [
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['id', 'name'] // ✅ Remove payment_method_id (doesn't exist in finance_categories table)
                    },
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: ['id', 'name'] // ✅ Remove payment_method_id (doesn't exist in finance_categories table)
                    }
                ],
                order: [['date', 'DESC'], ['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                transactions,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id, branch_id, transaction = null) {
        try {
            const whereClause = { id, tenant_id };
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { branch_id: null }
                ];
            }

            const result = await FinanceTransaction.findOne({
                where: whereClause,
                include: [
                    {
                        model: FinanceAccount,
                        as: 'finance_account',
                        attributes: ['id', 'name'], // ✅ Remove payment_method_id (doesn't exist in finance_categories table)
                        include: [
                            {
                                model: require('../models').PaymentMethod,
                                as: 'payment_method',
                                attributes: ['id', 'name', 'code', 'type', 'icon']
                            }
                        ]
                    },
                    {
                        model: FinanceCategory,
                        as: 'finance_category',
                        attributes: ['id', 'name'] // ✅ Remove payment_method_id (doesn't exist in finance_categories table)
                    }
                ],
                transaction
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, account_id, category_id, amount, final_amount, description, date, is_checked, tenant_id, branch_id, transaction = null) {
        try {
            const whereClause = { id, tenant_id };
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { branch_id: null }
                ];
            }

            const getTransaction = await FinanceTransaction.findOne({ where: whereClause, transaction });
            if (!getTransaction) {
                throw new Error('Finance transaction not found');
            }

            const updateData = {
                account_id,
                category_id,
                amount,
                final_amount,
                description,
                date,
                is_checked
            };

            const result = await getTransaction.update(updateData, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id, branch_id, transaction = null) {
        try {
            // Buat where clause yang lebih sederhana
            const whereClause = { 
                id: id, 
                tenant_id: tenant_id 
            };
            
            // Jika branch_id diberikan, tambahkan kondisi untuk branch_id
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { branch_id: null }
                ];
            }

            console.log('🔍 FinanceTransactionRepository.delete - Where clause:', JSON.stringify(whereClause, null, 2));

            const result = await FinanceTransaction.destroy({ 
                where: whereClause,
                transaction
            });

            console.log('🔍 FinanceTransactionRepository.delete - Result:', result);

            return result;
        } catch (error) {
            console.error('❌ FinanceTransactionRepository.delete - Error:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = FinanceTransactionRepository;