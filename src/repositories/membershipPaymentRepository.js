const { 
    CustomerMembership, 
    Payment, 
    PaymentDetail, 
    FinanceTransaction, 
    Customer, 
    Membership, 
    FinanceAccount, 
    PaymentMethod,
    Op 
} = require('../models');

class MembershipPaymentRepository {
    /**
     * Get all membership payments with filters
     */
    static async getAll(filters) {
        try {
            const {
                page = 1,
                limit = 10,
                search = null,
                start_date = null,
                end_date = null,
                customer_id = null,
                membership_id = null,
                user_tenant_id,
                user_branch_id,
                user_role
            } = filters;

            const offset = (page - 1) * limit;
            let whereClause = {};

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Apply additional filters
            if (customer_id) {
                whereClause.customer_id = customer_id;
            }
            if (membership_id) {
                whereClause.membership_id = membership_id;
            }
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [start_date, end_date]
                };
            }

            // Build search condition
            let searchCondition = {};
            if (search) {
                searchCondition = {
                    [Op.or]: [
                        { '$customer.name$': { [Op.like]: `%${search}%` } },
                        { '$membership.name$': { [Op.like]: `%${search}%` } },
                        { '$payment.code$': { [Op.like]: `%${search}%` } }
                    ]
                };
            }

            const result = await CustomerMembership.findAndCountAll({
                where: {
                    ...whereClause,
                    ...searchCondition
                },
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'email']
                    },
                    {
                        model: Membership,
                        as: 'membership',
                        attributes: ['id', 'name', 'description', 'price', 'discount_percentage', 'duration_days']
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['id', 'code', 'status', 'final_price', 'paid_amount', 'remaining_amount', 'notes', 'createdAt'],
                        include: [
                            {
                                model: PaymentDetail,
                                as: 'payment_details',
                                attributes: ['id', 'method', 'amount', 'final_amount', 'createdAt'],
                                include: [
                                    {
                                        model: FinanceAccount,
                                        as: 'finance_account',
                                        attributes: ['id', 'name']
                                    },
                                    {
                                        model: PaymentMethod,
                                        as: 'payment_method',
                                        attributes: ['id', 'name', 'code', 'type', 'icon']
                                    }
                                ]
                            }
                        ]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true
            });

            return {
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.count,
                    totalPages: Math.ceil(result.count / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get membership payment by ID
     */
    static async getById(id, user_tenant_id, user_branch_id, user_role) {
        try {
            let whereClause = { id };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            const result = await CustomerMembership.findOne({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'email', 'address']
                    },
                    {
                        model: Membership,
                        as: 'membership',
                        attributes: ['id', 'name', 'description', 'price', 'discount_percentage', 'duration_days', 'is_active']
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['id', 'code', 'status', 'final_price', 'subtotal', 'total_discount', 'additional_cost', 'paid_amount', 'remaining_amount', 'due_date', 'notes', 'createdAt', 'updatedAt'],
                        include: [
                            {
                                model: PaymentDetail,
                                as: 'payment_details',
                                attributes: ['id', 'method', 'amount', 'fee', 'interest', 'final_amount', 'evidence_photo', 'createdAt'],
                                include: [
                                    {
                                        model: FinanceAccount,
                                        as: 'finance_account',
                                        attributes: ['id', 'name', 'balance', 'is_active']
                                    },
                                    {
                                        model: PaymentMethod,
                                        as: 'payment_method',
                                        attributes: ['id', 'name', 'code', 'type', 'icon']
                                    },
                                    {
                                        model: FinanceTransaction,
                                        as: 'transaction',
                                        attributes: ['id', 'type', 'amount', 'final_amount', 'description', 'date']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            return result;

        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Create customer membership
     */
    static async create(data, transaction = null) {
        try {
            const result = await CustomerMembership.create(data, { transaction });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Update customer membership
     */
    static async update(id, data, transaction = null) {
        try {
            const result = await CustomerMembership.update(data, {
                where: { id },
                transaction
            });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Delete customer membership
     */
    static async delete(id, transaction = null) {
        try {
            const result = await CustomerMembership.destroy({
                where: { id },
                transaction
            });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get membership payment statistics
     */
    static async getStatistics(user_tenant_id, user_branch_id, user_role, start_date = null, end_date = null) {
        try {
            let whereClause = {};

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Apply date filter
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [start_date, end_date]
                };
            }

            const result = await CustomerMembership.findAll({
                where: whereClause,
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['final_price', 'paid_amount']
                    },
                    {
                        model: Membership,
                        as: 'membership',
                        attributes: ['name', 'price']
                    }
                ]
            });

            // Calculate statistics
            const totalMemberships = result.length;
            const totalRevenue = result.reduce((sum, item) => sum + parseFloat(item.payment?.final_price || 0), 0);
            const activeMemberships = result.filter(item => item.status === 'active').length;
            const expiredMemberships = result.filter(item => item.status === 'expired').length;

            // Group by membership type
            const membershipStats = {};
            result.forEach(item => {
                const membershipName = item.membership?.name || 'Unknown';
                if (!membershipStats[membershipName]) {
                    membershipStats[membershipName] = {
                        count: 0,
                        revenue: 0
                    };
                }
                membershipStats[membershipName].count++;
                membershipStats[membershipName].revenue += parseFloat(item.payment?.final_price || 0);
            });

            return {
                total_memberships: totalMemberships,
                total_revenue: totalRevenue,
                active_memberships: activeMemberships,
                expired_memberships: expiredMemberships,
                membership_stats: membershipStats
            };

        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = MembershipPaymentRepository;
