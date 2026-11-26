const DashboardProfitOverviewRepository = require('../repositories/dashboardProfitOverviewRepository');

class DashboardProfitOverviewService {
    static async dashboardProfitOverview(raw) {
        try {
            const IncomeTotal = await DashboardProfitOverviewRepository.incomeTotalFunc(raw);
            const RevenueTotal = await DashboardProfitOverviewRepository.revenueTotalFunc(raw);
            const ExpenseWithCapitalTotal = await DashboardProfitOverviewRepository.expenseWithCapitalTotalFunc(raw);
            const ExpenseNotCapitalTotal = await DashboardProfitOverviewRepository.expenseNotCapitalFunc(raw);
    
            const IncomeMinusExpense = IncomeTotal - ExpenseWithCapitalTotal;
            const IncomeMinusExpenseNotCapital = IncomeTotal - ExpenseNotCapitalTotal;
    
            const TotalExpensesByMonth = await DashboardProfitOverviewRepository.getTotalExpensesByMonth();
            const TotalIncomeByMonth = await DashboardProfitOverviewRepository.getTotalIncomeByMonth();
            const TotalRevenueByMonth = await DashboardProfitOverviewRepository.getTotalRevenueByMonth();
    
            const data = {
                IncomeTotal,
                RevenueTotal,
                ExpenseWithCapitalTotal,
                ExpenseNotCapitalTotal,
                IncomeMinusExpense,
                IncomeMinusExpenseNotCapital,
                TotalRevenueByMonth,
                TotalIncomeByMonth,
                TotalExpensesByMonth,
            }

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = DashboardProfitOverviewService;