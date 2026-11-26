const { Tenant, Branch, User, Customer, Order, Op, sequelize } = require('../models');

class TenantRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            console.log('🔍 TenantRepository - Creating tenant:', {
                business_name: data.business_name,
                owner_name: data.owner_name,
                email: data.email,
                phone: data.phone,
                city: data.city,
                status: data.status,
                subscription_status: data.subscription_status
            });

            const result = await Tenant.create(data, { transaction });
            
            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            console.log('✅ TenantRepository - Tenant created successfully:', {
                id: result.id,
                business_name: result.business_name,
                email: result.email
            });

            return result;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            
            console.error('❌ TenantRepository - Error creating tenant:', {
                error: error.message,
                stack: error.stack,
                data: {
                    business_name: data.business_name,
                    owner_name: data.owner_name,
                    email: data.email,
                    phone: data.phone,
                    city: data.city,
                    status: data.status,
                    subscription_status: data.subscription_status
                }
            });
            
            throw new Error(error.message);
        }
    };

    static async getAll(search, status, subscription_status, tenant_id) {
        try {
            const whereClause = {};
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.id = tenant_id;
            }
            
            if (search) {
                whereClause[Op.or] = [
                    { business_name: { [Op.like]: `%${search}%` } },
                    { owner_name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } }
                ];
            }

            if (status) {
                whereClause.status = status;
            }

            if (subscription_status) {
                whereClause.subscription_status = subscription_status;
            }

            const result = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'subscriptions',
                        include: [
                            {
                                association: 'plan'
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

    static async getAllWithPagination(search, status, subscription_status, tenant_id, page = 1, limit = 10, offset = 0, tab = null) {
        try {
            const whereClause = {};
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.id = tenant_id;
            }
            
            if (search) {
                whereClause[Op.or] = [
                    { business_name: { [Op.like]: `%${search}%` } },
                    { owner_name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } }
                ];
            }

            if (status) {
                whereClause.status = status;
            }

            if (subscription_status) {
                whereClause.subscription_status = subscription_status;
            }

            // Tab-based filtering (updated logic with expired_tenant)
            if (tab) {
                // Define today's date range for all cases that need it
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                
                switch (tab) {
                    case 'unverified':
                        // Unverified: trial status AND not verified
                        whereClause[Op.and] = [
                            { status: 'trial' },
                            { subscription_status: 'trial' },
                            { is_verified: false }
                        ];
                        break;
                    case 'active_trial':
                        // Active trial: trial status AND verified AND trial not expired AND not ending today
                        whereClause[Op.and] = [
                            { status: 'trial' },
                            { subscription_status: 'trial' },
                            { is_verified: true },
                            { trial_end_date: { [Op.gt]: todayEnd } }
                        ];
                        break;
                    case 'last_access_trial':
                        // Last Access Trial: trial status AND verified AND trial ends today
                        whereClause[Op.and] = [
                            { status: 'trial' },
                            { subscription_status: 'trial' },
                            { is_verified: true },
                            { 
                                trial_end_date: { 
                                    [Op.gte]: todayStart,
                                    [Op.lte]: todayEnd
                                }
                            }
                        ];
                        break;
                    case 'expired_trial':
                        // Expired trial: trial status AND verified AND trial expired
                        whereClause[Op.and] = [
                            { status: 'trial' },
                            { subscription_status: 'trial' },
                            { is_verified: true },
                            { trial_end_date: { [Op.lte]: new Date() } }
                        ];
                        break;
                    case 'active':
                        // Active: active status AND active subscription (no subscription filter here, will filter in application layer)
                        whereClause[Op.and] = [
                            { status: 'active' },
                            { subscription_status: 'active' }
                        ];
                        break;
                    case 'last_access_subscription':
                        // Last Access Subscription: active status AND active subscription (will filter by subscription end date in application layer)
                        whereClause[Op.and] = [
                            { status: 'active' },
                            { subscription_status: 'active' }
                        ];
                        break;
                    case 'expired_tenant':
                        // Expired Tenant: verified AND (inactive/suspended status OR expired/cancelled subscription)
                        whereClause[Op.and] = [
                            { is_verified: true },
                            {
                                [Op.or]: [
                                    { status: 'inactive' },
                                    { status: 'suspended' },
                                    { subscription_status: 'expired' },
                                    { subscription_status: 'cancelled' }
                                ]
                            }
                        ];
                        break;
                }
            }

            // Get total count for pagination
            const totalCount = await Tenant.count({ where: whereClause });

            // For tabs that need application layer filtering, get all results first
            const needsApplicationFiltering = tab === 'active' || tab === 'last_access_subscription' || tab === 'last_access_trial';
            
            // Build query options
            const queryOptions = {
                where: whereClause,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        association: 'subscriptions',
                        include: [
                            {
                                association: 'plan'
                            }
                        ]
                    }
                ]
            };
            
            // Only add limit and offset if not using application layer filtering
            if (!needsApplicationFiltering) {
                queryOptions.limit = limit;
                queryOptions.offset = offset;
            } else {
                // For application layer filtering, use limit: 0 to remove limit
                queryOptions.limit = 0;
            }

            // Get results
            const result = await Tenant.findAll(queryOptions);

            // Apply additional filtering for subscription-based tabs and trial-based tabs
            let filteredResult = result;
            if (tab === 'active' || tab === 'last_access_subscription' || tab === 'last_access_trial') {
                // Define today's date range for filtering
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                
                console.log(`🔍 DEBUG [${tab}]: Total data from DB: ${result.length}`);
                console.log(`🔍 DEBUG [${tab}]: Date range - Start: ${todayStart.toISOString()}, End: ${todayEnd.toISOString()}`);
                
                filteredResult = result.filter(tenant => {
                    if (tab === 'last_access_trial') {
                        // Filter for trials ending today
                        if (!tenant.trial_end_date) {
                            console.log(`❌ DEBUG [${tab}]: Tenant ${tenant.id} - No trial_end_date`);
                            return false;
                        }
                        const trialEndDate = new Date(tenant.trial_end_date);
                        const inRange = trialEndDate >= todayStart && trialEndDate <= todayEnd;
                        console.log(`🔍 DEBUG [${tab}]: Tenant ${tenant.id} (${tenant.business_name}) - trial_end_date: ${tenant.trial_end_date}, inRange: ${inRange}`);
                        return inRange;
                    } else if (tab === 'active' || tab === 'last_access_subscription') {
                        if (!tenant.subscriptions || tenant.subscriptions.length === 0) {
                            console.log(`🔍 DEBUG [${tab}]: Tenant ${tenant.id} - No subscriptions, returning ${tab === 'active'}`);
                            return tab === 'active'; // Active tab includes tenants without subscriptions
                        }
                        
                        const activeSubscription = tenant.subscriptions[0];
                        if (activeSubscription.status !== 'active') {
                            console.log(`❌ DEBUG [${tab}]: Tenant ${tenant.id} - Subscription not active: ${activeSubscription.status}`);
                            return false;
                        }
                        
                        if (tab === 'last_access_subscription') {
                            // Filter for subscriptions ending today
                            const subEndDate = new Date(activeSubscription.end_date);
                            const inRange = subEndDate >= todayStart && subEndDate <= todayEnd;
                            console.log(`🔍 DEBUG [${tab}]: Tenant ${tenant.id} - sub_end_date: ${activeSubscription.end_date}, inRange: ${inRange}`);
                            return inRange;
                        } else if (tab === 'active') {
                            // Filter for subscriptions not ending today
                            const subEndDate = new Date(activeSubscription.end_date);
                            const notEndingToday = subEndDate > todayEnd;
                            console.log(`🔍 DEBUG [${tab}]: Tenant ${tenant.id} - sub_end_date: ${activeSubscription.end_date}, notEndingToday: ${notEndingToday}`);
                            return notEndingToday;
                        }
                    }
                    
                    return true;
                });
                
                console.log(`✅ DEBUG [${tab}]: Filtered result count: ${filteredResult.length}`);
            }

            // Calculate pagination metadata
            const actualTotalCount = filteredResult.length;
            
            // For application layer filtering, apply pagination after filtering
            let finalResult = filteredResult;
            let paginationMeta;
            
            if (needsApplicationFiltering) {
                // Apply pagination after filtering
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                finalResult = filteredResult.slice(startIndex, endIndex);
                
                const totalPages = Math.ceil(actualTotalCount / limit);
                const hasNextPage = page < totalPages;
                const hasPrevPage = page > 1;
                
                paginationMeta = {
                    current_page: page,
                    total_pages: totalPages,
                    total_count: actualTotalCount,
                    per_page: limit,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage,
                    next_page: hasNextPage ? page + 1 : null,
                    prev_page: hasPrevPage ? page - 1 : null
                };
            } else {
                // Use original pagination for database-level filtering
                const totalPages = Math.ceil(totalCount / limit);
                const hasNextPage = page < totalPages;
                const hasPrevPage = page > 1;
                
                paginationMeta = {
                    current_page: page,
                    total_pages: totalPages,
                    total_count: totalCount,
                    per_page: limit,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage,
                    next_page: hasNextPage ? page + 1 : null,
                    prev_page: hasPrevPage ? page - 1 : null
                };
            }

            return {
                data: finalResult,
                pagination: paginationMeta
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await Tenant.findByPk(id, {
                include: [
                    {
                        association: 'branches',
                        limit: 10 // Limit branches to avoid memory issues
                    },
                    {
                        association: 'users',
                        limit: 10, // Limit users to avoid memory issues
                        attributes: ['id', 'name', 'email', 'role', 'status'] // Only essential fields
                    },
                    {
                        association: 'customers',
                        limit: 10, // Limit customers to avoid memory issues
                        attributes: ['id', 'name', 'phone', 'email'] // Only essential fields
                    },
                    {
                        association: 'orders',
                        limit: 10, // Limit orders to avoid memory issues
                        attributes: ['id', 'entry_date', 'quantity', 'order_type', 'createdAt'] // Only essential fields
                    },
                    {
                        association: 'subscriptions',
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price', 'duration_days'] // Only essential fields
                            },
                            {
                                association: 'payments',
                                limit: 5, // Limit payments to avoid memory issues
                                attributes: ['id', 'amount', 'status', 'paid_at'] // Only essential fields
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

    static async getByIdOptimized(id) {
        try {
            // Get tenant basic info
            const tenant = await Tenant.findByPk(id, {
                attributes: [
                    'id', 'business_name', 'owner_name', 'email', 'phone', 
                    'address', 'city', 'status', 'subscription_status', 'trial_end_date', 'is_verified'
                ],
                include: [
                    {
                        association: 'users',
                        where: { role: 'superadmin' },
                        attributes: ['id', 'name', 'email', 'role', 'status'],
                        required: false
                    }
                ]
            });

            if (!tenant) {
                return null;
            }

            // Get subscriptions with plan data using raw query
            const subscriptionsQuery = `
                SELECT 
                    s.id, s.status, s.start_date, s.end_date,
                    sp.id as plan_id, sp.name as plan_name, sp.price as plan_price, sp.duration_days
                FROM subscriptions s
                LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
                WHERE s.tenant_id = ? AND s.deletedAt IS NULL
                ORDER BY s.id DESC
            `;
            
            const subscriptions = await sequelize.query(subscriptionsQuery, {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            });

            // Format subscriptions data
            const formattedSubscriptions = subscriptions.map(sub => ({
                id: sub.id,
                status: sub.status,
                start_date: sub.start_date,
                end_date: sub.end_date,
                plan: {
                    id: sub.plan_id,
                    name: sub.plan_name,
                    price: sub.plan_price,
                    duration_days: sub.duration_days
                }
            }));

            // Add subscriptions to tenant
            tenant.dataValues.subscriptions = formattedSubscriptions;

            // Find active subscription
            const activeSubscription = formattedSubscriptions.find(sub => sub.status === 'active');
            
            // Add computed fields
            tenant.dataValues.active_subscription = activeSubscription || null;
            tenant.dataValues.display_status = this.getDisplayStatus(tenant, activeSubscription);

            return tenant;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    /**
     * Get comprehensive tenant details with analytics for superapp admin
     */
    static async getTenantDetailAnalytics(tenantId) {
        try {
            const { Op } = require('sequelize');
            const { 
                Tenant, Branch, User, Customer, Order, Treatment, Item, 
                Subscription, TenantPayment, WaSession, TenantOnboarding,
                FollowupUsageLimit, ReminderLog, InvoiceAccessLog
            } = require('../models');

            // Get basic tenant info with all relations
            const tenant = await Tenant.findByPk(tenantId, {
                include: [
                    {
                        association: 'branches',
                        attributes: ['id', 'name', 'address', 'phone', 'city', 'status', 'createdAt']
                    },
                    {
                        association: 'subscriptions',
                        include: [
                            {
                                association: 'plan',
                                attributes: ['id', 'name', 'price', 'duration_days', 'features']
                            }
                        ],
                        order: [['createdAt', 'DESC']],
                        limit: 50 // Increase limit to get all subscriptions
                    }
                ]
            });

            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Get business metrics
            const businessMetrics = await this.getBusinessMetrics(tenantId);
            
            // Get user activity metrics
            const userActivity = await this.getUserActivityMetrics(tenantId);
            
            // Get subscription and payment info
            const subscriptionInfo = await this.getSubscriptionInfo(tenantId);
            
            // Get WhatsApp integration info
            const whatsappInfo = await this.getWhatsappInfo(tenantId);
            
            // Get onboarding info
            const onboardingInfo = await this.getOnboardingInfo(tenantId);
            
            // Get recent activity
            const recentActivity = await this.getRecentActivity(tenantId);
            
            // Get performance metrics
            const performanceMetrics = await this.getPerformanceMetrics(tenantId);

            // Get latest active or trial subscription untuk subscription_start_date dan subscription_end_date
            // (sama seperti activeTenantPaymentController)
            const activeSubscription = tenant.subscriptions && tenant.subscriptions.length > 0 
                ? tenant.subscriptions
                    .filter(sub => sub.status === 'active' || sub.status === 'trial') // Include both trial and active
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] // Ambil yang terbaru
                : null;

            // Combine all data
            const result = {
                // Basic tenant info
                id: tenant.id,
                business_name: tenant.business_name,
                owner_name: tenant.owner_name,
                email: tenant.email,
                phone: tenant.phone,
                address: tenant.address,
                city: tenant.city,
                status: tenant.status,
                subscription_status: tenant.subscription_status,
                trial_end_date: tenant.trial_end_date,
                subscription_start_date: activeSubscription?.start_date || null,
                subscription_end_date: activeSubscription?.end_date || null,
                is_verified: tenant.is_verified,
                verified_at: tenant.verified_at,
                created_at: tenant.createdAt,
                updated_at: tenant.updatedAt,
                
                // Relations
                branches: tenant.branches,
                subscriptions: tenant.subscriptions,
                
                // Analytics data
                analytics: {
                    business_metrics: businessMetrics,
                    user_activity: userActivity,
                    subscription_info: subscriptionInfo,
                    whatsapp_info: whatsappInfo,
                    onboarding_info: onboardingInfo,
                    recent_activity: recentActivity,
                    performance_metrics: performanceMetrics
                }
            };

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get business metrics for tenant
     */
    static async getBusinessMetrics(tenantId) {
        try {
            const { Op } = require('sequelize');
            const { Branch, Customer, Order, Treatment, Item } = require('../models');

            // Get counts
            const [branchesCount, customersCount, ordersCount, treatmentsCount, itemsCount] = await Promise.all([
                Branch.count({ where: { tenant_id: tenantId } }),
                Customer.count({ where: { tenant_id: tenantId } }),
                Order.count({ where: { tenant_id: tenantId } }),
                Treatment.count({ where: { tenant_id: tenantId } }),
                Item.count({ where: { tenant_id: tenantId } })
            ]);

            // Get active counts (only branches have status column)
            const activeBranches = await Branch.count({ where: { tenant_id: tenantId, status: 'active' } });
            
            // Customers, treatments, and items don't have status column, so all are considered active
            const activeCustomers = customersCount;
            const activeTreatments = treatmentsCount;
            const activeItems = itemsCount;

            // Get this month's data
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);

            const [newCustomersThisMonth, ordersThisMonth] = await Promise.all([
                Customer.count({ 
                    where: { 
                        tenant_id: tenantId,
                        createdAt: { [Op.gte]: thisMonth }
                    } 
                }),
                Order.count({ 
                    where: { 
                        tenant_id: tenantId,
                        createdAt: { [Op.gte]: thisMonth }
                    } 
                })
            ]);

            // Get revenue data from payment_details through orders
            const { sequelize } = require('../models');
            const revenueData = await sequelize.query(`
                SELECT 
                    COUNT(DISTINCT o.id) as total_orders,
                    COALESCE(SUM(pd.amount), 0) as total_revenue
                FROM orders o
                LEFT JOIN payment_details pd ON pd.payment_id = o.payment_id
                WHERE o.tenant_id = :tenantId AND o.deletedAt IS NULL
            `, {
                replacements: { tenantId },
                type: sequelize.QueryTypes.SELECT
            });

            const thisMonthRevenue = await sequelize.query(`
                SELECT 
                    COALESCE(SUM(pd.amount), 0) as revenue_this_month
                FROM orders o
                LEFT JOIN payment_details pd ON pd.payment_id = o.payment_id
                WHERE o.tenant_id = :tenantId 
                AND o.createdAt >= :thisMonth 
                AND o.deletedAt IS NULL
            `, {
                replacements: { tenantId, thisMonth },
                type: sequelize.QueryTypes.SELECT
            });

            return {
                branches_count: branchesCount,
                active_branches: activeBranches,
                customers_count: customersCount,
                active_customers: activeCustomers,
                new_customers_this_month: newCustomersThisMonth,
                orders_count: ordersCount,
                orders_this_month: ordersThisMonth,
                treatments_count: treatmentsCount,
                active_treatments: activeTreatments,
                items_count: itemsCount,
                active_items: activeItems,
                total_revenue: parseFloat(revenueData[0]?.total_revenue || 0),
                revenue_this_month: parseFloat(thisMonthRevenue[0]?.revenue_this_month || 0)
            };
        } catch (error) {
            console.error('Error getting business metrics:', error);
            return {
                branches_count: 0,
                active_branches: 0,
                customers_count: 0,
                active_customers: 0,
                new_customers_this_month: 0,
                orders_count: 0,
                orders_this_month: 0,
                treatments_count: 0,
                active_treatments: 0,
                items_count: 0,
                active_items: 0,
                total_revenue: 0,
                revenue_this_month: 0
            };
        }
    }

    /**
     * Get user activity metrics
     */
    static async getUserActivityMetrics(tenantId) {
        try {
            const { User } = require('../models');

            const [usersCount, activeUsers, superadminUsers] = await Promise.all([
                User.count({ where: { tenant_id: tenantId } }),
                User.count({ where: { tenant_id: tenantId, status: 'active' } }),
                User.count({ where: { tenant_id: tenantId, role: 'superadmin' } })
            ]);

            return {
                users_count: usersCount,
                active_users: activeUsers,
                superadmin_users: superadminUsers,
                employees_count: usersCount - superadminUsers
            };
        } catch (error) {
            console.error('Error getting user activity metrics:', error);
            return {};
        }
    }

    /**
     * Get subscription and payment info
     */
    static async getSubscriptionInfo(tenantId) {
        try {
            const { Subscription, TenantPayment } = require('../models');
            const { Op } = require('sequelize');

            // Get latest active or trial subscription (sama seperti activeTenantPaymentController)
            const currentSubscription = await Subscription.findOne({
                where: { 
                    tenant_id: tenantId,
                    status: { [Op.in]: ['trial', 'active'] } // Include both trial and active
                },
                order: [['createdAt', 'DESC']], // Ambil yang terbaru
                include: [
                    {
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days', 'features']
                    }
                ]
            });

            // Get payment stats
            const paymentStats = await TenantPayment.findOne({
                where: { tenant_id: tenantId },
                attributes: [
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total_payments'],
                    [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total_paid_amount'],
                    [require('sequelize').fn('MAX', require('sequelize').col('paid_at')), 'last_payment_date']
                ],
                raw: true
            });

            const successfulPayments = await TenantPayment.count({
                where: { tenant_id: tenantId, status: 'paid' }
            });

            const failedPayments = await TenantPayment.count({
                where: { tenant_id: tenantId, status: 'failed' }
            });

            return {
                current_plan: currentSubscription?.plan?.name || 'Trial',
                plan_price: currentSubscription?.plan?.price || 0,
                subscription_status: currentSubscription?.status || 'trial',
                auto_renew: currentSubscription?.auto_renew || false,
                start_date: currentSubscription?.start_date,
                end_date: currentSubscription?.end_date,
                total_payments: parseInt(paymentStats?.total_payments || 0),
                successful_payments: successfulPayments,
                failed_payments: failedPayments,
                total_paid_amount: parseFloat(paymentStats?.total_paid_amount || 0),
                last_payment_date: paymentStats?.last_payment_date
            };
        } catch (error) {
            console.error('Error getting subscription info:', error);
            return {};
        }
    }

    /**
     * Get WhatsApp integration info
     */
    static async getWhatsappInfo(tenantId) {
        try {
            const { WaSession, ReminderLog } = require('../models');

            const [waSessionsCount, activeWaSessions, lastWaActivity] = await Promise.all([
                WaSession.count({ where: { tenant_id: tenantId } }),
                WaSession.count({ where: { tenant_id: tenantId, status: 'READY' } }),
                WaSession.findOne({
                    where: { tenant_id: tenantId },
                    order: [['last_activity', 'DESC']],
                    attributes: ['last_activity']
                })
            ]);

            // Get reminder stats through orders
            const { sequelize } = require('../models');
            const reminderStats = await sequelize.query(`
                SELECT 
                    COUNT(rl.id) as total_reminders,
                    COUNT(CASE WHEN rl.status = 'sent' THEN 1 END) as successful_reminders
                FROM reminder_logs rl
                JOIN orders o ON rl.order_id = o.id
                WHERE o.tenant_id = :tenantId AND o.deletedAt IS NULL
            `, {
                replacements: { tenantId },
                type: sequelize.QueryTypes.SELECT
            });

            const totalReminders = parseInt(reminderStats[0]?.total_reminders || 0);
            const successfulReminders = parseInt(reminderStats[0]?.successful_reminders || 0);
            const successRate = totalReminders > 0 ? (successfulReminders / totalReminders) * 100 : 0;

            return {
                wa_sessions_count: waSessionsCount,
                active_wa_sessions: activeWaSessions,
                last_wa_activity: lastWaActivity?.last_activity,
                reminders_sent: totalReminders,
                reminder_success_rate: Math.round(successRate * 100) / 100
            };
        } catch (error) {
            console.error('Error getting WhatsApp info:', error);
            return {
                wa_sessions_count: 0,
                active_wa_sessions: 0,
                last_wa_activity: null,
                reminders_sent: 0,
                reminder_success_rate: 0
            };
        }
    }

    /**
     * Get onboarding info
     */
    static async getOnboardingInfo(tenantId) {
        try {
            const { TenantOnboarding } = require('../models');

            const onboarding = await TenantOnboarding.findOne({
                where: { tenant_id: tenantId }
            });

            if (!onboarding) {
                return {
                    onboarding_status: 'not_started',
                    current_step: null,
                    completed_steps: [],
                    is_completed: false
                };
            }

            const daysToComplete = onboarding.completed_at && onboarding.started_at ? 
                Math.ceil((new Date(onboarding.completed_at) - new Date(onboarding.started_at)) / (1000 * 60 * 60 * 24)) : null;

            return {
                onboarding_status: onboarding.is_completed ? 'completed' : 'in_progress',
                current_step: onboarding.current_step,
                completed_steps: onboarding.completed_steps || [],
                is_completed: onboarding.is_completed,
                started_at: onboarding.started_at,
                completed_at: onboarding.completed_at,
                days_to_complete: daysToComplete
            };
        } catch (error) {
            console.error('Error getting onboarding info:', error);
            return {};
        }
    }

    /**
     * Get recent activity
     */
    static async getRecentActivity(tenantId) {
        try {
            const { Op } = require('sequelize');
            const { Order, Customer, User, WaSession } = require('../models');

            // Get last order with amount from payment_details
            const { sequelize } = require('../models');
            const lastOrder = await sequelize.query(`
                SELECT 
                    o.id,
                    o.createdAt,
                    COALESCE(SUM(pd.amount), 0) as total_amount
                FROM orders o
                LEFT JOIN payment_details pd ON pd.payment_id = o.payment_id
                WHERE o.tenant_id = :tenantId AND o.deletedAt IS NULL
                GROUP BY o.id, o.createdAt
                ORDER BY o.createdAt DESC
                LIMIT 1
            `, {
                replacements: { tenantId },
                type: sequelize.QueryTypes.SELECT
            });

            // Get last customer registration
            const lastCustomer = await Customer.findOne({
                where: { tenant_id: tenantId },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'name', 'createdAt']
            });

            // Get last user login (using updatedAt as proxy)
            const lastUserActivity = await User.findOne({
                where: { tenant_id: tenantId },
                order: [['updatedAt', 'DESC']],
                attributes: ['id', 'name', 'updatedAt']
            });

            // Get last WA activity
            const lastWaActivity = await WaSession.findOne({
                where: { tenant_id: tenantId },
                order: [['last_activity', 'DESC']],
                attributes: ['last_activity']
            });

            return {
                last_order_date: lastOrder[0]?.createdAt,
                last_order_amount: lastOrder[0]?.total_amount,
                last_customer_registration: lastCustomer?.createdAt,
                last_customer_name: lastCustomer?.name,
                last_user_activity: lastUserActivity?.updatedAt,
                last_wa_activity: lastWaActivity?.last_activity,
                last_system_activity: lastOrder[0]?.createdAt || lastCustomer?.createdAt
            };
        } catch (error) {
            console.error('Error getting recent activity:', error);
            return {};
        }
    }

    /**
     * Get performance metrics
     */
    static async getPerformanceMetrics(tenantId) {
        try {
            const { Op } = require('sequelize');
            const { Order, Customer } = require('../models');

            // Get engagement score based on recent activity
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [recentOrders, recentCustomers] = await Promise.all([
                Order.count({
                    where: {
                        tenant_id: tenantId,
                        createdAt: { [Op.gte]: thirtyDaysAgo }
                    }
                }),
                Customer.count({
                    where: {
                        tenant_id: tenantId,
                        createdAt: { [Op.gte]: thirtyDaysAgo }
                    }
                })
            ]);

            // Calculate engagement score (0-100)
            const engagementScore = Math.min(100, (recentOrders * 10) + (recentCustomers * 5));

            // Get average metrics from payment_details
            const { sequelize } = require('../models');
            const avgMetrics = await sequelize.query(`
                SELECT 
                    COUNT(DISTINCT o.id) as total_orders,
                    COALESCE(AVG(pd.amount), 0) as avg_order_value
                FROM orders o
                LEFT JOIN payment_details pd ON pd.payment_id = o.payment_id
                WHERE o.tenant_id = :tenantId AND o.deletedAt IS NULL
            `, {
                replacements: { tenantId },
                type: sequelize.QueryTypes.SELECT
            });

            const totalOrders = parseInt(avgMetrics[0]?.total_orders || 0);
            const avgOrderValue = parseFloat(avgMetrics[0]?.avg_order_value || 0);
            const ordersPerDay = totalOrders > 0 ? totalOrders / 30 : 0;

            return {
                engagement_score: Math.round(engagementScore),
                activity_level: engagementScore > 70 ? 'high' : engagementScore > 30 ? 'medium' : 'low',
                orders_per_day: Math.round(ordersPerDay * 100) / 100,
                average_order_value: Math.round(avgOrderValue),
                total_orders: totalOrders
            };
        } catch (error) {
            console.error('Error getting performance metrics:', error);
            return {};
        }
    }

    static getDisplayStatus(tenant, activeSubscription) {
        // Priority logic: active subscription > trial > tenant status
        if (activeSubscription) {
            return {
                type: 'subscription',
                name: activeSubscription.plan?.name || 'Unknown Plan',
                status: 'active',
                end_date: activeSubscription.end_date
            };
        } else if (tenant.trial_end_date) {
            return {
                type: 'trial',
                name: 'Trial',
                status: tenant.subscription_status,
                end_date: tenant.trial_end_date
            };
        } else {
            return {
                type: 'tenant',
                name: tenant.status,
                status: tenant.status,
                end_date: null
            };
        }
    };

    static async getByEmail(email) {
        try {
            const result = await Tenant.findOne({
                where: { email }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(id, data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await Tenant.update(data, {
                where: { id },
                transaction
            });

            if (result[0] === 0) throw new Error('Tenant not found');

            if (shouldCreateTransaction) {
                await transaction.commit();
                return await this.getById(id);
            } else {
                // If using external transaction, just return the updated data
                return await Tenant.findByPk(id, { transaction });
            }
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Tenant.destroy({
                where: { id },
                transaction
            });

            if (result === 0) throw new Error('Tenant not found');

            await transaction.commit();

            return { message: 'Tenant deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getTrialTenants() {
        try {
            const result = await Tenant.findAll({
                where: {
                    status: 'trial',
                    trial_end_date: {
                        [Op.lte]: new Date()
                    }
                },
                order: [['trial_end_date', 'ASC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getExpiredSubscriptions() {
        try {
            const result = await Tenant.findAll({
                where: {
                    subscription_status: 'active',
                    '$subscriptions.end_date$': {
                        [Op.lte]: new Date()
                    }
                },
                include: [
                    {
                        association: 'subscriptions',
                        where: {
                            status: 'active',
                            end_date: {
                                [Op.lte]: new Date()
                            }
                        },
                        required: true
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateSubscriptionStatus(tenantId, status) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Tenant.update(
                { subscription_status: status },
                {
                    where: { id: tenantId },
                    transaction
                }
            );

            if (result[0] === 0) throw new Error('Tenant not found');

            await transaction.commit();

            return await this.getById(tenantId);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getTrialTenantsEndingToday(startDate, endDate) {
        try {
            const { TenantPayment } = require('../models');
            
            const result = await Tenant.findAll({
                where: {
                    status: 'trial', // Only trial tenants
                    trial_end_date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    {
                        model: TenantPayment,
                        as: 'payments',
                        where: {
                            status: 'failed' // Skip tenants with failed billing
                        },
                        required: false // Include tenants without failed billing
                    }
                ],
                attributes: ['id', 'business_name', 'owner_name', 'email', 'trial_end_date'],
                order: [['trial_end_date', 'ASC']]
            });

            // Filter out tenants with failed billing
            const eligibleTenants = result.filter(tenant => {
                const hasFailedBilling = tenant.payments.some(p => p.status === 'failed');
                return !hasFailedBilling; // Only include tenants without failed billing
            });

            console.log(`📊 Found ${result.length} trial tenants ending today, ${eligibleTenants.length} eligible (no failed billing)`);
            
            return eligibleTenants;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getExpiredTrialTenants() {
        try {
            // ✅ H+1 Logic: trial_end_date + 1 hari <= sekarang (baru dianggap expired)
            // ✅ FIX: Gunakan timezone WIB (Asia/Jakarta) untuk perhitungan tanggal
            const moment = require('moment-timezone');
            
            // Get current date in WIB timezone
            const nowWIB = moment().tz('Asia/Jakarta');
            const todayWIB = nowWIB.clone().startOf('day'); // Start of today in WIB (00:00:00)
            
            // H+1 threshold: trial_end_date harus <= (today - 1 day) = yesterday
            const yesterdayWIB = todayWIB.clone().subtract(1, 'day').endOf('day'); // End of yesterday in WIB (23:59:59)
            
            // Convert to Date object for Sequelize query
            const yesterday = yesterdayWIB.toDate();
            
            console.log('🔍 TenantRepository.getExpiredTrialTenants - H+1 check (WIB):', {
                now_wib: nowWIB.format('YYYY-MM-DD HH:mm:ss'),
                today_wib: todayWIB.format('YYYY-MM-DD HH:mm:ss'),
                yesterday_wib: yesterdayWIB.format('YYYY-MM-DD HH:mm:ss'),
                yesterday_utc: yesterday.toISOString(),
                condition: 'trial_end_date <= yesterday (trial_end_date + 1 day <= now)'
            });
            
            const result = await Tenant.findAll({
                where: {
                    status: 'trial',
                    trial_end_date: {
                        [Op.lte]: yesterday // ✅ H+1: trial_end_date <= yesterday (trial_end_date + 1 day <= now)
                    }
                },
                attributes: ['id', 'business_name', 'owner_name', 'email', 'trial_end_date'],
                order: [['trial_end_date', 'ASC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getTenantStats(tenantId) {
        try {
            // Verify tenant exists
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            // Use tenant_id filter for all queries to ensure data isolation
            const [
                totalBranches,
                totalUsers,
                totalCustomers,
                totalOrders,
                activeUsers,
                recentOrders,
                ordersThisMonth
            ] = await Promise.all([
                // Total counts - all with tenant_id filter
                Branch.count({ where: { tenant_id: tenantId } }),
                User.count({ where: { tenant_id: tenantId } }),
                Customer.count({ where: { tenant_id: tenantId } }),
                Order.count({ where: { tenant_id: tenantId } }),
                
                // Active counts (only for users, branches don't have status)
                User.count({ 
                    where: { 
                        tenant_id: tenantId,
                        status: 'active' 
                    }
                }),
                
                // Recent orders (last 30 days)
                Order.count({
                    where: {
                        tenant_id: tenantId,
                        createdAt: {
                            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                
                // Orders this month
                Order.count({
                    where: {
                        tenant_id: tenantId,
                        createdAt: {
                            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                })
            ]);

            // Final counts calculated successfully

            const stats = {
                // Basic counts
                total_branches: totalBranches,
                total_users: totalUsers,
                total_customers: totalCustomers,
                total_orders: totalOrders,
                
                // Active counts (only for users, branches don't have status)
                active_users: activeUsers,
                inactive_users: totalUsers - activeUsers,
                
                // Recent activity
                recent_orders: recentOrders,
                orders_this_month: ordersThisMonth,
                
                // Additional metrics
                users_utilization: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(1) : 0,
                orders_growth: recentOrders > 0 ? ((recentOrders / Math.max(ordersThisMonth - recentOrders, 1)) * 100).toFixed(1) : 0
            };

            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getGlobalStats() {
        try {
            // Get global counts using parallel queries
            const [
                totalTenants,
                activeTenants,
                trialTenants,
                totalBranches,
                totalUsers,
                totalCustomers,
                totalOrders,
                recentOrders,
                ordersThisMonth
            ] = await Promise.all([
                // Tenant counts
                Tenant.count(),
                Tenant.count({ where: { status: 'active' } }),
                Tenant.count({ where: { status: 'trial' } }),
                
                // Global counts
                Branch.count(),
                User.count(),
                Customer.count(),
                Order.count(),
                
                // Recent activity
                Order.count({
                    where: {
                        createdAt: {
                            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                
                // Orders this month
                Order.count({
                    where: {
                        createdAt: {
                            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                })
            ]);

            const stats = {
                // Tenant metrics
                total_tenants: totalTenants,
                active_tenants: activeTenants,
                trial_tenants: trialTenants,
                suspended_tenants: totalTenants - activeTenants - trialTenants,
                
                // Global counts
                total_branches: totalBranches,
                total_users: totalUsers,
                total_customers: totalCustomers,
                total_orders: totalOrders,
                
                // Recent activity
                recent_orders: recentOrders,
                orders_this_month: ordersThisMonth,
                
                // Utilization metrics
                tenant_utilization: totalTenants > 0 ? (activeTenants / totalTenants * 100).toFixed(1) : 0,
                orders_growth: recentOrders > 0 ? ((recentOrders / Math.max(ordersThisMonth - recentOrders, 1)) * 100).toFixed(1) : 0,
                
                // Average per tenant
                avg_branches_per_tenant: totalTenants > 0 ? (totalBranches / totalTenants).toFixed(1) : 0,
                avg_users_per_tenant: totalTenants > 0 ? (totalUsers / totalTenants).toFixed(1) : 0,
                avg_customers_per_tenant: totalTenants > 0 ? (totalCustomers / totalTenants).toFixed(1) : 0,
                avg_orders_per_tenant: totalTenants > 0 ? (totalOrders / totalTenants).toFixed(1) : 0
            };

            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateVerificationStatus(tenantId, isVerified) {
        try {
            const [updatedRows] = await Tenant.update({
                is_verified: isVerified,
                verified_at: isVerified ? new Date() : null
            }, {
                where: { id: tenantId }
            });
            
            console.log('✅ TenantRepository - Verification status updated:', {
                tenant_id: tenantId,
                is_verified: isVerified,
                updated_rows: updatedRows
            });
            
            return updatedRows > 0;
        } catch (error) {
            console.error('❌ TenantRepository - Error updating verification status:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = TenantRepository;
