const SuperAppAdminRepository = require('../repositories/superAppAdminRepository');
const SuperAppExpenseRepository = require('../repositories/superAppExpenseRepository');

class SuperAppAdminService {
    static async getStatistics(startDate, endDate) {
        try {
            console.log('📊 SuperAppAdminService.getStatistics - Processing:', { startDate, endDate });

            // Get all statistics in parallel
            const [
                newTenants,
                activeTenants,
                totalUsers,
                revenueStats,
                expiringStats,
                mrrStats,
                arpuStats,
                conversionStats,
                churnStats,
                growthStats,
                bugReportsAndFeedback,
                expenseStats
            ] = await Promise.all([
                SuperAppAdminRepository.getNewTenants(startDate, endDate),
                SuperAppAdminRepository.getActiveTenants(startDate, endDate),
                SuperAppAdminRepository.getTotalUsers(startDate, endDate),
                SuperAppAdminRepository.getRevenueStatistics(startDate, endDate),
                SuperAppAdminRepository.getExpiringSoonTenants(),
                SuperAppAdminRepository.getMRR(),
                SuperAppAdminRepository.getARPU(startDate, endDate),
                SuperAppAdminRepository.getConversionRate(startDate, endDate),
                SuperAppAdminRepository.getChurnRate(startDate, endDate),
                SuperAppAdminRepository.getGrowthRate(startDate, endDate),
                SuperAppAdminRepository.getBugReportsAndFeedback(startDate, endDate),
                SuperAppExpenseRepository.getTotalExpensesForStatistics(startDate, endDate)
            ]);

            const statistics = {
                // Tenant Metrics
                new_tenants: newTenants,
                active_tenants: activeTenants.total || 0,
                active_tenants_breakdown: {
                    total: activeTenants.total || 0,
                    trial: activeTenants.trial || 0,
                    paid: activeTenants.paid || 0
                },
                expiring_soon: expiringStats.total || 0,
                expiring_soon_breakdown: {
                    total: expiringStats.total || 0,
                    trial_h1: expiringStats.trial_expiring_h1 || 0,
                    subscription_h7: expiringStats.subscription_expiring_h7 || 0
                },
                total_users: totalUsers,
                
                // Revenue Metrics
                total_revenue: revenueStats.total_revenue || 0,
                paid_payments: revenueStats.paid_payments || 0,
                pending_payments: revenueStats.pending_payments || 0,
                failed_payments: revenueStats.failed_payments || 0,
                cancelled_payments: revenueStats.cancelled_payments || 0,
                total_transactions: revenueStats.total_transactions || 0,
                
                // Expense Metrics
                total_expenses: expenseStats.total_expenses || 0,
                total_expense_items: expenseStats.total_items || 0,
                
                // Business Metrics (Real-time)
                mrr: mrrStats.mrr || 0,
                mrr_breakdown: {
                    mrr: mrrStats.mrr || 0,
                    active_subscriptions: mrrStats.active_subscriptions || 0
                },
                arpu: arpuStats.arpu || 0,
                arpu_breakdown: {
                    arpu: arpuStats.arpu || 0,
                    period_revenue: arpuStats.period_revenue || 0,
                    paying_tenants: arpuStats.paying_tenants || 0
                },
                
                // Business Metrics (Period-based)
                conversion_rate: conversionStats.conversion_rate || 0,
                conversion_breakdown: {
                    conversion_rate: conversionStats.conversion_rate || 0,
                    trial_tenants: conversionStats.trial_tenants || 0,
                    converted_tenants: conversionStats.converted_tenants || 0
                },
                churn_rate: churnStats.churn_rate || 0,
                churn_breakdown: {
                    churn_rate: churnStats.churn_rate || 0,
                    churned_tenants: churnStats.churned_tenants || 0,
                    active_at_start: churnStats.active_at_start || 0
                },
                growth_rate: growthStats.growth_rate || 0,
                growth_breakdown: {
                    growth_rate: growthStats.growth_rate || 0,
                    current_period: growthStats.current_period || 0,
                    previous_period: growthStats.previous_period || 0
                },
                
                // Support Metrics (simple count by created_at in period)
                bug_reports: bugReportsAndFeedback.bug_reports || 0,
                feedback: bugReportsAndFeedback.feedback || 0,
                
                date_range: {
                    start_date: startDate,
                    end_date: endDate
                },
                generated_at: new Date().toISOString()
            };

            console.log('✅ SuperAppAdminService.getStatistics - Completed:', statistics);
            return statistics;
        } catch (error) {
            console.error('❌ SuperAppAdminService.getStatistics - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getTenantStatistics(startDate, endDate) {
        try {
            console.log('📊 SuperAppAdminService.getTenantStatistics - Processing:', { startDate, endDate });

            const tenantStats = await SuperAppAdminRepository.getTenantStatistics(startDate, endDate);

            console.log('✅ SuperAppAdminService.getTenantStatistics - Completed:', tenantStats);
            return tenantStats;
        } catch (error) {
            console.error('❌ SuperAppAdminService.getTenantStatistics - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getUserStatistics(startDate, endDate) {
        try {
            console.log('📊 SuperAppAdminService.getUserStatistics - Processing:', { startDate, endDate });

            const userStats = await SuperAppAdminRepository.getUserStatistics(startDate, endDate);

            console.log('✅ SuperAppAdminService.getUserStatistics - Completed:', userStats);
            return userStats;
        } catch (error) {
            console.error('❌ SuperAppAdminService.getUserStatistics - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getRevenueStatistics(startDate, endDate) {
        try {
            console.log('📊 SuperAppAdminService.getRevenueStatistics - Processing:', { startDate, endDate });

            const revenueStats = await SuperAppAdminRepository.getRevenueStatistics(startDate, endDate);

            console.log('✅ SuperAppAdminService.getRevenueStatistics - Completed:', revenueStats);
            return revenueStats;
        } catch (error) {
            console.error('❌ SuperAppAdminService.getRevenueStatistics - Error:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = SuperAppAdminService;
