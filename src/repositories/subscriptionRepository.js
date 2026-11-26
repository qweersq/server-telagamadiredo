const { Subscription, SubscriptionPlan, Tenant, TenantPayment, Op, sequelize } = require('../models');

class SubscriptionRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await Subscription.create(data, { transaction });
            
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

    static async getAll(search, tenant_id, plan_id, status) {
        try {
            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { notes: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$plan.name$': { [Op.like]: `%${search}%` } }
                ];
            }

            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            if (plan_id) {
                whereClause.plan_id = plan_id;
            }

            if (status) {
                whereClause.status = status;
            }

            const result = await Subscription.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'status']
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days', 'max_branches', 'max_users']
                    },
                    {
                        association: 'payments',
                        attributes: ['id', 'amount', 'status', 'paid_at', 'due_date'],
                        limit: 5 // Limit to avoid memory issues
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
            const result = await Subscription.findByPk(id, {
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'status']
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'description', 'price', 'duration_days', 'max_branches', 'max_users', 'features']
                    },
                    {
                        association: 'payments',
                        attributes: ['id', 'amount', 'status', 'payment_method', 'paid_at', 'due_date', 'invoice_number'],
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getActiveByTenant(tenant_id) {
        try {
            const result = await Subscription.findOne({
                where: {
                    tenant_id: tenant_id,
                    status: 'active'
                },
                include: [
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Subscription.update(data, {
                where: { id },
                transaction
            });

            if (result[0] === 0) throw new Error('Subscription not found');

            await transaction.commit();

            return await this.getById(id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            // Check if subscription has payments
            const paymentsCount = await TenantPayment.count({
                where: { subscription_id: id },
                transaction
            });

            if (paymentsCount > 0) {
                throw new Error('Cannot delete subscription with existing payments');
            }

            const result = await Subscription.destroy({
                where: { id },
                transaction
            });

            if (result === 0) throw new Error('Subscription not found');

            await transaction.commit();

            return { message: 'Subscription deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getByTenant(tenant_id) {
        try {
            const result = await Subscription.findAll({
                where: { tenant_id },
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days', 'max_branches', 'max_users']
                    },
                    {
                        association: 'payments',
                        attributes: ['id', 'amount', 'status', 'paid_at', 'due_date'],
                        limit: 3 // Limit to avoid memory issues
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPendingPaymentByTenant(tenant_id) {
        try {
            const result = await TenantPayment.findOne({
                where: { 
                    tenant_id: tenant_id,
                    status: 'pending'
                },
                order: [['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getActiveSubscriptions() {
        try {
            const result = await Subscription.findAll({
                where: { status: 'active' },
                order: [['end_date', 'ASC']],
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getExpiredSubscriptions() {
        try {
            // ✅ H+1 Logic: end_date + 1 hari <= sekarang (baru dianggap expired)
            // Contoh: end_date = 11 Des 2025, sekarang = 11 Des 2025 → end_date+1 = 12 Des, 12 <= 11 = false (belum expired) ✓
            // Contoh: end_date = 11 Des 2025, sekarang = 12 Des 2025 → end_date+1 = 12 Des, 12 <= 12 = true (expired) ✓
            // Logic: end_date <= (sekarang - 1 hari) = H+1 sudah lewat
            // ✅ FIX: Gunakan timezone WIB (Asia/Jakarta) untuk perhitungan tanggal
            const moment = require('moment-timezone');
            
            // Get current date in WIB timezone
            const nowWIB = moment().tz('Asia/Jakarta');
            const todayWIB = nowWIB.clone().startOf('day'); // Start of today in WIB (00:00:00)
            
            // H+1 threshold: end_date harus <= (today - 1 day) = yesterday
            // Jika hari ini = 11 Des, maka yesterday = 10 Des 23:59:59 WIB
            const yesterdayWIB = todayWIB.clone().subtract(1, 'day').endOf('day'); // End of yesterday in WIB (23:59:59)
            
            // Convert to Date object for Sequelize query (database menyimpan dalam UTC)
            const yesterday = yesterdayWIB.toDate();
            
            console.log('🔍 SubscriptionRepository.getExpiredSubscriptions - H+1 check (WIB):', {
                now_utc: new Date().toISOString(),
                now_wib: nowWIB.format('YYYY-MM-DD HH:mm:ss'),
                today_wib: todayWIB.format('YYYY-MM-DD HH:mm:ss'),
                yesterday_wib: yesterdayWIB.format('YYYY-MM-DD HH:mm:ss'),
                yesterday_utc: yesterday.toISOString(),
                condition: 'end_date <= yesterday (end_date + 1 day <= now)'
            });
            
            const result = await Subscription.findAll({
                where: {
                    // ✅ H+1: Tidak peduli status, cek tanggal saja
                    [Op.and]: [
                        {
                            end_date: {
                                [Op.lte]: yesterday // end_date <= yesterday = end_date + 1 day <= now
                            }
                        },
                        {
                    end_date: {
                                [Op.not]: null // Pastikan end_date tidak null
                            }
                    }
                    ]
                },
                order: [['end_date', 'ASC']],
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getSubscriptionsExpiringSoon(targetDate) {
        try {
            const result = await Subscription.findAll({
                where: {
                    status: 'active',
                    end_date: {
                        [Op.lte]: targetDate,
                        [Op.gte]: new Date() // Still active (not expired yet)
                    }
                },
                order: [['end_date', 'ASC']],
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'status'],
                        include: [
                            {
                                association: 'payments',
                                where: {
                                    status: 'failed' // Check for failed billing
                                },
                                required: false // Include tenants without failed billing
                            }
                        ]
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days']
                    }
                ]
            });

            // Filter out subscriptions from tenants with failed billing
            const eligibleSubscriptions = result.filter(subscription => {
                const tenant = subscription.tenant;
                const hasFailedBilling = tenant.payments.some(p => p.status === 'failed');
                const isTenantSuspended = tenant.status === 'suspended';
                
                // Skip if tenant has failed billing or is suspended
                return !hasFailedBilling && !isTenantSuspended;
            });

            console.log(`📊 Found ${result.length} subscriptions expiring soon, ${eligibleSubscriptions.length} eligible (no failed billing)`);

            return eligibleSubscriptions;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateStatus(id, status) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Subscription.update(
                { status },
                {
                    where: { id },
                    transaction
                }
            );

            if (result[0] === 0) throw new Error('Subscription not found');

            await transaction.commit();

            return await this.getById(id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getSubscriptionStats(id) {
        try {
            // Verify subscription exists
            const subscription = await Subscription.findByPk(id, {
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name']
                    },
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price']
                    }
                ]
            });
            if (!subscription) throw new Error('Subscription not found');

            const [
                totalPayments,
                paidPayments,
                pendingPayments,
                totalPaidAmount,
                overduePayments
            ] = await Promise.all([
                // Total payments count
                TenantPayment.count({ where: { subscription_id: id } }),
                
                // Paid payments count
                TenantPayment.count({ 
                    where: { 
                        subscription_id: id,
                        status: 'paid'
                    }
                }),
                
                // Pending payments count
                TenantPayment.count({ 
                    where: { 
                        subscription_id: id,
                        status: 'pending'
                    }
                }),
                
                // Total paid amount
                TenantPayment.sum('amount', { 
                    where: { 
                        subscription_id: id,
                        status: 'paid'
                    }
                }),
                
                // Overdue payments count
                TenantPayment.count({ 
                    where: { 
                        subscription_id: id,
                        status: 'pending',
                        due_date: {
                            [Op.lt]: new Date()
                        }
                    }
                })
            ]);

            const stats = {
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    start_date: subscription.start_date,
                    end_date: subscription.end_date,
                    final_price: subscription.final_price,
                    tenant: subscription.tenant,
                    plan: subscription.plan
                },
                payments: {
                    total: totalPayments,
                    paid: paidPayments,
                    pending: pendingPayments,
                    overdue: overduePayments
                },
                revenue: {
                    total_paid: totalPaidAmount || 0,
                    remaining: subscription.final_price - (totalPaidAmount || 0),
                    completion_percentage: subscription.final_price > 0 ? 
                        (((totalPaidAmount || 0) / subscription.final_price) * 100).toFixed(1) : 0
                },
                status_summary: {
                    is_active: subscription.status === 'active',
                    is_expired: subscription.status === 'expired' || 
                        (subscription.status === 'active' && new Date() > subscription.end_date),
                    has_overdue_payments: overduePayments > 0,
                    payment_completion: subscription.final_price > 0 ? 
                        ((totalPaidAmount || 0) / subscription.final_price) * 100 : 100
                }
            };

            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getLatestSubscription(tenantId) {
        try {
            const result = await Subscription.findOne({
                where: {
                    tenant_id: tenantId
                },
                order: [['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };
}

module.exports = SubscriptionRepository;
