const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const OrderDetail = require('../models/OrderDetail');
const OrderDetailStatusLog = require('../models/OrderDetailStatusLog');
const ItemStatusPhoto = require('../models/ItemStatusPhoto');
const Payment = require('../models/Payment');
const Treatment = require('../models/Treatment');
const Item = require('../models/Item');
const User = require('../models/User');
const CustomerFollowup = require('../models/CustomerFollowup');
const ReminderLog = require('../models/ReminderLog');
const ShoePhoto = require('../models/ShoesPhoto');
const CustomerMembership = require('../models/CustomerMembership');
const Membership = require('../models/Membership');
const Branch = require('../models/Branch');

class CustomerDetailRepository {
    /**
     * Get customer basic info + summary metrics
     */
    static async getCustomerDetail(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            // Get customer basic info
            const customer = await Customer.findOne({
                where: {
                    id: customer_id,
                    ...(user_role === 'superapp-superadmin' ? {} : 
                        user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                        { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) })
                },
                include: [
                    {
                        model: CustomerMembership,
                        as: 'current_membership',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'payment_id'], // ✅ Include payment_id untuk validasi expired
                        include: [{
                            model: Membership,
                            as: 'membership',
                            attributes: ['id', 'name', 'discount_percentage', 'price']
                        }]
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ]
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get summary metrics
            const summary = await this.getCustomerSummary(customer_id, user_tenant_id, user_branch_id, user_role);

            return {
                customer,
                summary
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer summary metrics
     */
    static async getCustomerSummary(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            // Base where clause for data isolation
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total orders count
            const totalOrders = await Order.count({
                where: {
                    customer_id,
                    ...baseWhere
                }
            });

            // Get total payments count
            const totalPayments = await Payment.count({
                where: {
                    // Payments don't have tenant_id, so we don't filter by it
                },
                include: [{
                    model: Order,
                    as: 'order',
                    where: { 
                        customer_id,
                        ...baseWhere
                    },
                    required: true
                }]
            });

            // Get total items (jumlah BARANG) & total services (jumlah LAYANAN)
            // ⚠️ Dulu dua-duanya query identik → "Total Item" selalu = "Total Service".
            //    Total Item  = COUNT(DISTINCT order_id, item_id): 1 sepatu dengan 2
            //                  layanan tetap 1 item, tapi item_id yang sama di order
            //                  berbeda dihitung terpisah.
            //    Total Service = COUNT(order_details): jumlah pekerjaan, tetap utuh.
            // Pakai raw query supaya bisa COUNT(DISTINCT ...).
            const tenantCondition = user_tenant_id ? `AND o.tenant_id = ${user_tenant_id}` : '';
            const branchCondition = user_branch_id && user_role !== 'superadmin' ? `AND o.branch_id = ${user_branch_id}` : '';

            const itemsServicesQuery = `
                SELECT
                    COUNT(DISTINCT od.order_id, od.item_id) as total_items,
                    COUNT(od.id) as total_services
                FROM order_details od
                INNER JOIN orders o ON od.order_id = o.id
                WHERE o.customer_id = ${customer_id}
                AND o.deletedAt IS NULL
                AND od.deletedAt IS NULL
                ${tenantCondition}
                ${branchCondition}
            `;

            const itemsServicesResult = await sequelize.query(itemsServicesQuery, {
                type: sequelize.QueryTypes.SELECT
            });
            const totalItems = parseInt(itemsServicesResult[0]?.total_items || 0);
            const totalServices = parseInt(itemsServicesResult[0]?.total_services || 0);

            // Get total spend (sum of paid_amount from payments via orders)
            // Use raw query to avoid GROUP BY issues with Payment.sum + include
            
            const totalSpendQuery = `
                SELECT COALESCE(SUM(p.paid_amount), 0) as total_spend
                FROM payments p
                INNER JOIN orders o ON p.id = o.payment_id
                WHERE o.customer_id = ${customer_id}
                AND o.deletedAt IS NULL
                AND p.deletedAt IS NULL
                ${tenantCondition}
                ${branchCondition}
            `;
            
            const totalSpendResult = await sequelize.query(totalSpendQuery, {
                type: sequelize.QueryTypes.SELECT
            });
            const totalSpend = parseFloat(totalSpendResult[0]?.total_spend || 0);

            // Get last order date
            const lastOrder = await Order.findOne({
                where: {
                    customer_id,
                    ...baseWhere
                },
                order: [['createdAt', 'DESC']],
                attributes: ['createdAt']
            });

            // Get follow-up count
            const followUpCount = await CustomerFollowup.count({
                where: {
                    customer_id,
                    ...baseWhere
                }
            });

            // Get reminder count
            const reminderCount = await ReminderLog.count({
                where: {
                    customer_id
                }
            });

            // Calculate next follow-up (simplified - could be more complex)
            const nextFollowUp = await CustomerFollowup.findOne({
                where: {
                    customer_id,
                    ...baseWhere
                },
                order: [['sent_at', 'DESC']],
                attributes: ['sent_at']
            });

            // Calculate next follow-up date (7 days after last follow-up)
            let nextFollowUpDate = null;
            if (nextFollowUp) {
                const lastFollowUpDate = new Date(nextFollowUp.sent_at);
                nextFollowUpDate = new Date(lastFollowUpDate.getTime() + (7 * 24 * 60 * 60 * 1000));
            }

            return {
                total_orders: totalOrders,
                total_payments: totalPayments,
                total_items: totalItems,
                total_services: totalServices,
                total_spend: totalSpend,
                last_order_date: lastOrder ? lastOrder.createdAt : null,
                follow_up_count: followUpCount,
                reminder_count: reminderCount,
                next_follow_up: nextFollowUpDate
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer payment history with pagination
     */
    static async getCustomerPayments(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total count - Find payments through orders
            const totalItems = await Order.count({
                where: { 
                    customer_id,
                    ...baseWhere
                },
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                    where: {
                        deletedAt: null
                    }
                }]
            });

            // Get paginated payments through orders
            const orders = await Order.findAll({
                where: { 
                    customer_id,
                    ...baseWhere
                },
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true,
                    where: {
                        deletedAt: null
                    },
                    attributes: ['id', 'code', 'status', 'final_price', 'total_service', 'subtotal', 'total_discount', 'additional_cost', 'paid_amount', 'remaining_amount', 'due_date', 'notes', 'createdAt', 'updatedAt', 'method', 'total_process_time_cost', 'total_price', 'date', 'money', 'change', 'evidence_photo']
                }],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Extract payments from orders
            const payments = orders.map(order => order.payment);

            const totalPages = Math.ceil(totalItems / limit);

            return {
                payments,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer order history with pagination
     */
    static async getCustomerOrders(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total count
            const totalItems = await Order.count({
                where: {
                    customer_id,
                    ...baseWhere
                }
            });

            // Get paginated orders
            const orders = await Order.findAll({
                where: {
                    customer_id,
                    ...baseWhere
                },
                include: [
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['id', 'code', 'status', 'final_price', 'paid_amount', 'remaining_amount', 'due_date']
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                orders,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer items & services history with pagination
     */
    static async getCustomerItemsServices(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total count
            const totalItems = await OrderDetail.count({
                include: [{
                    model: Order,
                    as: 'order',
                    where: { 
                        customer_id,
                        ...baseWhere
                    },
                    required: true
                }]
            });

            // Get paginated order details with items and treatments
            const itemsServices = await OrderDetail.findAll({
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: { 
                            customer_id,
                            ...baseWhere
                        },
                        required: true,
                        attributes: ['id', 'entry_date', 'order_type', 'createdAt']
                    },
                    {
                        model: Treatment,
                        as: 'treatment',
                        attributes: ['id', 'name', 'type_service', 'description']
                    },
                    {
                        model: Item,
                        as: 'item',
                        attributes: ['id', 'name', 'brand', 'type', 'color', 'material']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                items_services: itemsServices,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer follow-up history with pagination
     */
    static async getCustomerFollowUps(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total count
            const totalItems = await CustomerFollowup.count({
                where: {
                    customer_id,
                    ...baseWhere
                }
            });

            // Get paginated follow-ups
            const followUps = await CustomerFollowup.findAll({
                where: {
                    customer_id,
                    ...baseWhere
                },
                order: [['sent_at', 'DESC']],
                limit: limit,
                offset: offset
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                follow_ups: followUps,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer shoes photos with pagination
     */
    static async getCustomerShoesPhotos(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total count through OrderDetail -> Order relationship
            const totalItems = await ShoePhoto.count({
                include: [{
                    model: OrderDetail,
                    required: true,
                    include: [{
                        model: Order,
                        where: { customer_id, ...baseWhere },
                        required: true
                    }]
                }]
            });

            // Get paginated photos through OrderDetail -> Order relationship
            const photos = await ShoePhoto.findAll({
                include: [{
                    model: OrderDetail,
                    required: true,
                    include: [{
                        model: Order,
                        where: { customer_id, ...baseWhere },
                        required: true,
                        attributes: ['id', 'entry_date', 'order_type', 'createdAt']
                    }]
                }],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                photos,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer progress photos grouped by order details with pagination
     * Using OrderDetailStatusLog with ItemStatusPhoto
     */
    static async getCustomerProgressPhotos(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             user_role === 'superadmin' ? { tenant_id: user_tenant_id } :
                             { tenant_id: user_tenant_id, ...(user_branch_id && { branch_id: user_branch_id }) };

            // Get total count of order details that have status logs with photos
            const countQuery = `
                SELECT COUNT(DISTINCT od.id) as total_count
                FROM order_details od
                JOIN orders o ON od.order_id = o.id
                WHERE o.customer_id = :customer_id
                  AND o.tenant_id = :tenant_id
                  ${user_branch_id ? 'AND o.branch_id = :branch_id' : ''}
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND EXISTS (
                    SELECT 1 FROM order_detail_status_logs odsl
                    JOIN item_status_photos isp ON isp.order_detail_status_log_id = odsl.id
                    WHERE odsl.order_detail_id = od.id
                  )
            `;
            
            const countParams = {
                customer_id,
                tenant_id: user_tenant_id,
                ...(user_branch_id && { branch_id: user_branch_id })
            };
            
            const countResult = await sequelize.query(countQuery, {
                replacements: countParams,
                type: sequelize.QueryTypes.SELECT
            });
            
            const totalItems = countResult[0].total_count;

            // Get paginated order details with status logs and photos
            const orderDetails = await OrderDetail.findAll({
                where: {
                    deletedAt: null
                },
                include: [
                    {
                        model: Order,
                        where: { 
                            customer_id, 
                            ...baseWhere,
                            deletedAt: null
                        },
                        required: true,
                        attributes: ['id', 'entry_date', 'order_type', 'createdAt']
                    },
                    {
                        model: Item,
                        as: 'item',
                        attributes: ['id', 'name', 'brand', 'type', 'color']
                    },
                    {
                        model: Treatment,
                        as: 'treatment',
                        attributes: ['id', 'name']
                    },
                    {
                        model: User,
                        as: 'employee',
                        attributes: ['id', 'name']
                    },
                    {
                        model: OrderDetailStatusLog,
                        as: 'status_logs',
                        where: {
                            // Only status logs that have photos
                        },
                        required: true,
                        attributes: ['id', 'old_status', 'new_status', 'created_at'],
                        include: [{
                            model: ItemStatusPhoto,
                            as: 'item_status_photos',
                            required: true, // Only status logs that have photos
                            attributes: ['id', 'photo_url', 'createdAt'],
                            order: [['createdAt', 'DESC']]
                        }, {
                            model: User,
                            as: 'status_updater',
                            attributes: ['id', 'name']
                        }],
                        order: [['created_at', 'DESC']]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                order_details: orderDetails,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get customer items history (grouped by item_id)
     * Returns distinct items with usage count and last used date
     */
    static async getCustomerItemsHistory(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            let whereClause = 'o.customer_id = :customer_id AND od.item_id IS NOT NULL AND od.deletedAt IS NULL AND o.deletedAt IS NULL';
            const replacements = { customer_id };

            if (user_role !== 'superapp-superadmin') {
                if (user_tenant_id) {
                    whereClause += ' AND o.tenant_id = :tenant_id';
                    replacements.tenant_id = user_tenant_id;
                }
                if (user_branch_id && user_role !== 'superadmin') {
                    whereClause += ' AND o.branch_id = :branch_id';
                    replacements.branch_id = user_branch_id;
                }
            }

            const query = `
                SELECT 
                    od.item_id,
                    i.id as item_id_full,
                    i.name,
                    i.brand,
                    i.type,
                    i.color,
                    i.material,
                    COUNT(od.id) as usage_count,
                    MAX(od.createdAt) as last_used_at
                FROM order_details od
                INNER JOIN orders o ON od.order_id = o.id
                INNER JOIN items i ON od.item_id = i.id
                WHERE ${whereClause}
                GROUP BY od.item_id, i.id, i.name, i.brand, i.type, i.color, i.material
                ORDER BY last_used_at DESC, usage_count DESC
                LIMIT 50
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            const formattedItems = (Array.isArray(results) ? results : []).map(row => ({
                item: {
                    id: row.item_id_full,
                    name: row.name,
                    brand: row.brand,
                    type: row.type,
                    color: row.color,
                    material: row.material
                },
                usage_count: parseInt(row.usage_count) || 0,
                last_used_at: row.last_used_at
            }));

            return formattedItems;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = CustomerDetailRepository;
