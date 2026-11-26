const { FinanceAccount, Op } = require('../models');
const moment = require('moment');

class FinanceAccountRepository {
    static async create(name, balance, description, tenant_id, branch_id = null, is_active = true, payment_method_id = null, requires_payment_proof = false) {
        try {
            const result = await FinanceAccount.create({ 
                name, 
                balance, 
                description, 
                tenant_id, 
                branch_id,
                is_global: !branch_id,
                is_branch_specific: !!branch_id,
                is_active: is_active,
                payment_method_id: payment_method_id,
                requires_payment_proof: !!requires_payment_proof
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id, branch_id = null, is_active = true) {
        try {
            console.log('🔍 FinanceAccountRepository.getAll - Parameters:', { tenant_id, branch_id, is_active });
            
            const whereClause = { 
                tenant_id,
                is_active: is_active === true ? 1 : 0  // Convert boolean to integer for MySQL
            };
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { branch_id: { [Op.is]: null } },  // Global accounts (no specific branch)
                    { is_global: true }
                ];
            }

            console.log('🔍 FinanceAccountRepository.getAll - Where clause:', whereClause);

            const result = await FinanceAccount.findAll({
                where: whereClause,
                include: [
                    {
                        model: require('../models').PaymentMethod,
                        as: 'payment_method',
                        attributes: ['id', 'name', 'code', 'type', 'icon']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            console.log('✅ FinanceAccountRepository.getAll - Query result:', result.length, 'accounts');
            
            return result;
        } catch (error) {
            console.error('❌ FinanceAccountRepository.getAll - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id, branch_id = null, transaction = null) {
        try {
            console.log('🔍 FinanceAccountRepository.getById - Parameters:', { id, tenant_id, branch_id });
            
            // ✅ Fix: Use proper Op.and logic for combining conditions
            const whereClause = { 
                id, 
                tenant_id,
                [Op.or]: [
                    { branch_id: branch_id },
                    { is_global: true },
                    { branch_id: null }  // Include accounts with null branch_id
                ]
            };
            
            console.log('🔍 FinanceAccountRepository.getById - Where clause:', whereClause);

            const result = await FinanceAccount.findOne({
                where: whereClause,
                transaction
            });
            
            if (result) {
                console.log('✅ FinanceAccountRepository.getById - Found account:', {
                    id: result.id,
                    name: result.name,
                    type: result.type,
                    tenant_id: result.tenant_id,
                    branch_id: result.branch_id,
                    is_global: result.is_global
                });
            } else {
                console.log('❌ FinanceAccountRepository.getById - No account found');
            }

            return result;
        } catch (error) {
            console.error('❌ FinanceAccountRepository.getById - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async update(id, name, balance, description, tenant_id, branch_id = null, is_active = true, payment_method_id = null, transaction = null, requires_payment_proof = false) {
        try {
            console.log('🔍 FinanceAccountRepository.update - Parameters:', { id, name, balance, description, tenant_id, branch_id, is_active, payment_method_id });
            
            const whereClause = { id, tenant_id };
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { is_global: true },
                    { branch_id: null }  // Include accounts with null branch_id
                ];
            }
            
            console.log('🔍 FinanceAccountRepository.update - Where clause:', whereClause);

            const getFinanceAccount = await FinanceAccount.findOne({ where: whereClause, transaction });
            if (!getFinanceAccount) {
                console.error('❌ FinanceAccountRepository.update - Finance account not found!');
                throw new Error('Finance account not found');
            }
            
            console.log('✅ FinanceAccountRepository.update - Found account:', {
                id: getFinanceAccount.id,
                name: getFinanceAccount.name,
                currentBalance: getFinanceAccount.balance
            });

            const updateData = { 
                name, 
                balance, 
                description,
                branch_id,
                is_global: !branch_id,
                is_branch_specific: !!branch_id,
                is_active: is_active,
                payment_method_id: payment_method_id,
                requires_payment_proof: !!requires_payment_proof
            };
            
            console.log('🔍 FinanceAccountRepository.update - Update data:', updateData);

            const result = await getFinanceAccount.update(updateData, { transaction });
            
            console.log('✅ FinanceAccountRepository.update - Update successful:', {
                id: result.id,
                newBalance: result.balance
            });

            return result;
        } catch (error) {
            console.error('❌ FinanceAccountRepository.update - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async updateBalance(id, balance, tenant_id, transaction = null) {
        try {
            const whereClause = { id, tenant_id };

            const getFinanceAccount = await FinanceAccount.findOne({ where: whereClause });
            if (!getFinanceAccount) {
                throw new Error('Finance account not found');
            }

            const result = await getFinanceAccount.update({
                balance: balance,
                updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
            }, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id, branch_id = null) {
        try {
            const whereClause = { id, tenant_id };
            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { is_global: true }
                ];
            }

            const result = await FinanceAccount.destroy({ where: whereClause });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = FinanceAccountRepository;