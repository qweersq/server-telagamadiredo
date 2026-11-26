const TenantRepository = require('../repositories/tenantRepository');
const ResponseHelper = require('../helpers/responseHelper');

class TenantStatsController {
    // Get tenant counts for tabs
    static async getTabCounts(req, res) {
        try {
            // Get all tenants (for superapp-superadmin, get all; for others, get by tenant_id)
            let tenants;
            if (req.user.role === 'superapp-superadmin') {
                tenants = await TenantRepository.getAll();
            } else {
                // For other roles, this endpoint might not be accessible
                return res.status(403).send(ResponseHelper.errorResponse('Access denied'));
            }

            // Calculate tab counts
        const counts = {
            unverified: 0,
            active_trial: 0,
            last_access_trial: 0,
            expired_trial: 0,
            active: 0,
            last_access_subscription: 0,
            expired_tenant: 0,
            total: tenants.length
        };

            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            tenants.forEach(tenant => {
                // Priority: Status-based categorization first, then verification status
                if (tenant.status === 'active' && tenant.subscription_status === 'active') {
                    // Check if subscription ends today
                    if (tenant.subscriptions && tenant.subscriptions.length > 0) {
                        const activeSubscription = tenant.subscriptions[0];
                        if (activeSubscription.status === 'active') {
                            const subEndDate = new Date(activeSubscription.end_date);
                            if (subEndDate >= todayStart && subEndDate <= todayEnd) {
                                counts.last_access_subscription++;
                            } else if (subEndDate > todayEnd) {
                                counts.active++;
                            } else {
                                counts.expired_tenant++;
                            }
                        } else {
                            counts.expired_tenant++;
                        }
                    } else {
                        counts.active++;
                    }
                } else if (tenant.status === 'trial' && tenant.subscription_status === 'trial') {
                    if (!tenant.is_verified) {
                        counts.unverified++;
                    } else if (tenant.trial_end_date) {
                        const trialEndDate = new Date(tenant.trial_end_date);
                        if (trialEndDate >= todayStart && trialEndDate <= todayEnd) {
                            counts.last_access_trial++;
                        } else if (trialEndDate > todayEnd) {
                            counts.active_trial++;
                        } else {
                            counts.expired_trial++;
                        }
                    } else {
                        counts.active_trial++;
                    }
                } else if (tenant.is_verified && 
                          (tenant.status === 'inactive' || 
                           tenant.status === 'suspended' || 
                           tenant.subscription_status === 'expired' ||
                           tenant.subscription_status === 'cancelled')) {
                    // Expired Tenant: pernah aktif tapi sekarang expired/suspended/cancelled
                    counts.expired_tenant++;
                } else if (!tenant.is_verified) {
                    counts.unverified++;
                }
            });

            return res.status(200).send(ResponseHelper.successResponse({
                counts,
                message: 'Tab counts retrieved successfully'
            }));

        } catch (error) {
            console.error('Error getting tab counts:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil statistik tenant'));
        }
    }

    // Get detailed tenant statistics
    static async getDetailedStats(req, res) {
        try {
            // Get all tenants (for superapp-superadmin only)
            if (req.user.role !== 'superapp-superadmin') {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied'));
            }

            const tenants = await TenantRepository.getAll();

            // Detailed statistics
            const stats = {
                total_tenants: tenants.length,
                by_verification_status: {
                    verified: 0,
                    unverified: 0
                },
                by_status: {
                    trial: 0,
                    active: 0,
                    inactive: 0,
                    suspended: 0
                },
                by_subscription_status: {
                    trial: 0,
                    active: 0,
                    expired: 0,
                    cancelled: 0
                },
                by_tab_category: {
                    unverified: 0,
                    active_trial: 0,
                    last_access_trial: 0,
                    expired_trial: 0,
                    active: 0,
                    last_access_subscription: 0,
                    expired_tenant: 0,
                    other: 0
                },
                trial_expiring_soon: 0, // Expiring in next 3 days
                recently_registered: 0  // Registered in last 7 days
            };

            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            tenants.forEach(tenant => {
                // Verification status
                if (tenant.is_verified) {
                    stats.by_verification_status.verified++;
                } else {
                    stats.by_verification_status.unverified++;
                }

                // Status
                if (tenant.status) {
                    stats.by_status[tenant.status] = (stats.by_status[tenant.status] || 0) + 1;
                }

                // Subscription status
                if (tenant.subscription_status) {
                    stats.by_subscription_status[tenant.subscription_status] = 
                        (stats.by_subscription_status[tenant.subscription_status] || 0) + 1;
                }

                // Tab categories (consistent with updated logic)
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

                if (tenant.status === 'active' && tenant.subscription_status === 'active') {
                    // Check if subscription ends today
                    if (tenant.subscriptions && tenant.subscriptions.length > 0) {
                        const activeSubscription = tenant.subscriptions[0];
                        if (activeSubscription.status === 'active') {
                            const subEndDate = new Date(activeSubscription.end_date);
                            if (subEndDate >= todayStart && subEndDate <= todayEnd) {
                                stats.by_tab_category.last_access_subscription++;
                            } else if (subEndDate > todayEnd) {
                                stats.by_tab_category.active++;
                            } else {
                                stats.by_tab_category.expired_tenant++;
                            }
                        } else {
                            stats.by_tab_category.expired_tenant++;
                        }
                    } else {
                        stats.by_tab_category.active++;
                    }
                } else if (tenant.status === 'trial' && tenant.subscription_status === 'trial') {
                    if (!tenant.is_verified) {
                        stats.by_tab_category.unverified++;
                    } else if (tenant.trial_end_date) {
                        const trialEndDate = new Date(tenant.trial_end_date);
                        if (trialEndDate >= todayStart && trialEndDate <= todayEnd) {
                            stats.by_tab_category.last_access_trial++;
                        } else if (trialEndDate > todayEnd) {
                            stats.by_tab_category.active_trial++;
                        } else {
                            stats.by_tab_category.expired_trial++;
                        }
                    } else {
                        stats.by_tab_category.active_trial++;
                    }
                } else if (tenant.is_verified && 
                          (tenant.status === 'inactive' || 
                           tenant.status === 'suspended' || 
                           tenant.subscription_status === 'expired' ||
                           tenant.subscription_status === 'cancelled')) {
                    stats.by_tab_category.expired_tenant++;
                } else if (!tenant.is_verified) {
                    stats.by_tab_category.unverified++;
                } else {
                    stats.by_tab_category.other++;
                }

                // Trial expiring soon
                if (tenant.trial_end_date && 
                    new Date(tenant.trial_end_date) > now && 
                    new Date(tenant.trial_end_date) <= threeDaysFromNow) {
                    stats.trial_expiring_soon++;
                }

                // Recently registered
                if (tenant.createdAt && new Date(tenant.createdAt) >= sevenDaysAgo) {
                    stats.recently_registered++;
                }
            });

            return res.status(200).send(ResponseHelper.successResponse({
                stats,
                message: 'Detailed statistics retrieved successfully'
            }));

        } catch (error) {
            console.error('Error getting detailed stats:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil statistik detail'));
        }
    }
}

module.exports = TenantStatsController;
