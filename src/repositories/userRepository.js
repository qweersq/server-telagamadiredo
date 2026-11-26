const { Op, sequelize, User } = require('../models');

class UserRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await User.create(data, { transaction });
            
            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return result;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }

    static async getAll(search, tenant_id = null, branch_id = null, status = null, role = null) {
        try {
            const whereClause = {};

            // Search filter
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.substring]: search } },
                    { phone: { [Op.substring]: search } },
                    { email: { [Op.substring]: search } },
                    { address: { [Op.substring]: search } },
                ];
            }

            // Tenant filter
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            // Branch filter
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Status filter
            if (status) {
                whereClause.status = status;
            }

            // Role filter
            if (role) {
                whereClause.role = role;
            }

            console.log('🔍 UserRepository.getAll - Where clause:', whereClause);

            const users = await User.findAll({
                attributes: { exclude: ['password'] },
                where: whereClause,
                include: [
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: require('../models').Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name']
                    }
                ],
                order: [['name', 'ASC']]
            });

            console.log('✅ UserRepository.getAll - Found users:', users.length);

            return users;
        } catch (error) {
            console.error('❌ UserRepository.getAll - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getByEmail(email) {
        try {
            const result = await User.findOne({
                where: { email: email },
                paranoid: false
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByPhone(phone) {
        try {
            const result = await User.findOne({
                where: { phone: phone },
                paranoid: false
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await User.findByPk(id, {
                include: [
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: require('../models').Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'status', 'subscription_status', 'trial_end_date']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await User.findByPk(id);

            await result.update(data, { transaction });
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
            const result = await User.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
};

module.exports = UserRepository;