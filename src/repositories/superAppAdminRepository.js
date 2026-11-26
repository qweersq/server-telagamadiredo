const { Tenant, User, TenantPayment, Op, sequelize } = require('../models');

class SuperAppAdminRepository {
    // Helper function to create date range with full day coverage
    static createDateRange(startDate, endDate) {
        if (!startDate || !endDate) return null;
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        return [start, end];
    }
    static async getNewTenants(startDate, endDate) {
        try {
            const whereClause = {};
            
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const count = await Tenant.count({
                where: whereClause
            });

            console.log('📊 SuperAppAdminRepository.getNewTenants:', { startDate, endDate, count, dateRange });
            return count;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getNewTenants - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getActiveTenants(startDate, endDate) {
        try {
            const dateFilter = {};
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                dateFilter.createdAt = {
                    [Op.between]: dateRange
                };
            }

            // Count Trial Active tenants (status='trial' AND subscription_status='trial')
            const trialCount = await Tenant.count({
                where: {
                    status: 'trial',
                    subscription_status: 'trial',
                    ...dateFilter
                }
            });

            // Count Active Paid tenants (status='active' AND subscription_status='active')
            const paidCount = await Tenant.count({
                where: {
                    status: 'active',
                    subscription_status: 'active',
                    ...dateFilter
                }
            });

            const activeTenantsBreakdown = {
                total: trialCount + paidCount,
                trial: trialCount,
                paid: paidCount
            };

            console.log('📊 SuperAppAdminRepository.getActiveTenants:', { 
                startDate, 
                endDate, 
                breakdown: activeTenantsBreakdown 
            });
            
            return activeTenantsBreakdown;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getActiveTenants - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getTotalUsers(startDate, endDate) {
        try {
            const whereClause = {};
            
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const count = await User.count({
                where: whereClause
            });

            console.log('📊 SuperAppAdminRepository.getTotalUsers:', { startDate, endDate, count });
            return count;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getTotalUsers - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getExpiringSoonTenants() {
        try {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(23, 59, 59, 999);

            const sevenDaysLater = new Date(now);
            sevenDaysLater.setDate(now.getDate() + 7);
            sevenDaysLater.setHours(23, 59, 59, 999);

            // Count Trial Expiring Soon (H-1: akan expired besok)
            const trialExpiring = await Tenant.count({
                where: {
                    status: 'trial',
                    subscription_status: 'trial',
                    trial_end_date: {
                        [Op.between]: [now, tomorrow]
                    }
                }
            });

            // Count Subscription Expiring Soon (H-7: akan expired dalam 7 hari)
            // Need to join with subscriptions table
            const { Subscription } = require('../models');
            
            const subscriptionExpiring = await Tenant.count({
                where: {
                    status: 'active',
                    subscription_status: 'active'
                },
                include: [{
                    model: Subscription,
                    as: 'subscriptions',
                    where: {
                        status: 'active',
                        end_date: {
                            [Op.between]: [now, sevenDaysLater]
                        }
                    },
                    required: true
                }]
            });

            const expiringStats = {
                total: trialExpiring + subscriptionExpiring,
                trial_expiring_h1: trialExpiring,
                subscription_expiring_h7: subscriptionExpiring
            };

            console.log('📊 SuperAppAdminRepository.getExpiringSoonTenants:', expiringStats);
            return expiringStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getExpiringSoonTenants - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getMRR() {
        try {
            // MRR = Monthly Recurring Revenue
            // SUM of subscription prices for all active paid tenants
            const { Subscription, SubscriptionPlan } = require('../models');
            
            // Get active subscriptions count
            const activeSubscriptionsCount = await Subscription.count({
                where: {
                    status: 'active'
                },
                include: [{
                    model: Tenant,
                    as: 'tenant',
                    where: {
                        status: 'active',
                        subscription_status: 'active'
                    },
                    required: true
                }]
            });

            // Get MRR (sum of all active subscription prices)
            const mrrResult = await sequelize.query(`
                SELECT SUM(sp.price) as mrr
                FROM subscriptions s
                INNER JOIN subscription_plans sp ON s.plan_id = sp.id
                INNER JOIN tenants t ON s.tenant_id = t.id
                WHERE s.status = 'active'
                AND t.status = 'active'
                AND t.subscription_status = 'active'
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            const mrr = {
                mrr: parseFloat(mrrResult[0]?.mrr || 0),
                active_subscriptions: activeSubscriptionsCount
            };

            console.log('📊 SuperAppAdminRepository.getMRR:', mrr);
            return mrr;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getMRR - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getARPU(startDate, endDate) {
        try {
            // ARPU = Average Revenue Per User (dalam periode)
            // Total Revenue dalam periode / Unique paying tenants dalam periode
            
            const whereClause = {
                status: 'paid'
            };
            
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.paid_at = {
                    [Op.between]: dateRange
                };
            }

            // Get total revenue in period
            const totalRevenue = await TenantPayment.findOne({
                where: whereClause,
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
                ],
                raw: true
            });

            // Get count of unique tenants who paid in period
            const uniquePaidTenants = await TenantPayment.count({
                where: whereClause,
                distinct: true,
                col: 'tenant_id'
            });

            const revenue = parseFloat(totalRevenue?.total_revenue || 0);
            const arpu = uniquePaidTenants > 0 ? revenue / uniquePaidTenants : 0;

            const arpuStats = {
                arpu: parseFloat(arpu.toFixed(2)),
                period_revenue: revenue,
                paying_tenants: uniquePaidTenants
            };

            console.log('📊 SuperAppAdminRepository.getARPU:', { startDate, endDate, arpuStats });
            return arpuStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getARPU - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getConversionRate(startDate, endDate) {
        try {
            // Conversion Rate = (Converted / Total) * 100
            // Logic:
            // - trial_end_date IS NULL = Already converted (paid subscription, trial_end_date removed)
            // - trial_end_date IS NOT NULL = Not converted yet (still trial or trial expired)
            
            const dateFilter = {};
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                dateFilter.createdAt = {
                    [Op.between]: dateRange
                };
            }

            // Count tenants that NOT converted (trial_end_date IS NOT NULL - never paid)
            const notConvertedTenants = await Tenant.count({
                where: {
                    trial_end_date: {
                        [Op.ne]: null
                    },
                    ...dateFilter
                }
            });

            // Count tenants that CONVERTED (trial_end_date IS NULL - already paid, field removed)
            const convertedTenants = await Tenant.count({
                where: {
                    trial_end_date: null,
                    subscription_status: {
                        [Op.in]: ['active', 'expired']
                    },
                    ...dateFilter
                }
            });

            const totalTenants = notConvertedTenants + convertedTenants;
            const conversionRate = totalTenants > 0 ? (convertedTenants / totalTenants) * 100 : 0;

            const conversionStats = {
                conversion_rate: parseFloat(conversionRate.toFixed(2)),
                trial_tenants: totalTenants,
                converted_tenants: convertedTenants,
                not_converted_tenants: notConvertedTenants
            };

            console.log('📊 SuperAppAdminRepository.getConversionRate:', { startDate, endDate, conversionStats });
            return conversionStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getConversionRate - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getChurnRate(startDate, endDate) {
        try {
            // Churn Rate = (Expired in Period / Total Active at Start) * 100
            if (!startDate || !endDate) {
                return {
                    churn_rate: 0,
                    churned_tenants: 0,
                    active_at_start: 0
                };
            }

            const dateRange = this.createDateRange(startDate, endDate);
            const [periodStart, periodEnd] = dateRange;

            // Count active tenants at start of period
            const activeAtStart = await Tenant.count({
                where: {
                    status: 'active',
                    createdAt: {
                        [Op.lt]: periodStart
                    }
                }
            });

            // Count tenants that expired in period
            const { Subscription } = require('../models');
            
            const churnedTenants = await Tenant.count({
                where: {
                    status: 'expired',
                    subscription_status: 'expired'
                },
                include: [{
                    model: Subscription,
                    as: 'subscriptions',
                    where: {
                        end_date: {
                            [Op.between]: dateRange
                        }
                    },
                    required: true
                }]
            });

            const churnRate = activeAtStart > 0 ? (churnedTenants / activeAtStart) * 100 : 0;

            const churnStats = {
                churn_rate: parseFloat(churnRate.toFixed(2)),
                churned_tenants: churnedTenants,
                active_at_start: activeAtStart
            };

            console.log('📊 SuperAppAdminRepository.getChurnRate:', { startDate, endDate, churnStats });
            return churnStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getChurnRate - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getGrowthRate(startDate, endDate) {
        try {
            // Growth Rate = ((This Period - Last Period) / Last Period) * 100
            if (!startDate || !endDate) {
                return {
                    growth_rate: 0,
                    current_period: 0,
                    previous_period: 0
                };
            }

            // Get current period date range
            const currentDateRange = this.createDateRange(startDate, endDate);
            const [currentStart, currentEnd] = currentDateRange;

            // Calculate period duration
            const periodDuration = currentEnd - currentStart;
            const previousStart = new Date(currentStart.getTime() - periodDuration);
            const previousEnd = new Date(currentStart);

            // Count new tenants in current period
            const currentPeriodTenants = await Tenant.count({
                where: {
                    createdAt: {
                        [Op.between]: currentDateRange
                    }
                }
            });

            // Count new tenants in previous period
            const previousPeriodTenants = await Tenant.count({
                where: {
                    createdAt: {
                        [Op.between]: [previousStart, previousEnd]
                    }
                }
            });

            const growthRate = previousPeriodTenants > 0 
                ? ((currentPeriodTenants - previousPeriodTenants) / previousPeriodTenants) * 100 
                : 0;

            const growthStats = {
                growth_rate: parseFloat(growthRate.toFixed(2)),
                current_period: currentPeriodTenants,
                previous_period: previousPeriodTenants
            };

            console.log('📊 SuperAppAdminRepository.getGrowthRate:', { startDate, endDate, growthStats });
            return growthStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getGrowthRate - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getRevenueStatistics(startDate, endDate) {
        try {
            // Get paid payments: SUM(amount) and COUNT(*) where status = 'paid'
            // Filter by paid_at (tanggal pembayaran berhasil)
            const whereClause = {
                status: 'paid'
            };
            
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.paid_at = {
                    [Op.between]: dateRange
                };
            }

            const result = await TenantPayment.findOne({
                where: whereClause,
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'paid_count']
                ],
                raw: true
            });

            // Get pending payments count (include 'pending' and 'unpaid')
            const pendingWhereClause = {
                status: {
                    [Op.in]: ['pending', 'unpaid']
                }
            };
            
            if (dateRange) {
                pendingWhereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const pendingCount = await TenantPayment.count({
                where: pendingWhereClause
            });

            // Get failed payments count
            const failedWhereClause = {
                status: 'failed'
            };
            
            if (dateRange) {
                failedWhereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const failedCount = await TenantPayment.count({
                where: failedWhereClause
            });

            // Get cancelled payments count
            const cancelledWhereClause = {
                status: 'cancelled'
            };
            
            if (dateRange) {
                cancelledWhereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const cancelledCount = await TenantPayment.count({
                where: cancelledWhereClause
            });

            const revenueStats = {
                total_revenue: parseFloat(result?.total_revenue || 0),
                paid_payments: parseInt(result?.paid_count || 0),
                pending_payments: pendingCount,
                failed_payments: failedCount,
                cancelled_payments: cancelledCount,
                total_transactions: parseInt(result?.paid_count || 0) + pendingCount + failedCount + cancelledCount
            };

            console.log('📊 SuperAppAdminRepository.getRevenueStatistics:', { startDate, endDate, revenueStats });
            return revenueStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getRevenueStatistics - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getTenantStatistics(startDate, endDate) {
        try {
            const whereClause = {};
            
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const tenantStats = await Tenant.findAll({
                where: whereClause,
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            console.log('📊 SuperAppAdminRepository.getTenantStatistics:', { startDate, endDate, tenantStats });
            return tenantStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getTenantStatistics - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getUserStatistics(startDate, endDate) {
        try {
            const whereClause = {};
            
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.createdAt = {
                    [Op.between]: dateRange
                };
            }

            const userStats = await User.findAll({
                where: whereClause,
                attributes: [
                    'role',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['role'],
                raw: true
            });

            console.log('📊 SuperAppAdminRepository.getUserStatistics:', { startDate, endDate, userStats });
            return userStats;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getUserStatistics - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getBugReportsAndFeedback(startDate, endDate) {
        try {
            const { BugReport, Feedback } = require('../models');
            
            // Build where clause for date filter - only by created_at
            const whereClause = {};
            const dateRange = this.createDateRange(startDate, endDate);
            if (dateRange) {
                whereClause.created_at = {
                    [Op.between]: dateRange
                };
            }

            // Simple count
            const totalBugReports = await BugReport.count({ where: whereClause });
            const totalFeedback = await Feedback.count({ where: whereClause });

            const result = {
                bug_reports: totalBugReports,
                feedback: totalFeedback
            };

            console.log('📊 SuperAppAdminRepository.getBugReportsAndFeedback:', { startDate, endDate, result });
            return result;
        } catch (error) {
            console.error('❌ SuperAppAdminRepository.getBugReportsAndFeedback - Error:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = SuperAppAdminRepository;
