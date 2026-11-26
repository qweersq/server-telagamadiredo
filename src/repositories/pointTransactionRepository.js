const { PointTransaction, Customer, Order, Op } = require('../models');

class PointTransactionRepository {
    /**
     * Create point transaction
     */
    static async create(data, transaction = null) {
        try {
            const pointTransaction = await PointTransaction.create({
                customer_id: data.customer_id,
                order_id: data.order_id || null,
                type: data.type, // 'earn', 'redeem', 'expire', 'bonus'
                bonus_type: data.bonus_type || null, // 'referral_referrer', 'referral_new_customer', 'first_order' (hanya untuk type = bonus)
                points: data.points,
                description: data.description || null,
                expires_at: data.expires_at || null
            }, { transaction });

            return pointTransaction;
        } catch (error) {
            throw new Error(`Failed to create point transaction: ${error.message}`);
        }
    }

    /**
     * Get point transactions by customer ID
     * @param {number} customer_id - Customer ID
     * @param {number} user_tenant_id - User tenant ID
     * @param {number} user_branch_id - User branch ID
     * @param {string} user_role - User role
     * @param {number} page - Page number
     * @param {number} limit - Limit per page
     * @param {number} order_id - Optional order ID to filter transactions
     */
    static async getByCustomerId(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, order_id = null) {
        try {
            const offset = (page - 1) * limit;
            let whereClause = { customer_id };

            // ✅ Filter by order_id if provided
            if (order_id) {
                whereClause.order_id = order_id;
            }

            // Apply tenant isolation
            if (user_role !== 'superapp-superadmin') {
                // Join with customer to filter by tenant
                whereClause['$customer.tenant_id$'] = user_tenant_id;
                if (user_branch_id && user_role !== 'superadmin') {
                    whereClause['$customer.branch_id$'] = user_branch_id;
                }
            }

            const { count, rows } = await PointTransaction.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'tenant_id', 'branch_id']
                    },
                    {
                        model: Order,
                        as: 'order',
                        attributes: ['id', 'entry_date'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });

            return {
                data: rows,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            };
        } catch (error) {
            throw new Error(`Failed to get point transactions: ${error.message}`);
        }
    }

    /**
     * Get point transactions by order ID
     */
    static async getByOrderId(order_id, user_tenant_id = null) {
        try {
            let whereClause = { order_id };

            // Apply tenant isolation
            if (user_tenant_id) {
                whereClause['$order.tenant_id$'] = user_tenant_id;
            }

            const pointTransactions = await PointTransaction.findAll({
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone']
                    },
                    {
                        model: Order,
                        as: 'order',
                        attributes: ['id', 'entry_date'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return pointTransactions;
        } catch (error) {
            throw new Error(`Failed to get point transactions by order: ${error.message}`);
        }
    }

    /**
     * Get total points earned by customer (sum of positive points)
     */
    static async getTotalEarned(customer_id, user_tenant_id = null) {
        try {
            let whereClause = {
                customer_id,
                type: { [Op.in]: ['earn', 'bonus'] }
            };

            // Apply tenant isolation
            if (user_tenant_id) {
                whereClause['$customer.tenant_id$'] = user_tenant_id;
            }

            const result = await PointTransaction.sum('points', {
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: [],
                        required: true
                    }
                ]
            });

            return result || 0;
        } catch (error) {
            throw new Error(`Failed to get total earned points: ${error.message}`);
        }
    }

    /**
     * Get total points redeemed by customer (sum of negative points)
     */
    static async getTotalRedeemed(customer_id, user_tenant_id = null) {
        try {
            let whereClause = {
                customer_id,
                type: 'redeem'
            };

            // Apply tenant isolation
            if (user_tenant_id) {
                whereClause['$customer.tenant_id$'] = user_tenant_id;
            }

            const result = await PointTransaction.sum('points', {
                where: whereClause,
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: [],
                        required: true
                    }
                ]
            });

            // Return absolute value (since redeem is negative)
            return Math.abs(result || 0);
        } catch (error) {
            throw new Error(`Failed to get total redeemed points: ${error.message}`);
        }
    }
}

module.exports = PointTransactionRepository;
