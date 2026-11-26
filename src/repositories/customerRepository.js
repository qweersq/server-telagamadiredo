const {
    Customer,
    Op,
    Order,
    sequelize,
    PointTransaction,
    CustomerMembership,
    ReminderLog,
    CustomerFollowup,
    CustomerFollowupSequence,
    CampaignCustomer,
    MessageQueue,
    AdminNote
} = require('../models');

const WALK_IN_CUSTOMER_NAME = 'Pelanggan Umum';

class CustomerRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Customer.create(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async calculateTotalTransactions(id, user_tenant_id = null) {
        try {
            let whereClause = {
                customer_id: id,
            };

            // Add tenant_id filtering if provided
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }

            const result = await Order.count({
                where: whereClause,
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getLastTransactionDate(id, user_tenant_id = null) {
        try {
            let whereClause = {
                customer_id: id,
            };

            // Add tenant_id filtering if provided
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }

            const result = await Order.findAll({
                where: whereClause,
                order: [['entry_date', 'DESC']],
                limit: 1,
            });

            return result
        } catch (error) {
            throw new Error(error.message);
        };
    };

    static async getAll(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, branch_id = null, sort_by = 'newest') {
        try {
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { '$customers.name$': { [Op.substring]: search } },
                        { '$customers.phone$': { [Op.substring]: search } },
                        { '$customers.email$': { [Op.substring]: search } },
                        { '$customers.address$': { [Op.substring]: search } },
                        { '$customers.city$': { [Op.substring]: search } },
                    ],
                }
                : {};

            // Add data isolation based on user role
            let whereClause = { ...searchFilter };

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Add branch filter if specified in query
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Calculate offset for pagination
            const offset = (page - 1) * limit;

            // Get total count for pagination
            const totalItems = await Customer.count({
                where: whereClause
            });

            // Get paginated data with order and order details count
            const customers = await Customer.findAll({
                attributes: {
                    exclude: ['password'],
                    include: [
                        // Add virtual fields for counting
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM orders o 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND o.deletedAt IS NULL
                            )`),
                            'total_orders'
                        ],
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM order_details od 
                                INNER JOIN orders o ON od.order_id = o.id 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND od.deletedAt IS NULL
                                AND o.deletedAt IS NULL
                            )`),
                            'total_order_details'
                        ]
                    ]
                },
                where: whereClause,
                include: [
                    {
                        model: require('../models').CustomerMembership,
                        as: 'current_membership',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'payment_id'], // ✅ Added payment_id
                        include: [{
                            model: require('../models').Membership,
                            as: 'membership',
                            attributes: ['id', 'name', 'discount_percentage']
                        }]
                    },
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ],
                order: sort_by === 'most_services'
                    ? [[sequelize.literal('total_order_details'), 'DESC'], ['id', 'DESC']]
                    : [['id', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Calculate total pages
            const totalPages = Math.ceil(totalItems / limit);

            return {
                customers,
                totalItems,
                totalPages
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async searchByName(search, user_tenant_id = null, user_branch_id = null, user_role = null, sort_by = 'newest') {
        try {
            if (!search) {
                throw new Error('Search parameter is required');
            }

            const { normalizeReferralPhone, cleanPhoneNumber } = require('../helpers/phoneHelper');

            // Check if search term looks like a phone number (contains digits only or with +/spaces)
            const isPhoneSearch = /^[\d\s\+\-\(\)]+$/.test(search.trim());

            // Count digits in search term (remove non-digits first)
            const digitCount = search.trim().replace(/[^0-9]/g, '').length;

            // Build search conditions (flatten untuk avoid nested Op.or)
            let searchConditions = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];

            // If search looks like phone number
            if (isPhoneSearch) {
                // Jika kurang dari 10 digit, langsung pakai LIKE search tanpa normalize
                if (digitCount < 10) {
                    searchConditions.push({ phone: { [Op.like]: `%${search.trim()}%` } });
                } else {
                    // Jika >= 10 digit, normalize dulu lalu exact match + LIKE sebagai fallback
                    const normalizedPhone = normalizeReferralPhone(search) || cleanPhoneNumber(search);

                    if (normalizedPhone) {
                        // Search dengan multiple phone formats (08XX, 628XX, 8XX, +628XX)
                        // Flatten semua format ke dalam searchConditions
                        searchConditions.push(
                            { phone: normalizedPhone }, // Format internasional: 628XXXXXXXXX
                            { phone: normalizedPhone.replace(/^62/, '0') }, // Format lokal: 08XXXXXXXXX
                            { phone: normalizedPhone.replace(/^62/, '8') }, // Format tanpa 0: 8XXXXXXXXX
                            { phone: `+${normalizedPhone}` }, // Format dengan +: +628XXXXXXXXX
                            { phone: search.trim() }, // Format asli yang diinput (untuk backward compatibility)
                            { phone: { [Op.like]: `%${search.trim()}%` } } // LIKE search untuk partial match
                        );
                    } else {
                        // Fallback: search dengan format asli jika normalize gagal
                        searchConditions.push({ phone: { [Op.like]: `%${search.trim()}%` } });
                    }
                }
            } else {
                // Regular phone search dengan LIKE jika bukan phone number format
                searchConditions.push({ phone: { [Op.like]: `%${search}%` } });
            }

            let whereClause = {
                [Op.or]: searchConditions
            };

            // Add data isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            const data = await Customer.findAll({
                where: whereClause,
                attributes: {
                    exclude: ['password'],
                    include: [
                        // Add virtual fields for counting
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM orders o 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND o.deletedAt IS NULL
                            )`),
                            'total_orders'
                        ],
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM order_details od 
                                INNER JOIN orders o ON od.order_id = o.id 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND od.deletedAt IS NULL
                                AND o.deletedAt IS NULL
                            )`),
                            'total_order_details'
                        ]
                    ]
                },
                include: [
                    {
                        model: require('../models').CustomerMembership,
                        as: 'current_membership',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'payment_id'], // ✅ Added payment_id
                        include: [{
                            model: require('../models').Membership,
                            as: 'membership',
                            attributes: ['id', 'name', 'discount_percentage']
                        }]
                    },
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ],
                order: sort_by === 'most_services'
                    ? [[sequelize.literal('total_order_details'), 'DESC'], ['name', 'ASC']]
                    : [['name', 'ASC']]
            });

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByPhone(phone, user_tenant_id = null) {
        try {
            const { normalizeReferralPhone, cleanPhoneNumber } = require('../helpers/phoneHelper');
            const { Op } = require('sequelize');

            if (!phone) return null;

            // Normalize phone number untuk search
            const normalizedPhone = normalizeReferralPhone(phone) || cleanPhoneNumber(phone);

            if (!normalizedPhone) return null;

            // Build where clause untuk search dengan multiple format
            // Search dengan format normalized (62XXXXXXXXX) dan format lokal (08XX, 8XX)
            const phoneFormats = [
                { phone: normalizedPhone }, // Format internasional: 628XXXXXXXXX
                { phone: normalizedPhone.replace(/^62/, '0') }, // Format lokal: 08XXXXXXXXX
                { phone: normalizedPhone.replace(/^62/, '8') }, // Format tanpa 0: 8XXXXXXXXX
                { phone: `+${normalizedPhone}` }, // Format dengan +: +628XXXXXXXXX
                { phone: String(phone).trim() } // Format asli yang diinput (untuk backward compatibility)
            ];

            // Build where clause
            let whereClause = {
                [Op.or]: phoneFormats
            };

            // Add tenant_id filtering if provided
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }

            const data = await Customer.findOne({
                where: whereClause
            });

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            let whereClause = { id };

            // Add data isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            const data = await Customer.findOne({
                where: whereClause,
                include: [
                    {
                        model: require('../models').CustomerMembership,
                        as: 'current_membership',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'payment_id'], // ✅ Added payment_id
                        include: [{
                            model: require('../models').Membership,
                            as: 'membership',
                            attributes: ['id', 'name', 'discount_percentage']
                        }]
                    },
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ]
            });

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAllWithMembership(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, branch_id = null, sort_by = 'newest') {
        try {
            const searchFilter = search
                ? {
                    [Op.or]: [
                        sequelize.literal(`customers.name LIKE '%${search}%'`),
                        { phone: { [Op.substring]: search } },
                        { email: { [Op.substring]: search } },
                        { address: { [Op.substring]: search } },
                        { city: { [Op.substring]: search } },
                    ],
                }
                : {};

            // Add data isolation based on user role
            let whereClause = { ...searchFilter };

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Add branch filter if specified in query
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Calculate offset for pagination
            const offset = (page - 1) * limit;

            // Get total count for pagination (only customers with active membership)
            const totalItems = await Customer.count({
                where: whereClause,
                include: [
                    {
                        model: require('../models').CustomerMembership,
                        as: 'current_membership',
                        where: { status: 'active' },
                        required: true
                    }
                ]
            });

            // Get paginated data (only customers with active membership)
            const customers = await Customer.findAll({
                attributes: {
                    exclude: ['password'],
                    include: [
                        // Add virtual fields for counting
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM orders o 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND o.deletedAt IS NULL
                            )`),
                            'total_orders'
                        ],
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM order_details od 
                                INNER JOIN orders o ON od.order_id = o.id 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND od.deletedAt IS NULL
                                AND o.deletedAt IS NULL
                            )`),
                            'total_order_details'
                        ]
                    ]
                },
                where: whereClause,
                include: [
                    {
                        model: require('../models').CustomerMembership,
                        as: 'current_membership',
                        where: { status: 'active' },
                        required: true,
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        include: [{
                            model: require('../models').Membership,
                            as: 'membership',
                            attributes: ['id', 'name', 'discount_percentage']
                        }]
                    },
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ],
                order: sort_by === 'most_services'
                    ? [[sequelize.literal('total_order_details'), 'DESC'], ['id', 'DESC']]
                    : [['id', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Calculate total pages
            const totalPages = Math.ceil(totalItems / limit);

            return {
                customers,
                totalItems,
                totalPages
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAllWithoutMembership(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, branch_id = null, sort_by = 'newest') {
        try {
            const searchFilter = search
                ? {
                    [Op.or]: [
                        sequelize.literal(`customers.name LIKE '%${search}%'`),
                        { phone: { [Op.substring]: search } },
                        { email: { [Op.substring]: search } },
                        { address: { [Op.substring]: search } },
                        { city: { [Op.substring]: search } },
                    ],
                }
                : {};

            // Add data isolation based on user role
            let whereClause = { ...searchFilter };

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Add branch filter if specified in query
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Calculate offset for pagination
            const offset = (page - 1) * limit;

            // Get total count for pagination (only customers without active membership)
            const totalItems = await Customer.count({
                where: {
                    ...whereClause,
                    current_membership_id: null
                }
            });

            // Get paginated data (only customers without active membership)
            const customers = await Customer.findAll({
                attributes: {
                    exclude: ['password'],
                    include: [
                        // Add virtual fields for counting
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM orders o 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND o.deletedAt IS NULL
                            )`),
                            'total_orders'
                        ],
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM order_details od 
                                INNER JOIN orders o ON od.order_id = o.id 
                                WHERE o.customer_id = customers.id 
                                AND o.tenant_id = ${user_tenant_id || 'customers.tenant_id'}
                                AND od.deletedAt IS NULL
                                AND o.deletedAt IS NULL
                            )`),
                            'total_order_details'
                        ]
                    ]
                },
                where: {
                    ...whereClause,
                    current_membership_id: null
                },
                include: [
                    {
                        model: require('../models').CustomerMembership,
                        as: 'current_membership',
                        required: false,
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        include: [{
                            model: require('../models').Membership,
                            as: 'membership',
                            attributes: ['id', 'name', 'discount_percentage']
                        }]
                    },
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ],
                order: sort_by === 'most_services'
                    ? [[sequelize.literal('total_order_details'), 'DESC'], ['id', 'DESC']]
                    : [['id', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Calculate total pages
            const totalPages = Math.ceil(totalItems / limit);

            return {
                customers,
                totalItems,
                totalPages
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Customer.findByPk(id);

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const data = await Customer.findByPk(id);

            await data.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    /**
     * Ambil semua order (aktif) milik customer untuk keperluan cascade delete.
     * Hanya menyertakan order yang belum soft-deleted.
     */
    static async getOrdersByCustomerId(customerId, user_tenant_id = null) {
        try {
            const whereClause = { customer_id: customerId };
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }

            const orders = await Order.findAll({
                where: whereClause,
                attributes: ['id', 'tenant_id', 'branch_id']
            });

            return orders;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    /**
     * Ambil semua customer membership (aktif) milik customer.
     * Dipakai untuk reverse finance pembelian membership sebelum customer dihapus.
     */
    static async getCustomerMembershipsByCustomerId(customerId, user_tenant_id = null) {
        try {
            const whereClause = { customer_id: customerId };
            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }

            const memberships = await CustomerMembership.findAll({
                where: whereClause,
                attributes: ['id', 'customer_id', 'payment_id']
            });

            return memberships;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    /**
     * Hapus seluruh data turunan customer (membership, poin, reminder, followup,
     * campaign, message queue, notes). Mengikuti konfigurasi paranoid tiap model
     * (soft delete bila paranoid, hard delete bila tidak).
     */
    static async deleteRelatedData(customerId) {
        const transaction = await sequelize.transaction();
        try {
            // Lepaskan referensi current_membership_id sebelum membership dihapus
            await Customer.update(
                { current_membership_id: null },
                { where: { id: customerId }, transaction }
            );

            await PointTransaction.destroy({ where: { customer_id: customerId }, transaction });
            await CustomerMembership.destroy({ where: { customer_id: customerId }, transaction });
            await ReminderLog.destroy({ where: { customer_id: customerId }, transaction });
            await CustomerFollowup.destroy({ where: { customer_id: customerId }, transaction });
            await CustomerFollowupSequence.destroy({ where: { customer_id: customerId }, transaction });
            await CampaignCustomer.destroy({ where: { customer_id: customerId }, transaction });
            await MessageQueue.destroy({ where: { customer_id: customerId }, transaction });
            await AdminNote.destroy({ where: { customer_id: customerId }, transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getDormantCustomers(daysSinceLastOrder = 14, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            // Build data isolation conditions
            let tenantCondition = '';
            let branchCondition = '';

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
                if (user_branch_id) {
                    branchCondition = `AND customers.branch_id = ${user_branch_id}`;
                }
            }

            // Calculate offset for pagination
            const offset = (page - 1) * limit;

            // Get total count for pagination using raw query
            const countQuery = `
                SELECT COUNT(DISTINCT customers.id) as total
                FROM customers
                INNER JOIN orders ON customers.id = orders.customer_id
                INNER JOIN order_details ON orders.id = order_details.order_id
                WHERE customers.deletedAt IS NULL
                AND order_details.status IN ('done', 'selesai')
                AND DATEDIFF(CURDATE(), orders.entry_date) >= ${daysSinceLastOrder}
                AND customers.id NOT IN (
                    SELECT DISTINCT cf.customer_id 
                    FROM customer_followups cf 
                    WHERE cf.deleted_at IS NULL 
                    AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL ${daysSinceLastOrder} DAY)
                    ${tenantCondition.replace('customers.', 'cf.')}
                    ${branchCondition.replace('customers.', 'cf.')}
                )
                ${tenantCondition}
                ${branchCondition}
            `;

            const countResult = await sequelize.query(countQuery, {
                type: sequelize.QueryTypes.SELECT
            });
            const totalItems = countResult[0].total;

            // Get paginated data using raw query
            const dataQuery = `
                SELECT 
                    customers.id,
                    customers.name,
                    customers.phone,
                    customers.email,
                    customers.address,
                    customers.gmaps,
                    customers.tenant_id,
                    customers.branch_id,
                    customers.createdAt,
                    customers.updatedAt,
                    branches.name as branch_name,
                    COUNT(DISTINCT orders.id) as total_orders,
                    CAST((
                        SELECT COUNT(*) 
                        FROM order_details od2 
                        INNER JOIN orders o2 ON od2.order_id = o2.id 
                        WHERE o2.customer_id = customers.id 
                        AND od2.status IN ('done', 'selesai')
                    ) AS UNSIGNED) as total_order_details,
                    MAX(orders.entry_date) as last_order_date,
                    DATEDIFF(CURDATE(), MAX(orders.entry_date)) as days_since_last_order
                FROM customers
                LEFT JOIN branches ON customers.branch_id = branches.id
                INNER JOIN orders ON customers.id = orders.customer_id
                INNER JOIN order_details ON orders.id = order_details.order_id
                WHERE customers.deletedAt IS NULL
                AND order_details.status IN ('done', 'selesai')
                AND DATEDIFF(CURDATE(), orders.entry_date) >= ${daysSinceLastOrder}
                AND customers.id NOT IN (
                    SELECT DISTINCT cf.customer_id 
                    FROM customer_followups cf 
                    WHERE cf.deleted_at IS NULL 
                    AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL ${daysSinceLastOrder} DAY)
                    ${tenantCondition.replace('customers.', 'cf.')}
                    ${branchCondition.replace('customers.', 'cf.')}
                )
                ${tenantCondition}
                ${branchCondition}
                GROUP BY customers.id, branches.name
                ORDER BY total_order_details DESC, last_order_date ASC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const customers = await sequelize.query(dataQuery, {
                type: sequelize.QueryTypes.SELECT
            });

            // Get membership data for each customer
            const customerIds = customers.map(c => c.id);
            let memberships = [];

            if (customerIds.length > 0) {
                const membershipQuery = `
                    SELECT 
                        cm.id,
                        cm.customer_id,
                        cm.status,
                        cm.start_date,
                        cm.end_date,
                        m.name as membership_name,
                        m.discount_percentage
                    FROM customer_memberships cm
                    INNER JOIN memberships m ON cm.membership_id = m.id
                    WHERE cm.customer_id IN (${customerIds.join(',')})
                    AND cm.status = 'active'
                `;

                memberships = await sequelize.query(membershipQuery, {
                    type: sequelize.QueryTypes.SELECT
                });
            }

            // Combine customer data with membership data
            const customersWithMembership = customers.map(customer => {
                const membership = memberships.find(m => m.customer_id === customer.id);
                return {
                    ...customer,
                    current_membership: membership ? {
                        id: membership.id,
                        status: membership.status,
                        start_date: membership.start_date,
                        end_date: membership.end_date,
                        membership: {
                            id: membership.id,
                            name: membership.membership_name,
                            discount_percentage: membership.discount_percentage
                        }
                    } : null,
                    branch: customer.branch_name ? {
                        id: customer.branch_id,
                        name: customer.branch_name
                    } : null
                };
            });

            // Calculate total pages
            const totalPages = Math.ceil(totalItems / limit);

            return {
                customers: customersWithMembership,
                totalPages,
                totalItems,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getDormantCustomersByPeriod(user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            // Build data isolation conditions
            let tenantCondition = '';
            let branchCondition = '';

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
                if (user_branch_id) {
                    branchCondition = `AND customers.branch_id = ${user_branch_id}`;
                }
            }

            // Get customers grouped by dormant periods
            const periodQuery = `
                SELECT 
                    CASE 
                        WHEN days_since_last_order BETWEEN 20 AND 30 THEN '20-30'
                        WHEN days_since_last_order BETWEEN 31 AND 40 THEN '30-40'
                        WHEN days_since_last_order BETWEEN 41 AND 50 THEN '40-50'
                        WHEN days_since_last_order BETWEEN 51 AND 60 THEN '50-60'
                        WHEN days_since_last_order BETWEEN 61 AND 70 THEN '60-70'
                        WHEN days_since_last_order BETWEEN 71 AND 80 THEN '70-80'
                        WHEN days_since_last_order BETWEEN 81 AND 90 THEN '80-90'
                        WHEN days_since_last_order > 90 THEN '90+'
                        ELSE 'other'
                    END as period,
                    COUNT(*) as count,
                    CASE 
                        WHEN days_since_last_order BETWEEN 20 AND 30 THEN 'high'
                        WHEN days_since_last_order BETWEEN 31 AND 40 THEN 'medium'
                        WHEN days_since_last_order BETWEEN 41 AND 50 THEN 'high'
                        WHEN days_since_last_order BETWEEN 51 AND 60 THEN 'critical'
                        WHEN days_since_last_order BETWEEN 61 AND 70 THEN 'critical'
                        WHEN days_since_last_order BETWEEN 71 AND 80 THEN 'critical'
                        WHEN days_since_last_order BETWEEN 81 AND 90 THEN 'critical'
                        WHEN days_since_last_order > 90 THEN 'maximum'
                        ELSE 'low'
                    END as priority
                FROM (
                    SELECT 
                        customers.id,
                        DATEDIFF(CURDATE(), MAX(orders.entry_date)) as days_since_last_order
                    FROM customers
                    INNER JOIN orders ON customers.id = orders.customer_id
                    INNER JOIN order_details ON orders.id = order_details.order_id
                    WHERE customers.deletedAt IS NULL
                    AND order_details.status IN ('done', 'selesai')
                    ${tenantCondition}
                    ${branchCondition}
                    GROUP BY customers.id
                    HAVING days_since_last_order >= 20
                    AND customers.id NOT IN (
                        SELECT DISTINCT cf.customer_id 
                        FROM customer_followups cf 
                        WHERE cf.deleted_at IS NULL 
                        AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL 20 DAY)
                        ${tenantCondition.replace('customers.', 'cf.')}
                        ${branchCondition.replace('customers.', 'cf.')}
                    )
                ) as dormant_customers
                GROUP BY period, priority
                ORDER BY 
                    CASE 
                        WHEN period = '20-30' THEN 1
                        WHEN period = '30-40' THEN 2
                        WHEN period = '40-50' THEN 3
                        WHEN period = '50-60' THEN 4
                        WHEN period = '60-70' THEN 5
                        WHEN period = '70-80' THEN 6
                        WHEN period = '80-90' THEN 7
                        WHEN period = '90+' THEN 8
                        ELSE 9
                    END
            `;

            const periodResult = await sequelize.query(periodQuery, {
                type: sequelize.QueryTypes.SELECT
            });

            // Add color mapping
            const tabs = periodResult.map(tab => ({
                period: tab.period,
                count: parseInt(tab.count),
                priority: tab.priority,
                color: this.getPriorityColor(tab.priority)
            }));

            return {
                tabs,
                total_customers: tabs.reduce((sum, tab) => sum + tab.count, 0)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDormantCustomersByPeriodRange(period, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            // Build data isolation conditions
            let tenantCondition = '';
            let branchCondition = '';

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                tenantCondition = `AND customers.tenant_id = ${user_tenant_id}`;
                if (user_branch_id) {
                    branchCondition = `AND customers.branch_id = ${user_branch_id}`;
                }
            }

            // Parse period range - FIX #2: Consistent period boundaries
            const normalizedPeriod = period.trim();

            let minDays, maxDays;
            switch (normalizedPeriod) {
                case '20-30':
                    minDays = 20; maxDays = 30; break;
                case '30-40':
                    minDays = 31; maxDays = 40; break;
                case '40-50':
                    minDays = 41; maxDays = 50; break;
                case '50-60':
                    minDays = 51; maxDays = 60; break;
                case '60-70':
                    minDays = 61; maxDays = 70; break;
                case '70-80':
                    minDays = 71; maxDays = 80; break;
                case '80-90':
                    minDays = 81; maxDays = 90; break;
                case '90+':
                    minDays = 91; maxDays = 9999; break;
                default:
                    minDays = 20; maxDays = 30; break;
            }

            const offset = (page - 1) * limit;

            // FIX #1: Count query - Filter by LAST ORDER only
            const countQuery = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT 
                        customers.id,
                        MAX(orders.entry_date) as last_order_date
                    FROM customers
                    INNER JOIN orders ON customers.id = orders.customer_id
                    INNER JOIN order_details ON orders.id = order_details.order_id
                    WHERE customers.deletedAt IS NULL
                    AND order_details.status IN ('done', 'selesai')
                    ${tenantCondition}
                    ${branchCondition}
                    GROUP BY customers.id
                    HAVING DATEDIFF(CURDATE(), MAX(orders.entry_date)) BETWEEN ${minDays} AND ${maxDays}
                    AND customers.id NOT IN (
                        SELECT DISTINCT cf.customer_id 
                        FROM customer_followups cf 
                        WHERE cf.deleted_at IS NULL 
                        AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL 20 DAY)
                        ${tenantCondition.replace('customers.', 'cf.')}
                        ${branchCondition.replace('customers.', 'cf.')}
                    )
                ) as dormant_customers
            `;

            const countResult = await sequelize.query(countQuery, {
                type: sequelize.QueryTypes.SELECT
            });
            const totalItems = countResult[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // FIX #1 & #3: Data query - Filter by LAST ORDER + Better Performance
            const dataQuery = `
                WITH customer_last_order AS (
                    SELECT 
                        customers.id,
                        customers.name,
                        customers.phone,
                        customers.email,
                        customers.address,
                        customers.gmaps,
                        customers.tenant_id,
                        customers.branch_id,
                        customers.createdAt,
                        customers.updatedAt,
                        MAX(orders.entry_date) as last_order_date,
                        DATEDIFF(CURDATE(), MAX(orders.entry_date)) as days_since_last_order,
                        COUNT(DISTINCT orders.id) as total_orders,
                        SUM(CASE WHEN od.status IN ('done', 'selesai') THEN 1 ELSE 0 END) as total_order_details
                    FROM customers
                    INNER JOIN orders ON customers.id = orders.customer_id
                    INNER JOIN order_details od ON orders.id = od.order_id
                    WHERE customers.deletedAt IS NULL
                    AND od.status IN ('done', 'selesai')
                    ${tenantCondition}
                    ${branchCondition}
                    GROUP BY customers.id
                    HAVING days_since_last_order BETWEEN ${minDays} AND ${maxDays}
                    AND customers.id NOT IN (
                        SELECT DISTINCT cf.customer_id 
                        FROM customer_followups cf 
                        WHERE cf.deleted_at IS NULL 
                        AND cf.sent_at >= DATE_SUB(NOW(), INTERVAL 20 DAY)
                        ${tenantCondition.replace('customers.', 'cf.')}
                        ${branchCondition.replace('customers.', 'cf.')}
                    )
                )
                SELECT 
                    clo.*,
                    branches.name as branch_name,
                    'ready' as follow_up_status,
                    CASE 
                        WHEN clo.days_since_last_order BETWEEN 20 AND 30 THEN 'high'
                        WHEN clo.days_since_last_order BETWEEN 31 AND 40 THEN 'medium'
                        WHEN clo.days_since_last_order BETWEEN 41 AND 50 THEN 'high'
                        WHEN clo.days_since_last_order BETWEEN 51 AND 60 THEN 'critical'
                        WHEN clo.days_since_last_order BETWEEN 61 AND 70 THEN 'critical'
                        WHEN clo.days_since_last_order BETWEEN 71 AND 80 THEN 'critical'
                        WHEN clo.days_since_last_order BETWEEN 81 AND 90 THEN 'critical'
                        WHEN clo.days_since_last_order > 90 THEN 'maximum'
                        ELSE 'low'
                    END as priority
                FROM customer_last_order clo
                LEFT JOIN branches ON clo.branch_id = branches.id
                ORDER BY clo.total_order_details DESC, clo.days_since_last_order DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const customers = await sequelize.query(dataQuery, {
                type: sequelize.QueryTypes.SELECT
            });

            return {
                customers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                },
                period_info: {
                    period,
                    priority: this.getPriorityFromPeriod(period),
                    color: this.getPriorityColor(this.getPriorityFromPeriod(period))
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static getPriorityColor(priority) {
        const colors = {
            'low': 'green',
            'medium': 'yellow',
            'high': 'orange',
            'critical': 'red',
            'maximum': 'dark-red'
        };
        return colors[priority] || 'gray';
    }

    static getPriorityFromPeriod(period) {
        const priorities = {
            '20-30': 'high',
            '30-40': 'medium',
            '40-50': 'high',
            '50-60': 'critical',
            '60-70': 'critical',
            '70-80': 'critical',
            '80-90': 'critical',
            '90+': 'maximum'
        };
        return priorities[period] || 'low';
    }

    static async exportCustomers(search, user_tenant_id = null, user_branch_id = null, user_role = null, branch_id = null, membership_filter = 'all', sort_by = 'newest') {
        try {
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { '$customers.name$': { [Op.substring]: search } },
                        { '$customers.phone$': { [Op.substring]: search } },
                        { '$customers.email$': { [Op.substring]: search } },
                        { '$customers.address$': { [Op.substring]: search } },
                        { '$customers.city$': { [Op.substring]: search } },
                    ],
                }
                : {};

            // Add data isolation based on user role
            let whereClause = { ...searchFilter };

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Add branch filter if specified in query
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Get all customers data (no pagination for export) - SIMPLIFIED
            const customers = await Customer.findAll({
                attributes: ['id', 'name', 'phone', 'address'], // ✅ Only 4 fields
                where: whereClause,
                order: [['id', 'DESC']]
            });

            // No filtering needed for simple export
            let filteredCustomers = customers;

            // Generate CSV content - SIMPLIFIED (only 4 columns)
            const csvHeader = [
                'No',
                'Nama',
                'Telepon',
                'Alamat'
            ].join(',');

            const csvRows = filteredCustomers.map((customer, index) => {
                return [
                    index + 1,
                    `"${customer.name || ''}"`,
                    `"${customer.phone || ''}"`,
                    `"${customer.address || ''}"`
                ].join(',');
            });

            const csvContent = [csvHeader, ...csvRows].join('\n');

            // Add BOM for proper UTF-8 encoding in Excel
            return '\uFEFF' + csvContent;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Export customers data SIMPLIFIED (only 4 columns: No, Nama, Telepon, Alamat)
     * Super fast! No JOINs, no subqueries
     * Max 10k limit
     */
    static async exportCustomersOptimized(search, user_tenant_id = null, user_branch_id = null, user_role = null, branch_id = null, membership_filter = 'all', sort_by = 'newest') {
        try {
            const MAX_EXPORT_LIMIT = 10000;

            // Build search filter
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { '$customers.name$': { [Op.substring]: search } },
                        { '$customers.phone$': { [Op.substring]: search } },
                        { '$customers.email$': { [Op.substring]: search } },
                        { '$customers.address$': { [Op.substring]: search } },
                        { '$customers.city$': { [Op.substring]: search } },
                    ],
                }
                : {};

            // Add data isolation based on user role (sama dengan getAll / exportCustomers)
            let whereClause = { ...searchFilter };

            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (['superadmin', 'admin'].includes(user_role)) {
                // Superadmin & Admin (per tenant) bisa lihat data semua cabang di tenant-nya
                whereClause.tenant_id = user_tenant_id;
            } else {
                // Employee hanya bisa lihat data tenant dan branch-nya
                whereClause.tenant_id = user_tenant_id;
                if (user_branch_id) {
                    whereClause.branch_id = user_branch_id;
                }
            }

            // Add branch filter if specified in query (dropdown "Outlet" di layar)
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }

            // Check count first (untuk validasi)
            const totalCount = await Customer.count({
                where: whereClause
            });

            // Throw error if exceeds limit
            if (totalCount > MAX_EXPORT_LIMIT) {
                throw new Error(`Data terlalu banyak! Maksimal export ${MAX_EXPORT_LIMIT.toLocaleString()} records. Anda memiliki ${totalCount.toLocaleString()} records. Gunakan filter untuk mengurangi data.`);
            }

            // ✅ SIMPLIFIED: Only get 4 fields (super fast!)
            const customers = await Customer.findAll({
                attributes: ['id', 'name', 'phone', 'address'],
                where: whereClause,
                order: [['name', 'ASC']], // Sort by nama abjad A-Z
                limit: MAX_EXPORT_LIMIT // Hard limit!
            });

            // No filtering needed for simple export
            let filteredCustomers = customers;

            // Generate CSV content - SIMPLIFIED (only 4 columns)
            const csvHeader = [
                'No',
                'Nama',
                'Telepon',
                'Alamat'
            ].join(',');

            const csvRows = filteredCustomers.map((customer, index) => {
                return [
                    index + 1,
                    `"${customer.name || ''}"`,
                    `"${customer.phone || ''}"`,
                    `"${customer.address || ''}"`
                ].join(',');
            });

            const csvContent = [csvHeader, ...csvRows].join('\n');

            // Add BOM for proper UTF-8 encoding in Excel
            return '\uFEFF' + csvContent;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getReferralStats(customer_id, user_tenant_id = null) {
        try {
            const { Payment } = require('../models');

            let whereClause = {
                referred_by: customer_id,
                deletedAt: null
            };

            if (user_tenant_id) {
                whereClause.tenant_id = user_tenant_id;
            }

            const referralOrders = await Order.findAll({
                where: whereClause,
                include: [{
                    model: Payment,
                    as: 'payment',
                    attributes: ['final_price'],
                    required: false
                }],
                attributes: ['id', 'entry_date']
            });

            const total_referrals = referralOrders.length;
            const total_revenue = referralOrders.reduce((sum, order) => {
                return sum + (parseFloat(order.payment?.final_price || 0));
            }, 0);

            const last_referral_date = referralOrders.length > 0
                ? referralOrders.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))[0].entry_date
                : null;

            return {
                total_referrals,
                total_revenue: Math.round(total_revenue),
                last_referral_date
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Bulk create customers with transaction
     * @param {Array} customers - Array of customer data objects
     * @param {number} user_tenant_id - Tenant ID for validation
     * @returns {Array} - Array of created customer instances
     */
    static async bulkCreate(customers, user_tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const createdCustomers = [];

            // Insert customers one by one to handle duplicates gracefully
            for (const customerData of customers) {
                try {
                    // Ensure tenant_id is set
                    if (user_tenant_id && !customerData.tenant_id) {
                        customerData.tenant_id = user_tenant_id;
                    }

                    const customer = await Customer.create(customerData, { transaction });
                    createdCustomers.push(customer);
                } catch (error) {
                    // Skip duplicate phone errors, continue with next customer
                    if (error.name === 'SequelizeUniqueConstraintError' ||
                        error.message.includes('unique_tenant_phone') ||
                        error.message.includes('Duplicate entry')) {
                        // Skip this customer, continue with next
                        continue;
                    }
                    // Re-throw other errors
                    throw error;
                }
            }

            await transaction.commit();
            return createdCustomers;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    /**
     * Ambil (atau buat) pelanggan default "walk-in" untuk transaksi tanpa
     * identitas pelanggan, mis. pembeli tiket masuk. Ditandai dengan phone NULL
     * sehingga tidak pernah ikut pencarian nomor HP / poin / referral.
     */
    static async getOrCreateWalkIn(tenant_id, branch_id = null, name = WALK_IN_CUSTOMER_NAME) {
        try {
            if (!tenant_id) throw new Error('Tenant tidak ditemukan');

            const [customer] = await Customer.findOrCreate({
                where: { tenant_id, name, phone: null },
                defaults: {
                    tenant_id,
                    branch_id: branch_id || null,
                    name,
                    phone: null,
                },
            });

            const result = customer.toJSON();
            delete result.password;
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = CustomerRepository;