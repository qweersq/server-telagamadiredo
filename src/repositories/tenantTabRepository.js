const { Tenant, Op, sequelize } = require('../models');

class TenantTabRepository {
    /**
     * Get unverified tenants
     * Logic: is_verified = false AND status = 'trial' AND subscription_status = 'trial'
     */
    static async getUnverifiedTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Build where clause - match the logic from tenantStatsController
            // The logic in tenantStatsController is:
            // 1. If tenant.status === 'trial' && tenant.subscription_status === 'trial' && !tenant.is_verified -> unverified
            // 2. Else if !tenant.is_verified -> unverified (fallback)
            // We need to match the exact logic from tenantStatsController
            const whereClause = {
                [Op.and]: [
                    { is_verified: false },
                    {
                        [Op.or]: [
                            // Condition 1: trial status with unverified
                            {
                                status: 'trial',
                                subscription_status: 'trial'
                            },
                            // Condition 2: any unverified tenant that doesn't match other categories
                            {
                                [Op.and]: [
                                    { status: { [Op.ne]: 'active' } },
                                    { subscription_status: { [Op.ne]: 'active' } }
                                ]
                            }
                        ]
                    }
                ]
            };

            // Get total count
            const totalCount = await Tenant.count({ where: whereClause });

            // Get data with pagination - ordered by created_at DESC (newest first)
            const tenants = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
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

            return {
                data: tenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getUnverifiedTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get active trial tenants
     * Logic: is_verified = true AND status = 'trial' AND subscription_status = 'trial' AND trial_end_date > NOW()
     */
    static async getActiveTrialTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Build where clause - match the logic from tenantStatsController
            // Logic: is_verified = true AND status = 'trial' AND subscription_status = 'trial' 
            // AND (trial_end_date > todayEnd OR trial_end_date IS NULL)
            const today = new Date();
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            
            const whereClause = {
                is_verified: true,
                status: 'trial',
                subscription_status: 'trial',
                [Op.or]: [
                    // Condition 1: trial_end_date > todayEnd
                    {
                        trial_end_date: {
                            [Op.gt]: todayEnd
                        }
                    },
                    // Condition 2: trial_end_date IS NULL
                    {
                        trial_end_date: null
                    }
                ]
            };

            // Get total count
            const totalCount = await Tenant.count({ where: whereClause });

            // Get data with pagination - ordered by created_at DESC (newest first)
            const tenants = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
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

            return {
                data: tenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getActiveTrialTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get expired trial tenants
     * Logic: is_verified = true AND status = 'trial' AND subscription_status = 'trial' AND trial_end_date <= NOW()
     */
    static async getExpiredTrialTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Build where clause
            const whereClause = {
                is_verified: true,
                status: 'trial',
                subscription_status: 'trial',
                trial_end_date: {
                    [Op.lte]: new Date()
                }
            };

            // Get total count
            const totalCount = await Tenant.count({ where: whereClause });

            // Get data with pagination - ordered by created_at DESC (newest first)
            const tenants = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
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

            return {
                data: tenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getExpiredTrialTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get active tenants
     * Logic: status = 'active' AND subscription_status = 'active' AND subscription.end_date > NOW()
     */
    static async getActiveTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Build where clause
            const whereClause = {
                status: 'active',
                subscription_status: 'active'
            };

            // Get total count
            const totalCount = await Tenant.count({ 
                where: whereClause,
                include: [
                    {
                        association: 'subscriptions',
                        where: {
                            status: 'active',
                            end_date: {
                                [Op.gt]: new Date()
                            }
                        },
                        required: true
                    }
                ]
            });

            // Get data with pagination - ordered by created_at DESC (newest first)
            const tenants = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                include: [
                    {
                        association: 'subscriptions',
                        where: {
                            status: 'active',
                            end_date: {
                                [Op.gt]: new Date()
                            }
                        },
                        required: true,
                        include: [
                            {
                                association: 'plan'
                            }
                        ]
                    }
                ]
            });

            return {
                data: tenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getActiveTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get expired tenants
     * Logic: is_verified = true AND (status = 'inactive' OR status = 'suspended' OR subscription_status = 'expired' OR subscription_status = 'cancelled')
     */
    static async getExpiredTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Build where clause
            const whereClause = {
                is_verified: true,
                [Op.or]: [
                    { status: { [Op.in]: ['inactive', 'suspended'] } },
                    { subscription_status: { [Op.in]: ['expired', 'cancelled'] } }
                ]
            };

            // Get total count
            const totalCount = await Tenant.count({ where: whereClause });

            // Get data with pagination - ordered by created_at DESC (newest first)
            const tenants = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
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

            return {
                data: tenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getExpiredTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get last access trial tenants
     * Logic: is_verified = true AND status = 'trial' AND subscription_status = 'trial' AND trial_end_date BETWEEN today_start AND today_end
     */
    static async getLastAccessTrialTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Use same logic as tab counts - get all tenants first, then filter
            const allTenants = await Tenant.findAll({
                where: {
                    is_verified: true,
                    status: 'trial',
                    subscription_status: 'trial'
                },
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

            // Filter using same logic as tab counts
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            const filteredTenants = allTenants.filter(tenant => {
                if (tenant.trial_end_date) {
                    const trialEndDate = new Date(tenant.trial_end_date);
                    return trialEndDate >= todayStart && trialEndDate <= todayEnd;
                }
                return false;
            });

            // Apply pagination
            const totalCount = filteredTenants.length;
            const paginatedTenants = filteredTenants
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(offset, offset + limit);

            return {
                data: paginatedTenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getLastAccessTrialTenants error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get last access subscription tenants
     * Logic: status = 'active' AND subscription_status = 'active' AND subscription.end_date BETWEEN today_start AND today_end
     */
    static async getLastAccessSubscriptionTenants(params) {
        try {
            const { page, limit } = params;
            const offset = (page - 1) * limit;

            // Calculate today's date range
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            // Build where clause
            const whereClause = {
                status: 'active',
                subscription_status: 'active'
            };

            // Get total count with subscription filter
            const totalCount = await Tenant.count({ 
                where: whereClause,
                include: [
                    {
                        association: 'subscriptions',
                        where: {
                            status: 'active',
                            end_date: {
                                [Op.gte]: todayStart,
                                [Op.lte]: todayEnd
                            }
                        },
                        required: true
                    }
                ]
            });

            // Get data with pagination - ordered by created_at DESC (newest first)
            const tenants = await Tenant.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                include: [
                    {
                        association: 'subscriptions',
                        where: {
                            status: 'active',
                            end_date: {
                                [Op.gte]: todayStart,
                                [Op.lte]: todayEnd
                            }
                        },
                        required: true,
                        include: [
                            {
                                association: 'plan'
                            }
                        ]
                    }
                ]
            });

            return {
                data: tenants,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            };
        } catch (error) {
            console.error('TenantTabRepository.getLastAccessSubscriptionTenants error:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = TenantTabRepository;
