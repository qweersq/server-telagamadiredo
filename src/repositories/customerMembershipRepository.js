const { CustomerMembership, Customer, Membership, Op, sequelize } = require('../models');

class CustomerMembershipRepository {
    static async create(data, transaction = null) {
        if (transaction) {
            // Use existing transaction - only create CustomerMembership
            const result = await CustomerMembership.create(data, { transaction });
            return result;
        } else {
            // Create new transaction
            const newTransaction = await sequelize.transaction();
            try {
                const result = await CustomerMembership.create(data, { transaction: newTransaction });
                
                // Update customer's current_membership_id
                await Customer.update(
                    { current_membership_id: result.id },
                    { where: { id: data.customer_id }, transaction: newTransaction }
                );
                
                await newTransaction.commit();
                return result;
            } catch (error) {
                await newTransaction.rollback();
                throw new Error(error.message);
            }
        }
    }

    static async getAll(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { '$customer.name$': { [Op.substring]: search } },
                        { '$customer.phone$': { [Op.substring]: search } },
                        { '$membership.name$': { [Op.substring]: search } },
                    ],
                }
                : {};

            // Add data isolation based on user role
            let whereClause = { ...searchFilter };
            
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (user_role === 'superadmin') {
                // Superadmin (per tenant) bisa lihat data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee/Admin hanya bisa lihat data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            }

            // Calculate offset for pagination
            const offset = (page - 1) * limit;

            // Get total count for pagination
            const totalItems = await CustomerMembership.count({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: []
                    },
                    {
                        model: Membership,
                        as: 'membership',
                        attributes: []
                    }
                ]
            });

            // Get paginated data
            const customer_memberships = await CustomerMembership.findAll({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'email']
                    },
                    {
                        model: Membership,
                        as: 'membership',
                        attributes: ['id', 'name', 'discount_percentage', 'price', 'duration_days']
                    },
                ],
                order: [['id', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Calculate total pages
            const totalPages = Math.ceil(totalItems / limit);

            return {
                customer_memberships,
                totalItems,
                totalPages
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            let whereClause = { id };

            // Add data isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (user_role === 'superadmin') {
                // Superadmin (per tenant) bisa lihat data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee/Admin hanya bisa lihat data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            }

            const data = await CustomerMembership.findOne({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'email']
                    },
                    {
                        model: Membership,
                        as: 'membership',
                        attributes: ['id', 'name', 'discount_percentage', 'price', 'duration_days']
                    },
                ]
            });

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, user_tenant_id = null, user_branch_id = null, user_role = null, transaction = null) {
        const shouldCommit = !transaction;
        if (!transaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            let whereClause = { id };

            // Add data isolation based on user role (skip for cron job)
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (user_role === 'superadmin') {
                // Superadmin (per tenant) bisa lihat data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else if (user_role) {
                // Employee/Admin hanya bisa lihat data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            }

            const result = await CustomerMembership.update(data, { 
                where: whereClause, 
                transaction 
            });

            if (result[0] === 0) {
                throw new Error('Customer membership not found');
            }

            if (shouldCommit) {
                await transaction.commit();
                return await CustomerMembershipRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            }
            
            return result;
        } catch (error) {
            if (shouldCommit) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            // Get customer membership first to update customer's current_membership_id
            const customerMembership = await CustomerMembership.findByPk(id, { transaction });
            if (!customerMembership) {
                throw new Error('Customer membership not found');
            }

            // Update customer's current_membership_id to null
            await Customer.update(
                { current_membership_id: null },
                { where: { id: customerMembership.customer_id }, transaction }
            );

            // Delete customer membership
            await CustomerMembership.destroy({ where: { id }, transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getExpiredMemberships() {
        try {
            // Get expired membership IDs using raw SQL (DATE() function to avoid timezone issues)
            // ✅ Exclude tier-based memberships (end_date IS NULL) - they don't expire
            const [results] = await sequelize.query(`
                SELECT id
                FROM customer_memberships
                WHERE status = 'active'
                AND end_date IS NOT NULL
                AND DATE(end_date) < CURDATE()
                AND deletedAt IS NULL
            `, {
                type: sequelize.QueryTypes.SELECT
            });
            
            if (!results || results.length === 0) {
                return [];
            }
            
            const expiredIds = results.map(row => row.id);
            
            // Get full model instances with relations
            const expiredMemberships = await CustomerMembership.findAll({
                where: {
                    id: { [Op.in]: expiredIds }
                },
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'current_membership_id']
                    }
                ]
            });
            
            return expiredMemberships;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = CustomerMembershipRepository;
