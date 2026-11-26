const { Tenant, Subscription, SubscriptionPlan, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * SuperApp Tenant V2 Repository
 * Simple repository for tenant management with trial filtering
 */
class SuperAppTenantV2Repository {
    
    /**
     * Helper function to get plan IDs based on name and/or duration
     */
    static async getPlanIds(planName, durationDays = null) {
        const planWhere = { name: planName, is_active: true, deletedAt: null };
        if (durationDays !== null) {
            planWhere.duration_days = durationDays;
        }
        const plans = await SubscriptionPlan.findAll({
            where: planWhere,
            attributes: ['id']
        });
        return plans.map(p => p.id);
    }
    
    /**
     * Get trial tenants (status: trial, subscription_status: trial)
     */
    static async getTrialTenants(search, limit, offset) {
        try {
            console.log('🔍 SuperAppTenantV2Repository.getTrialTenants - Fetching trial tenants');
            
            // Build where clause - simple filter for trial tenants only
            const whereClause = {
                deletedAt: null,
                is_verified: true,
                status: 'trial',
                subscription_status: 'trial'
            };

            // Get tenants with pagination
            const { count, rows: tenants } = await Tenant.findAndCountAll({
                where: whereClause,
                attributes: [
                    'id', 'business_name', 'owner_name', 'email', 'phone', 'address',
                    'trial_end_date', 'status', 'subscription_status',
                    'created_at', 'updated_at'
                ],
                order: [['created_at', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Calculate pagination info
            const currentPage = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(count / limit);
            const hasNextPage = currentPage < totalPages;
            const hasPrevPage = currentPage > 1;

            const result = {
                tenants,
                pagination: {
                    current_page: currentPage,
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: limit,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage
                }
            };

            console.log('✅ SuperAppTenantV2Repository.getTrialTenants - Success');
            return result;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Repository.getTrialTenants - Error:', error);
            throw error;
        }
    }

    /**
     * Get all tenants with simple filtering
     */
    static async getAllTenants(tab, search, limit, offset) {
        try {
            console.log('🔍 SuperAppTenantV2Repository.getAllTenants - Fetching all tenants');
            
            // Build where clause based on tab
            const whereClause = {
                deletedAt: null,
                is_verified: true
            };

            // Plan name mapping (for backward compatibility)
            const planNameMap = {
                'notafree': 'NotaFree',
                'notalite': 'NotaLite',
                'notapro': 'NotaPro',
                'notabusiness': 'NotaBusiness'
            };
            
            // Parse dynamic plan tab key (format: "planname_duration" e.g., "notalite_90", "notapro_365")
            const parsePlanTab = (tabKey) => {
                // Handle format: "notalite_90", "notapro_365", etc
                // Last part is always duration_days, everything before is plan name
                const parts = tabKey.split('_');
                if (parts.length >= 2) {
                    const durationDays = parseInt(parts[parts.length - 1]);
                    if (!isNaN(durationDays)) {
                        // Get plan name (everything except last part)
                        const planNameParts = parts.slice(0, -1);
                        const planNameLower = planNameParts.join('_');
                        
                        // Convert to proper case: notalite -> NotaLite, notapro -> NotaPro
                        const properPlanName = planNameLower
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join('');
                        
                        return { planName: properPlanName, durationDays };
                    }
                }
                return null;
            };
            

            // Add tab-specific filters
            let includeSubscriptions = [
                {
                    model: Subscription,
                    as: 'subscriptions',
                    attributes: ['id', 'start_date', 'end_date', 'status', 'plan_id'],
                    required: false,
                    where: { status: 'active' }, // Hanya ambil subscription active
                    separate: true, // Ambil 1 subscription terbaru per tenant
                    limit: 1,
                    order: [['createdAt', 'DESC']], // Ambil yang terbaru dari yang active
                    include: [
                        {
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['id', 'name', 'price', 'duration_days']
                        }
                    ]
                }
            ];

            if (tab) {
                switch (tab) {
                    case 'active_trial':
                        whereClause.status = 'trial';
                        whereClause.subscription_status = 'trial';
                        break;
                    case 'expired_trial':
                        whereClause.status = 'expired';
                        whereClause.subscription_status = 'expired';
                        whereClause.trial_end_date = { [Op.ne]: null }; // Trial end date must exist
                        break;
                    case 'active':
                        whereClause.status = 'active';
                        whereClause.subscription_status = 'active';
                        break;
                    case 'expired_tenant':
                        whereClause.status = 'expired';
                        whereClause.subscription_status = 'expired';
                        whereClause.trial_end_date = null; // Trial end date must be null (already paid before)
                        break;
                    // Plan-based tabs (backward compatibility - single plan name)
                    case 'notafree':
                    case 'notalite':
                    case 'notapro':
                    case 'notabusiness':
                        const planName = planNameMap[tab];
                        // Get plan IDs for this plan name
                        const planIds = await SuperAppTenantV2Repository.getPlanIds(planName);
                        if (planIds.length === 0) {
                            // No plans found, return empty result
                            return {
                                tenants: [],
                                pagination: {
                                    current_page: 1,
                                    total_pages: 0,
                                    total_items: 0,
                                    items_per_page: limit,
                                    has_next_page: false,
                                    has_prev_page: false
                                }
                            };
                        }
                        // Filter tenant yang punya subscription ACTIVE terbaru dengan plan_id ini
                        // Subquery: ambil subscription ACTIVE terbaru per tenant, lalu filter by plan_id
                        whereClause.id = {
                            [Op.in]: sequelize.literal(`(
                                SELECT DISTINCT s1.tenant_id
                                FROM subscriptions s1
                                INNER JOIN (
                                    SELECT tenant_id, MAX(createdAt) as max_created
                                    FROM subscriptions
                                    WHERE deletedAt IS NULL AND status = 'active'
                                    GROUP BY tenant_id
                                ) s2 ON s1.tenant_id = s2.tenant_id 
                                    AND s1.createdAt = s2.max_created
                                    AND s1.deletedAt IS NULL
                                    AND s1.status = 'active'
                                WHERE s1.plan_id IN (${planIds.join(',')})
                            )`)
                        };
                        includeSubscriptions = [
                            {
                                model: Subscription,
                                as: 'subscriptions',
                                attributes: ['id', 'start_date', 'end_date', 'status', 'plan_id'],
                                required: false,
                                where: { status: 'active' }, // Hanya ambil subscription active
                                separate: true,
                                limit: 1,
                                order: [['createdAt', 'DESC']], // Ambil yang terbaru dari yang active
                                include: [
                                    {
                                        model: SubscriptionPlan,
                                        as: 'plan',
                                        attributes: ['id', 'name', 'price', 'duration_days']
                                    }
                                ]
                            }
                        ];
                        break;
                    default:
                        // Dynamic plan tab (format: "planname_duration" e.g., "notalite_90", "notapro_365")
                        const planTabInfo = parsePlanTab(tab);
                        if (planTabInfo) {
                            // Get plan IDs for this plan name and duration
                            const planIds = await SuperAppTenantV2Repository.getPlanIds(planTabInfo.planName, planTabInfo.durationDays);
                            if (planIds.length === 0) {
                                // No plans found, return empty result
                                return {
                                    tenants: [],
                                    pagination: {
                                        current_page: 1,
                                        total_pages: 0,
                                        total_items: 0,
                                        items_per_page: limit,
                                        has_next_page: false,
                                        has_prev_page: false
                                    }
                                };
                            }
                            // Filter tenant yang punya subscription ACTIVE terbaru dengan plan_id ini
                            // Subquery: ambil subscription ACTIVE terbaru per tenant, lalu filter by plan_id
                            whereClause.id = {
                                [Op.in]: sequelize.literal(`(
                                    SELECT DISTINCT s1.tenant_id
                                    FROM subscriptions s1
                                    INNER JOIN (
                                        SELECT tenant_id, MAX(createdAt) as max_created
                                        FROM subscriptions
                                        WHERE deletedAt IS NULL AND status = 'active'
                                        GROUP BY tenant_id
                                    ) s2 ON s1.tenant_id = s2.tenant_id 
                                        AND s1.createdAt = s2.max_created
                                        AND s1.deletedAt IS NULL
                                        AND s1.status = 'active'
                                    WHERE s1.plan_id IN (${planIds.join(',')})
                                )`)
                            };
                            includeSubscriptions = [
                                {
                                    model: Subscription,
                                    as: 'subscriptions',
                                    attributes: ['id', 'start_date', 'end_date', 'status', 'plan_id'],
                                    required: false,
                                    separate: true,
                                    limit: 1,
                                    order: [['createdAt', 'DESC']],
                                    include: [
                                        {
                                            model: SubscriptionPlan,
                                            as: 'plan',
                                            attributes: ['id', 'name', 'price', 'duration_days']
                                        }
                                    ]
                                }
                            ];
                        }
                        break;
                }
            }

            // Add search filter if provided
            let finalWhereClause = whereClause;
            if (search) {
                finalWhereClause = {
                    [Op.and]: [
                        whereClause,
                        {
                            [Op.or]: [
                                { business_name: { [Op.like]: `%${search}%` } },
                                { owner_name: { [Op.like]: `%${search}%` } },
                                { email: { [Op.like]: `%${search}%` } }
                            ]
                        }
                    ]
                };
            }

            // Get tenants with pagination
            // Ensure models are properly associated
            if (!Tenant.associations.subscriptions) {
                Tenant.hasMany(Subscription, { 
                    foreignKey: 'tenant_id', 
                    as: 'subscriptions', 
                    onDelete: 'CASCADE' 
                });
            }
            if (!Subscription.associations.plan) {
                Subscription.belongsTo(SubscriptionPlan, { 
                    foreignKey: 'plan_id', 
                    as: 'plan', 
                    onDelete: 'RESTRICT' 
                });
            }
            
            const { count, rows: tenants } = await Tenant.findAndCountAll({
                where: finalWhereClause,
                attributes: [
                    'id', 'business_name', 'owner_name', 'email', 'phone',
                    'trial_end_date', 'status', 'subscription_status', 
                    'createdAt', 'updatedAt'
                ],
                include: includeSubscriptions,
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset,
                distinct: true, // Important for count with joins
                subQuery: false // Prevent subquery issues with nested includes
            });

            // Calculate pagination info
            const totalPages = Math.ceil(count / limit);
            const currentPage = Math.floor(offset / limit) + 1;
            const hasNextPage = currentPage < totalPages;
            const hasPrevPage = currentPage > 1;

            const result = {
                tenants,
                pagination: {
                    current_page: currentPage,
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: limit,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage
                }
            };

            console.log('✅ SuperAppTenantV2Repository.getAllTenants - Success');
            return result;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Repository.getAllTenants - Error:', error);
            throw error;
        }
    }

    /**
     * Get tenant stats for dashboard
     */
    static async getTenantStats() {
        try {
            console.log('🔍 SuperAppTenantV2Repository.getTenantStats - Fetching tenant stats');
            
            // Get counts for each tab
            const activeTrialCount = await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    status: 'trial',
                    subscription_status: 'trial'
                }
            });

            const expiredTrialCount = await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    status: 'expired',
                    subscription_status: 'expired',
                    trial_end_date: { [Op.ne]: null } // Trial end date must exist
                }
            });

            const activeCount = await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    status: 'active',
                    subscription_status: 'active'
                }
            });

            const expiredCount = await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    status: 'expired',
                    subscription_status: 'expired',
                    trial_end_date: null // Trial end date must be null (already paid before)
                }
            });

            // Dynamic plan-based stats - get all active plans and count tenants for each
            // Count berdasarkan subscription terbaru per tenant (sama seperti logic getAllTenants)
            const { SubscriptionPlan } = require('../models');
            const activePlans = await SubscriptionPlan.findAll({
                where: {
                    is_active: true,
                    deletedAt: null
                },
                attributes: ['id', 'name', 'duration_days']
            });

            // Count tenants for each plan (name + duration combination)
            // Menggunakan subquery untuk ambil subscription terbaru per tenant
            const planStats = {};
            
            for (const plan of activePlans) {
                // Skip NotaFree with 9999 days (handled separately)
                if (plan.name === 'NotaFree' && plan.duration_days === 9999) {
                    continue;
                }
                
                // Generate key: planname_duration (e.g., "notalite_90", "notapro_365")
                const key = `${plan.name.toLowerCase()}_${plan.duration_days}`;
                
                // Count tenant yang punya subscription ACTIVE terbaru dengan plan_id ini
                const count = await Tenant.count({
                    where: {
                        deletedAt: null,
                        is_verified: true,
                        id: {
                            [Op.in]: sequelize.literal(`(
                                SELECT DISTINCT s1.tenant_id
                                FROM subscriptions s1
                                INNER JOIN (
                                    SELECT tenant_id, MAX(createdAt) as max_created
                                    FROM subscriptions
                                    WHERE deletedAt IS NULL AND status = 'active'
                                    GROUP BY tenant_id
                                ) s2 ON s1.tenant_id = s2.tenant_id 
                                    AND s1.createdAt = s2.max_created
                                    AND s1.deletedAt IS NULL
                                    AND s1.status = 'active'
                                WHERE s1.plan_id = ${plan.id}
                            )`)
                        }
                    },
                    distinct: true
                });
                
                planStats[key] = count;
            }
            
            // Backward compatibility: aggregate counts by plan name (for old tabs)
            // Menggunakan subscription terbaru per tenant
            const notafreePlanIds = await SuperAppTenantV2Repository.getPlanIds('NotaFree');
            const notafreeCount = notafreePlanIds.length > 0 ? await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT s1.tenant_id
                            FROM subscriptions s1
                            INNER JOIN (
                                SELECT tenant_id, MAX(createdAt) as max_created
                                FROM subscriptions
                                WHERE deletedAt IS NULL AND status = 'active'
                                GROUP BY tenant_id
                            ) s2 ON s1.tenant_id = s2.tenant_id 
                                AND s1.createdAt = s2.max_created
                                AND s1.deletedAt IS NULL
                                AND s1.status = 'active'
                            WHERE s1.plan_id IN (${notafreePlanIds.join(',')})
                        )`)
                    }
                },
                distinct: true
            }) : 0;

            const notalitePlanIds = await SuperAppTenantV2Repository.getPlanIds('NotaLite');
            const notaliteCount = notalitePlanIds.length > 0 ? await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT s1.tenant_id
                            FROM subscriptions s1
                            INNER JOIN (
                                SELECT tenant_id, MAX(createdAt) as max_created
                                FROM subscriptions
                                WHERE deletedAt IS NULL AND status = 'active'
                                GROUP BY tenant_id
                            ) s2 ON s1.tenant_id = s2.tenant_id 
                                AND s1.createdAt = s2.max_created
                                AND s1.deletedAt IS NULL
                                AND s1.status = 'active'
                            WHERE s1.plan_id IN (${notalitePlanIds.join(',')})
                        )`)
                    }
                },
                distinct: true
            }) : 0;

            const notaproPlanIds = await SuperAppTenantV2Repository.getPlanIds('NotaPro');
            const notaproCount = notaproPlanIds.length > 0 ? await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT s1.tenant_id
                            FROM subscriptions s1
                            INNER JOIN (
                                SELECT tenant_id, MAX(createdAt) as max_created
                                FROM subscriptions
                                WHERE deletedAt IS NULL AND status = 'active'
                                GROUP BY tenant_id
                            ) s2 ON s1.tenant_id = s2.tenant_id 
                                AND s1.createdAt = s2.max_created
                                AND s1.deletedAt IS NULL
                                AND s1.status = 'active'
                            WHERE s1.plan_id IN (${notaproPlanIds.join(',')})
                        )`)
                    }
                },
                distinct: true
            }) : 0;

            const notabusinessPlanIds = await SuperAppTenantV2Repository.getPlanIds('NotaBusiness');
            const notabusinessCount = notabusinessPlanIds.length > 0 ? await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT DISTINCT s1.tenant_id
                            FROM subscriptions s1
                            INNER JOIN (
                                SELECT tenant_id, MAX(createdAt) as max_created
                                FROM subscriptions
                                WHERE deletedAt IS NULL AND status = 'active'
                                GROUP BY tenant_id
                            ) s2 ON s1.tenant_id = s2.tenant_id 
                                AND s1.createdAt = s2.max_created
                                AND s1.deletedAt IS NULL
                                AND s1.status = 'active'
                            WHERE s1.plan_id IN (${notabusinessPlanIds.join(',')})
                        )`)
                    }
                },
                distinct: true
            }) : 0;

            const totalCount = activeTrialCount + expiredTrialCount + activeCount + expiredCount;

            const stats = {
                total_tenants: totalCount,
                active_trial: activeTrialCount,
                expired_trial: expiredTrialCount,
                active: activeCount,
                expired_tenant: expiredCount,  // Changed from 'expired' to 'expired_tenant'
                // Plan-based stats (backward compatibility - aggregate by name)
                notafree: notafreeCount,
                notalite: notaliteCount,
                notapro: notaproCount,
                notabusiness: notabusinessCount,
                // Dynamic plan stats (by name + duration)
                ...planStats
            };

            console.log('✅ SuperAppTenantV2Repository.getTenantStats - Success');
            return stats;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Repository.getTenantStats - Error:', error);
            throw error;
        }
    }

    /**
     * Update tenant data
     * @param {number} tenantId - Tenant ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated tenant
     */
    static async updateTenant(tenantId, updateData) {
        try {
            console.log('🔍 SuperAppTenantV2Repository.updateTenant - Starting:', { tenantId, updateData });

            // Find tenant first
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Allowed fields to update
            const allowedFields = [
                'business_name',
                'owner_name',
                'email',
                'phone',
                'address',
                'city',
                'status',
                'trial_end_date',
                'subscription_status'
            ];

            // Filter only allowed fields
            const filteredData = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            }

            console.log('🔍 SuperAppTenantV2Repository.updateTenant - Filtered data:', filteredData);

            // Update tenant
            await tenant.update(filteredData);

            // Reload tenant with associations
            const updatedTenant = await Tenant.findByPk(tenantId, {
                attributes: [
                    'id', 'business_name', 'owner_name', 'email', 'phone', 'address', 'city',
                    'trial_end_date', 'status', 'subscription_status',
                    'created_at', 'updated_at'
                ],
                include: [
                    {
                        association: 'branches',
                        attributes: ['id', 'name', 'address', 'phone', 'city', 'status'],
                        where: { deletedAt: null },
                        required: false
                    }
                ]
            });

            console.log('✅ SuperAppTenantV2Repository.updateTenant - Success:', { tenantId });

            return updatedTenant;
        } catch (error) {
            console.error('❌ SuperAppTenantV2Repository.updateTenant - Error:', error);
            throw error;
        }
    }
}

module.exports = SuperAppTenantV2Repository;
