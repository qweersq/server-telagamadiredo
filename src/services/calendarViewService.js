const CalendarViewRepository = require('../repositories/calendarViewRepository');

class CalendarViewService {
    static async getCalendarView(data) {
        try {
            const monthFilter = data.month && !isNaN(data.month) ? parseInt(data.month, 10) : new Date().getMonth() + 1;
            const yearFilter = data.year && !isNaN(data.year) ? parseInt(data.year, 10) : new Date().getFullYear();

            if (monthFilter < 1 || monthFilter > 12) throw new Error('Month parameter must be between 1-12');
            if (yearFilter < 1) throw new Error('Year parameter is invalid');

            const startDate = new Date(Date.UTC(yearFilter, monthFilter - 1, 1));
            const endDate = new Date(Date.UTC(yearFilter, monthFilter, 0));

            const orders = await CalendarViewRepository.getOrderByDate(startDate, endDate);

            const summarizedData = {
                totalItems: 0,
                totalAntrian: 0,
                totalProcess: 0,
                totalPengeringan: 0,
                totalSiapDiambil: 0,
                totalSelesai: 0,
                totalBatal: 0,
                totalPaid: 0,
                totalUnpaid: 0,
                totalDp: 0,
            };

            const statusReport = [];

            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dailyReport = {
                    date: currentDate.toISOString().split('T')[0],
                    antrian: 0,
                    process: 0,
                    pengeringan: 0,
                    siap_diambil: 0,
                    selesai: 0,
                    batal: 0,
                    paid: 0,
                    unpaid: 0,
                    dp: 0,
                    antrian_data: [],
                    process_data: [],
                    pengeringan_data: [],
                    siap_diambil_data: [],
                    selesai_data: [],
                    batal_data: [],
                    paid_data: [],
                    unpaid_data: [],
                    dp_data: []
                };

                orders.forEach(order => {
                    const dueDate = order.order_details[0]?.due_date;
                    if (dueDate && new Date(dueDate).toISOString().split('T')[0] === dailyReport.date) {
                        const paymentStatus = order.payment?.status || 'unpaid';
                        if (paymentStatus === 'paid') {
                            dailyReport.paid += 1;
                            summarizedData.totalPaid += 1;
                            dailyReport.paid_data.push({ customer: order.customer, payment: order.payment });
                        } else if (paymentStatus === 'unpaid') {
                            dailyReport.unpaid += 1;
                            summarizedData.totalUnpaid += 1;
                            dailyReport.unpaid_data.push({ customer: order.customer, payment: order.payment });
                        } else if (paymentStatus === 'dp') {
                            dailyReport.dp += 1;
                            summarizedData.totalDp += 1;
                            dailyReport.dp_data.push({ customer: order.customer, payment: order.payment });
                        }

                        order.order_details.forEach(detail => {
                            switch (detail.status) {
                                case 'not_yet':
                                    dailyReport.antrian += 1;
                                    summarizedData.totalAntrian += 1;
                                    dailyReport.antrian_data.push({ customer: order.customer, detail, payment: order.payment });
                                    break;
                                case 'on_progress':
                                    dailyReport.process += 1;
                                    summarizedData.totalProcess += 1;
                                    dailyReport.process_data.push({ customer: order.customer, detail, payment: order.payment });
                                    break;
                                case 'pengeringan':
                                    dailyReport.pengeringan += 1;
                                    summarizedData.totalPengeringan += 1;
                                    dailyReport.pengeringan_data.push({ customer: order.customer, detail, payment: order.payment });
                                    break;
                                case 'siap':
                                    dailyReport.siap_diambil += 1;
                                    summarizedData.totalSiapDiambil += 1;
                                    dailyReport.siap_diambil_data.push({ customer: order.customer, detail, payment: order.payment });
                                    break;
                                case 'done':
                                    dailyReport.selesai += 1;
                                    summarizedData.totalSelesai += 1;
                                    dailyReport.selesai_data.push({ customer: order.customer, detail, payment: order.payment });
                                    break;
                                case 'cancelled':
                                    dailyReport.batal += 1;
                                    summarizedData.totalBatal += 1;
                                    dailyReport.batal_data.push({ customer: order.customer, detail, payment: order.payment });
                                    break;
                            }
                        });
                    }
                });

                summarizedData.totalItems += dailyReport.antrian + dailyReport.process + dailyReport.pengeringan +
                    dailyReport.siap_diambil + dailyReport.selesai + dailyReport.batal;

                statusReport.push(dailyReport);

                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return {
                status_report: statusReport,
                summarized_data: summarizedData
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };
};

module.exports = CalendarViewService;