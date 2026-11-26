const { TenantPayment, Subscription, Tenant, SubscriptionPlan, Op, sequelize } = require('../models');

class TenantPaymentRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await TenantPayment.create(data, { transaction });
            
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
    };

    static async getAll(search, subscription_id, tenant_id, status, payment_method) {
        try {
            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { payment_reference: { [Op.like]: `%${search}%` } },
                    { notes: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$subscription.plan.name$': { [Op.like]: `%${search}%` } }
                ];
            }

            if (subscription_id) {
                whereClause.subscription_id = subscription_id;
            }

            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            if (status) {
                whereClause.status = status;
            }

            if (payment_method) {
                whereClause.payment_method = payment_method;
            }

            const result = await TenantPayment.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    },
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await TenantPayment.findByPk(id, {
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'final_price'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price', 'duration_days']
                            }
                        ]
                    },
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone']
                    }
                ]
            });

            return result ? result.toJSON() : null;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByIdWithDetails(id) {
        try {
            const result = await TenantPayment.findByPk(id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'status', 'subscription_status']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'plan_id'],
                        include: [
                            {
                                model: SubscriptionPlan,
                                as: 'plan',
                                attributes: ['id', 'name', 'price', 'duration_days']
                            }
                        ]
                    }
                ]
            });

            return result ? result.toJSON() : null;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAllWithDetails(filters = {}, page = 1, pageSize = 10) {
        try {
            const offset = (page - 1) * pageSize;
            const whereClause = {};

            // Apply filters
            if (filters.status) whereClause.status = filters.status;
            if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
            if (filters.payment_method) whereClause.payment_method = filters.payment_method;
            
            if (filters.start_date && filters.end_date) {
                whereClause.createdAt = {
                    [Op.between]: [filters.start_date, filters.end_date]
                };
            }

            // Apply search filter
            if (filters.search) {
                whereClause[Op.or] = [
                    { payment_reference: { [Op.like]: `%${filters.search}%` } },
                    { invoice_number: { [Op.like]: `%${filters.search}%` } },
                    { notes: { [Op.like]: `%${filters.search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${filters.search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${filters.search}%` } }
                ];
            }

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'status', 'subscription_status']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'plan_id'],
                        include: [
                            {
                                model: SubscriptionPlan,
                                as: 'plan',
                                attributes: ['id', 'name', 'price', 'duration_days']
                            }
                        ]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: pageSize,
                offset: offset
            });

            const totalPages = Math.ceil(count / pageSize);

            return {
                payments: rows,
                pagination: {
                    totalCount: count,
                    totalPages: totalPages,
                    currentPage: page,
                    itemsPerPage: pageSize,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPaymentStats() {
        try {
            const stats = await sequelize.query(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL
                GROUP BY status
            `, { type: sequelize.QueryTypes.SELECT });

            const [totalStats] = await sequelize.query(`
                SELECT 
                    COUNT(*) as total_count,
                    SUM(amount) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL
            `, { type: sequelize.QueryTypes.SELECT });

            return {
                by_status: stats || [],
                total: totalStats || { total_count: 0, total_amount: 0 }
            };
        } catch (error) {
            console.error('❌ TenantPaymentRepository.getPaymentStats - Error:', error);
            return {
                by_status: [],
                total: { total_count: 0, total_amount: 0 }
            };
        }
    };

    static async getTabStats() {
        try {
            // Get stats for each tab based on status grouping
            const [unpaidStats] = await sequelize.query(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL 
                AND status IN ('unpaid', 'failed', 'cancelled')
            `, { type: sequelize.QueryTypes.SELECT });

            const [failedStats] = await sequelize.query(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL 
                AND status = 'failed'
            `, { type: sequelize.QueryTypes.SELECT });

            const [pendingStats] = await sequelize.query(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL 
                AND status = 'pending'
            `, { type: sequelize.QueryTypes.SELECT });

            const [paidStats] = await sequelize.query(`
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL 
                AND status = 'paid'
            `, { type: sequelize.QueryTypes.SELECT });

            const [totalStats] = await sequelize.query(`
                SELECT 
                    COUNT(*) as total_count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM tenant_payments 
                WHERE deletedAt IS NULL
            `, { type: sequelize.QueryTypes.SELECT });

            return {
                unpaid: {
                    count: parseInt(unpaidStats.count) || 0,
                    total_amount: parseFloat(unpaidStats.total_amount) || 0
                },
                failed: {
                    count: parseInt(failedStats.count) || 0,
                    total_amount: parseFloat(failedStats.total_amount) || 0
                },
                pending: {
                    count: parseInt(pendingStats.count) || 0,
                    total_amount: parseFloat(pendingStats.total_amount) || 0
                },
                paid: {
                    count: parseInt(paidStats.count) || 0,
                    total_amount: parseFloat(paidStats.total_amount) || 0
                },
                total: {
                    count: parseInt(totalStats.total_count) || 0,
                    total_amount: parseFloat(totalStats.total_amount) || 0
                }
            };
        } catch (error) {
            console.error('❌ TenantPaymentRepository.getTabStats - Error:', error);
            return {
                unpaid: { count: 0, total_amount: 0 },
                failed: { count: 0, total_amount: 0 },
                pending: { count: 0, total_amount: 0 },
                paid: { count: 0, total_amount: 0 },
                total: { count: 0, total_amount: 0 }
            };
        }
    };

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await TenantPayment.update(data, {
                where: { id },
                transaction
            });

            if (result[0] === 0) throw new Error('Tenant payment not found');

            await transaction.commit();

            // Get updated data and serialize it properly
            const updatedPayment = await TenantPayment.findByPk(id, {
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    },
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    }
                ]
            });
            if (!updatedPayment) throw new Error('Tenant payment not found after update');

            return updatedPayment.toJSON();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await TenantPayment.destroy({
                where: { id },
                transaction
            });

            if (result === 0) throw new Error('Tenant payment not found');

            await transaction.commit();

            return { message: 'Tenant payment deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };


    static async getByTenant(tenant_id, statusFilter = null) {
        try {
            const whereClause = { tenant_id };
            
            // Add status filter if provided
            if (statusFilter && Array.isArray(statusFilter) && statusFilter.length > 0) {
                whereClause.status = { [Op.in]: statusFilter };
            }
            
            const result = await TenantPayment.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPendingPayments() {
        try {
            const result = await TenantPayment.findAll({
                where: { status: 'pending' },
                order: [['due_date', 'ASC']],
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name']
                            }
                        ]
                    },
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getOverduePayments() {
        try {
            const result = await TenantPayment.findAll({
                where: {
                    status: 'pending',
                    due_date: {
                        [Op.lt]: new Date()
                    }
                },
                order: [['due_date', 'ASC']],
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name']
                            }
                        ]
                    },
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateStatus(id, status) {
        const transaction = await sequelize.transaction();
        try {
            const result = await TenantPayment.update(
                { status },
                {
                    where: { id },
                    transaction
                }
            );

            if (result[0] === 0) throw new Error('Tenant payment not found');

            await transaction.commit();

            return await this.getById(id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getPaymentStats(id) {
        try {
            // Verify payment exists
            const payment = await TenantPayment.findByPk(id, {
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status', 'final_price'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    },
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name']
                    }
                ]
            });
            if (!payment) throw new Error('Tenant payment not found');

            const stats = {
                payment: {
                    id: payment.id,
                    amount: payment.amount,
                    status: payment.status,
                    due_date: payment.due_date,
                    paid_at: payment.paid_at,
                    invoice_number: payment.invoice_number,
                    payment_method: payment.payment_method,
                    tenant: payment.tenant,
                    subscription: payment.subscription
                },
                status_info: {
                    is_paid: payment.status === 'paid',
                    is_pending: payment.status === 'pending',
                    is_overdue: payment.status === 'pending' && new Date() > payment.due_date,
                    is_failed: payment.status === 'failed',
                    is_cancelled: payment.status === 'cancelled',
                    is_refunded: payment.status === 'refunded'
                },
                timeline: {
                    created_at: payment.createdAt,
                    due_date: payment.due_date,
                    paid_at: payment.paid_at,
                    days_overdue: payment.status === 'pending' && new Date() > payment.due_date ? 
                        Math.ceil((new Date() - payment.due_date) / (1000 * 60 * 60 * 24)) : 0,
                    days_until_due: payment.status === 'pending' && new Date() < payment.due_date ? 
                        Math.ceil((payment.due_date - new Date()) / (1000 * 60 * 60 * 24)) : 0
                },
                subscription_context: {
                    subscription_final_price: payment.subscription?.final_price || 0,
                    payment_percentage: payment.subscription?.final_price > 0 ? 
                        ((payment.amount / payment.subscription.final_price) * 100).toFixed(1) : 0,
                    remaining_amount: payment.subscription?.final_price > 0 ? 
                        payment.subscription.final_price - payment.amount : 0
                }
            };

            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getStats() {
        try {
            const totalPayments = await TenantPayment.count();
            const pendingPayments = await TenantPayment.count({ where: { status: 'pending' } });
            const paidPayments = await TenantPayment.count({ where: { status: 'paid' } });
            const failedPayments = await TenantPayment.count({ where: { status: 'failed' } });
            const cancelledPayments = await TenantPayment.count({ where: { status: 'cancelled' } });
            const refundedPayments = await TenantPayment.count({ where: { status: 'refunded' } });

            // Calculate total revenue
            const revenueResult = await TenantPayment.findOne({
                where: { status: 'paid' },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
                ],
                raw: true
            });

            const totalRevenue = revenueResult?.total_revenue || 0;

            // Calculate overdue payments
            const overduePayments = await TenantPayment.count({
                where: {
                    status: 'pending',
                    due_date: {
                        [Op.lt]: new Date()
                    }
                }
            });

            // Calculate monthly revenue (current month)
            const currentDate = new Date();
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const monthlyRevenueResult = await TenantPayment.findOne({
                where: {
                    status: 'paid',
                    paid_at: {
                        [Op.between]: [startOfMonth, endOfMonth]
                    }
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'monthly_revenue']
                ],
                raw: true
            });

            const monthlyRevenue = monthlyRevenueResult?.monthly_revenue || 0;

            const stats = {
                total_payments: totalPayments,
                pending_payments: pendingPayments,
                paid_payments: paidPayments,
                failed_payments: failedPayments,
                cancelled_payments: cancelledPayments,
                refunded_payments: refundedPayments,
                overdue_payments: overduePayments,
                total_revenue: totalRevenue,
                monthly_revenue: monthlyRevenue,
                payment_rate: totalPayments > 0 ? ((paidPayments / totalPayments) * 100).toFixed(1) : 0,
                overdue_rate: totalPayments > 0 ? ((overduePayments / totalPayments) * 100).toFixed(1) : 0
            };

            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async countByDateRange(startDate, endDate) {
        try {
            const count = await TenantPayment.count({
                where: {
                    createdAt: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });

            return count;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getBySubscription(subscription_id, status = null) {
        try {
            const whereClause = { subscription_id };
            if (status) {
                whereClause.status = status;
            }

            const result = await TenantPayment.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    /**
     * Get unpaid billing for a specific tenant
     * @param {Number} tenantId - Tenant ID
     * @returns {Object|null} - Unpaid billing or null
     */
    static async getUnpaidByTenantId(tenantId) {
        try {
            const result = await TenantPayment.findOne({
                where: {
                    tenant_id: tenantId,
                    status: {
                        [Op.in]: ['unpaid', 'pending']
                    }
                },
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'subscription',
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };
}

module.exports = TenantPaymentRepository;
