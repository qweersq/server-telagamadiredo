const { Membership, Customer, CustomerMembership, Payment, sequelize, Op } = require('../models');

class MembershipRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Membership.create(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { name: { [Op.substring]: search } },
                        { description: { [Op.substring]: search } },
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
            const totalItems = await Membership.count({
                where: whereClause
            });

            // Get paginated data
            const memberships = await Membership.findAll({
                where: whereClause,
                order: [['id', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Calculate total pages
            const totalPages = Math.ceil(totalItems / limit);

            return {
                memberships,
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

            const result = await Membership.findOne({
                where: whereClause
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Membership.findByPk(id);

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
            const result = await Membership.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateCustomerCurrentMembership(customerId, membershipId) {
        const transaction = await sequelize.transaction();
        try {
            await Customer.update(
                { current_membership_id: membershipId },
                { where: { id: customerId }, transaction }
            );
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async toggleStatus(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        const transaction = await sequelize.transaction();
        try {
            let whereClause = { id };
            
            // Add data isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa update semua data
            } else if (user_role === 'superadmin') {
                // Superadmin (per tenant) bisa update data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee/Admin hanya bisa update data tenant-nya
                whereClause.tenant_id = user_tenant_id;
            }

            const membership = await Membership.findOne({ where: whereClause });
            if (!membership) {
                throw new Error('Membership not found');
            }

            await Membership.update(
                { is_active: !membership.is_active },
                { where: { id }, transaction }
            );

            await transaction.commit();
            
            return { id, is_active: !membership.is_active };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    /**
     * Get membership statistics
     */
    static async getStatistics(membershipId, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            let whereClause = {
                membership_id: membershipId,
                tenant_id: user_tenant_id
            };

            // Add branch filter if user has branch access
            if (user_branch_id) {
                whereClause.branch_id = user_branch_id;
            }

            // Get total customers count
            const totalCustomers = await CustomerMembership.count({
                where: whereClause
            });

            // Get active customers count
            const activeCustomers = await CustomerMembership.count({
                where: {
                    ...whereClause,
                    status: 'active'
                }
            });

            // Get expired customers count
            // ✅ Exclude tier-based memberships (end_date IS NULL) - they don't expire
            const expiredCustomers = await CustomerMembership.count({
                where: {
                    ...whereClause,
                    status: 'expired',
                    end_date: { [Op.ne]: null } // Only count paid memberships that expired
                }
            });

            // Get cancelled customers count
            const cancelledCustomers = await CustomerMembership.count({
                where: {
                    ...whereClause,
                    status: 'cancelled'
                }
            });

            // Get total revenue
            const revenueResult = await CustomerMembership.findAll({
                where: whereClause,
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['final_price']
                    }
                ],
                attributes: []
            });

            const totalRevenue = revenueResult.reduce((sum, item) => {
                return sum + parseFloat(item.payment?.final_price || 0);
            }, 0);

            // Get average duration
            // ✅ Only calculate for paid memberships (end_date IS NOT NULL)
            const durationResult = await CustomerMembership.findAll({
                where: {
                    ...whereClause,
                    end_date: { [Op.ne]: null } // Only paid memberships have end_date
                },
                attributes: [
                    [sequelize.literal('AVG(DATEDIFF(end_date, start_date))'), 'avg_duration']
                ],
                raw: true
            });

            const averageDuration = durationResult[0]?.avg_duration || 0;

            return {
                total_customers: totalCustomers,
                active_customers: activeCustomers,
                expired_customers: expiredCustomers,
                cancelled_customers: cancelledCustomers,
                total_revenue: totalRevenue,
                average_duration: Math.round(averageDuration)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customers by membership ID with pagination
     */
    static async getCustomers(membershipId, filters, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const { page = 1, limit = 20, status, search } = filters;
            const offset = (page - 1) * limit;

            // Build where clause
            let whereClause = {
                membership_id: membershipId,
                tenant_id: user_tenant_id
            };

            if (status) {
                whereClause.status = status;
            }

            if (user_branch_id) {
                whereClause.branch_id = user_branch_id;
            }

            // Build search condition
            let searchCondition = {};
            if (search) {
                searchCondition = {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { phone: { [Op.like]: `%${search}%` } },
                        { email: { [Op.like]: `%${search}%` } }
                    ]
                };
            }

            // Get total count
            const totalItems = await CustomerMembership.count({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        where: searchCondition,
                        required: true
                    }
                ]
            });

            // Get paginated data using raw query to avoid duplicates
            let searchQuery = '';
            
            if (search) {
                searchQuery = `AND (c.name LIKE :search1 OR c.phone LIKE :search2 OR c.email LIKE :search3)`;
            }

            const statusQuery = status ? `AND cm.status = :status` : '';

            const query = `
                SELECT 
                    cm.id,
                    cm.status,
                    cm.start_date,
                    cm.end_date,
                    cm.payment_id,
                    cm.createdAt,
                    CASE 
                        WHEN cm.end_date IS NULL THEN NULL
                        ELSE DATEDIFF(cm.end_date, NOW())
                    END as days_remaining,
                    CASE
                        WHEN cm.end_date IS NULL THEN 'tier-based'
                        WHEN cm.end_date IS NOT NULL AND cm.end_date <= NOW() THEN 'expired'
                        ELSE 'active'
                    END as membership_type,
                    c.id as customer_id,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email
                FROM customer_memberships cm
                JOIN customers c ON cm.customer_id = c.id
                WHERE cm.membership_id = :membershipId 
                    AND cm.tenant_id = :tenantId
                    AND cm.id IN (
                        SELECT MAX(id) 
                        FROM customer_memberships 
                        WHERE membership_id = :membershipId2 
                            AND tenant_id = :tenantId2
                        GROUP BY customer_id
                    )
                    ${statusQuery}
                    ${searchQuery}
                ORDER BY cm.createdAt DESC
                LIMIT :limit OFFSET :offset
            `;

            const params = {
                membershipId: membershipId,
                tenantId: user_tenant_id,
                membershipId2: membershipId,
                tenantId2: user_tenant_id,
                ...(status ? { status: status } : {}),
                ...(search ? { search1: `%${search}%`, search2: `%${search}%`, search3: `%${search}%` } : {}),
                limit: limit,
                offset: offset
            };

            const customers = await sequelize.query(query, {
                replacements: params,
                type: sequelize.QueryTypes.SELECT
            });

            // Format the result to match expected structure
            const formattedCustomers = customers.map(customer => ({
                id: customer.id,
                status: customer.status,
                start_date: customer.start_date,
                end_date: customer.end_date,
                payment_id: customer.payment_id,
                days_remaining: customer.days_remaining,
                membership_type: customer.membership_type, // 'tier-based', 'expired', or 'active'
                customer: {
                    id: customer.customer_id,
                    name: customer.customer_name,
                    phone: customer.customer_phone,
                    email: customer.customer_email
                }
            }));

            const totalPages = Math.ceil(totalItems / limit);

            return {
                customers: formattedCustomers,
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_items: totalItems,
                    items_per_page: limit,
                    has_next_page: page < totalPages,
                    has_prev_page: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = MembershipRepository;