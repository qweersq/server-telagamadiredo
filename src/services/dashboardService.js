const DashboardRepository = require('../repositories/dashboardRepository');

class DashboardService {
    static formatDate(date) {
        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async genereteDashboardOverview(startDate, endDate) {
        try {
            const TotalOrder = await DashboardRepository.totalOrderFunc(startDate, endDate);
            const TotalIncome = await DashboardRepository.incomeFunc(startDate, endDate);
            const TotalExpense = await DashboardRepository.totalExpenseFunc(startDate, endDate);
            const PaymentMethod = await DashboardRepository.paymentMethodFunc(startDate, endDate);
            const TotalItem = await DashboardRepository.totalItemFunc(startDate, endDate);
            const TotalServiceOrder = await DashboardRepository.totalServiceOrderFunc(startDate, endDate);
            const CustomerOverview = await DashboardRepository.customerOverviewFunc(startDate, endDate);
            const GraphTotalOrder = await DashboardRepository.graphTotalOrderFunc(startDate, endDate);
            const GraphRevenue = await DashboardRepository.graphRevenueFunc(startDate, endDate);
            const GraphIncome = await DashboardRepository.graphIncomeFunc(startDate, endDate);
            const GraphExpense = await DashboardRepository.graphExpenseFunc(startDate, endDate);
            const AverageOverview = await DashboardRepository.AverageOverviewFunc(startDate, endDate);

            return {
                total_order: TotalOrder,
                total_income: TotalIncome,
                total_expense: TotalExpense,
                payment_method: PaymentMethod,
                total_item: TotalItem,
                total_service_order: TotalServiceOrder,
                customer_overview: CustomerOverview,
                graph_total_order: GraphTotalOrder,
                graph_revenue: GraphRevenue,
                graph_income: GraphIncome,
                graph_expense: GraphExpense,
                average_overview: AverageOverview
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async generateFinanceReport({ month, year }) {
        try {
            const monthFilter = month ? month : new Date().getMonth() + 1;
            const yearFilter = year ? year : new Date().getFullYear();
    
            const startDate = new Date(yearFilter, monthFilter - 1, 1);
            const endDate = new Date(yearFilter, monthFilter, 0, 23, 59, 59);

            const { orders, expenses, payments } = await DashboardRepository.generateFinanceReport(startDate, endDate);
    
            const summarizedData = {
                orderCount: 0,
                totalOrder: 0,
                totalIncome: 0,
                totalExpense: 0,
                totalCapitalIn: 0,
                totalCash: 0,
                totalBankTransfer: 0,
                totalQris: 0,
                totalUnpaid: 0,
                totalPaid: 0,
                totalDP: 0,
                totalRevenue: 0,
                totalProfit: 0
            };
    
            const financeReport = [];
            let totalRevenue = 0,
                totalUnpaid = 0,
                totalPaid = 0,
                totalDP = 0,
                totalIncome = 0,
                totalExpense = 0,
                totalCash = 0,
                totalCapitalIn = 0,
                totalBankTransfer = 0,
                totalQris = 0;
    
            for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
                const dailyReport = {
                    date: DashboardService.formatDate(date),
                    revenue: 0,
                    unpaid: 0,
                    paid: 0,
                    dp: 0,
                    income: 0,
                    expense: 0,
                    capital_in: 0,
                    cash: 0,
                    bank_transfer: 0,
                    qris: 0,
                    unpaid_data: [],
                    paid_data: [],
                    dp_data: []
                };

                orders.forEach(order => {
                    if (order.entry_date === DashboardService.formatDate(date)) {
                        const paymentStatus = order.payment.status;
                        const paymentAmount = paymentStatus === 'dp' ? parseInt(order.payment.money) : parseInt(order.payment.final_price);
    
                        if (paymentStatus === 'unpaid') {
                            dailyReport.unpaid += paymentAmount;
                            totalUnpaid += paymentAmount;
                            dailyReport.unpaid_data.push(order);
                        } else if (paymentStatus === 'paid') {
                            dailyReport.paid += paymentAmount;
                            totalPaid += paymentAmount;
                            dailyReport.paid_data.push(order);
                        } else if (paymentStatus === 'dp') {
                            dailyReport.dp += paymentAmount;
                            totalDP += paymentAmount;
                            dailyReport.dp_data.push(order);
                        }
    
                        dailyReport.revenue += paymentAmount;
                    }
                });
    
                dailyReport.income = payments.filter(payment => payment.date === DashboardService.formatDate(date) && payment.status === 'paid')
                    .reduce((acc, payment) => acc + parseInt(payment.final_price), 0);
    
                dailyReport.expense = expenses.filter(expense => expense.date === DashboardService.formatDate(date) && expense.type_account !== 'modal_bisnis')
                    .reduce((acc, expense) => acc + parseInt(expense.amount), 0);
    
                dailyReport.capital_in = expenses.filter(expense => expense.date === DashboardService.formatDate(date) && expense.type_account === 'modal_bisnis')
                    .reduce((acc, expense) => acc + parseInt(expense.amount), 0);
    
                dailyReport.cash = orders.filter(order => order.entry_date === DashboardService.formatDate(date) && order.payment.method === 'cash')
                    .reduce((acc, order) => acc + (order.payment.status === 'dp' ? parseInt(order.payment.money) : parseInt(order.payment.final_price)), 0);
    
                dailyReport.bank_transfer = orders.filter(order => order.entry_date === DashboardService.formatDate(date) && order.payment.method === 'bank_transfer')
                    .reduce((acc, order) => acc + (order.payment.status === 'dp' ? parseInt(order.payment.money) : parseInt(order.payment.final_price)), 0);
    
                dailyReport.qris = orders.filter(order => order.entry_date === DashboardService.formatDate(date) && order.payment.method === 'qris')
                    .reduce((acc, order) => acc + (order.payment.status === 'dp' ? parseInt(order.payment.money) : parseInt(order.payment.final_price)), 0);
    
                financeReport.push(dailyReport);

                totalRevenue += dailyReport.revenue;
                totalIncome += dailyReport.income;
                totalExpense += dailyReport.expense;
                totalCapitalIn += dailyReport.capital_in;
                totalCash += dailyReport.cash;
                totalBankTransfer += dailyReport.bank_transfer;
                totalQris += dailyReport.qris;
            }
    
            summarizedData.orderCount = orders.length;
            summarizedData.totalOrder = totalRevenue;
            summarizedData.totalIncome = totalIncome;
            summarizedData.totalExpense = totalExpense;
            summarizedData.totalCapitalIn = totalCapitalIn;
            summarizedData.totalCash = totalCash;
            summarizedData.totalBankTransfer = totalBankTransfer;
            summarizedData.totalQris = totalQris;
            summarizedData.totalUnpaid = totalUnpaid;
            summarizedData.totalPaid = totalPaid;
            summarizedData.totalDP = totalDP;
            summarizedData.totalRevenue = totalRevenue;
            summarizedData.totalProfit = totalIncome - totalExpense;
    
            financeReport.push({
                date: 'Total',
                revenue: totalRevenue,
                unpaid: totalUnpaid,
                paid: totalPaid,
                dp: totalDP,
                income: totalIncome,
                expense: totalExpense,
                capital_in: totalCapitalIn,
                cash: totalCash,
                bank_transfer: totalBankTransfer,
                qris: totalQris
            });
    
            return {
                finance_report: financeReport,
                summarized_data: summarizedData
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async generateStatusReport({ month, year }) {
        try {
            const monthFilter = month ? month : new Date().getMonth() + 1;
            const yearFilter = year ? year : new Date().getFullYear();

            const startDate = new Date(yearFilter, monthFilter - 1, 1);
            const endDate = new Date(yearFilter, monthFilter, 0, 23, 59, 59);

            const orders = await DashboardRepository.generateStatusReport(startDate, endDate);

            const statusReport = [];

            const summarizedData = {
                totalItems: 0,
                totalAntrian: 0,
                totalProcess: 0,
                totalPengeringan: 0,
                totalSiapDiambil: 0,
                totalSelesai: 0,
                totalBatal: 0,
                antrian_data: [],
                process_data: [],
                pengeringan_data: [],
                siap_diambil_data: [],
                selesai_data: [],
                batal_data: []

            };

            for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
                const dailyReport = {
                    date: date.toISOString().split('T')[0],
                    antrian: 0,
                    process: 0,
                    pengeringan: 0,
                    siap_diambil: 0,
                    selesai: 0,
                    batal: 0,
                    antrian_data: [],
                    process_data: [],
                    pengeringan_data: [],
                    siap_diambil_data: [],
                    selesai_data: [],
                    batal_data: []
                };

                orders.forEach(order => {
                    if (new Date(order.entry_date).toISOString().split('T')[0] === dailyReport.date) {
                        order.order_details.forEach(detail => {
                            switch (detail.status) {
                                case 'not_yet':
                                    dailyReport.antrian += 1;
                                    summarizedData.totalAntrian += 1;
                                    dailyReport.antrian_data.push(
                                        {
                                            customer: order.customer,
                                            order_details: detail
                                        }
                                    );
                                    break;
                                case 'on_progress':
                                    dailyReport.process += 1;
                                    summarizedData.totalProcess += 1;
                                    dailyReport.process_data.push(
                                        {
                                            customer: order.customer,
                                            order_details: detail
                                        }
                                    );
                                    break;
                                case 'pengeringan':
                                    dailyReport.pengeringan += 1;
                                    summarizedData.totalPengeringan += 1;
                                    dailyReport.pengeringan_data.push(
                                        {
                                            customer: order.customer,
                                            order_details: detail
                                        }
                                    );
                                    break;
                                case 'siap':
                                    dailyReport.siap_diambil += 1;
                                    summarizedData.totalSiapDiambil += 1;
                                    dailyReport.siap_diambil_data.push(
                                        {
                                            customer: order.customer,
                                            order_details: detail
                                        }
                                    );
                                    break;
                                case 'done':
                                    dailyReport.selesai += 1;
                                    summarizedData.totalSelesai += 1;
                                    dailyReport.selesai_data.push(
                                        {
                                            customer: order.customer,
                                            order_details: detail
                                        }
                                    );
                                    break;
                                case 'cancelled':
                                    dailyReport.batal += 1;
                                    summarizedData.totalBatal += 1;
                                    dailyReport.batal_data.push(
                                        {
                                            customer: order.customer,
                                            order_details: detail
                                        }
                                    );
                                    break;
                            }
                        });
                    }
                });

                statusReport.push(dailyReport);
                summarizedData.totalItems += dailyReport.antrian + dailyReport.process + dailyReport.pengeringan + dailyReport.siap_diambil + dailyReport.selesai + dailyReport.batal;
            }

            return { status_report: statusReport, summarized_data: summarizedData };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = DashboardService;