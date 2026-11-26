const EmployeeDetailRepository = require('../repositories/employeeDetailRepository');

class EmployeeDetailService {
    /**
     * Get comprehensive employee summary data
     * @param {number} employee_id - Employee ID
     * @param {string} start_date - Start date (YYYY-MM-DD)
     * @param {string} end_date - End date (YYYY-MM-DD)
     * @param {number} user_tenant_id - User tenant ID for data isolation
     * @param {string} user_role - User role for data isolation
     * @returns {object} Summary data
     */
    static async getEmployeeSummary(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // Validate inputs
            if (!employee_id || !start_date || !end_date) {
                throw new Error('employee_id, start_date, and end_date are required');
            }

            // Get employee basic info
            const employee = await EmployeeDetailRepository.getEmployeeBasicInfo(employee_id, user_tenant_id, user_role);
            
            if (!employee) {
                throw new Error('Employee not found');
            }

            // Get all summary metrics in parallel with error handling
            let attendanceData, revenueData, processedItemsData, deliveryData, progressUpdatesData, treatmentBreakdown, pickupDeliveryBreakdown, qcBreakdown;
            
            try {
                [
                    attendanceData,
                    revenueData,
                    processedItemsData,
                    deliveryData,
                    progressUpdatesData,
                    treatmentBreakdown,
                    pickupDeliveryBreakdown,
                    qcBreakdown
                ] = await Promise.all([
                    EmployeeDetailRepository.getAttendanceSummary(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getRevenueSummary(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getProcessedItemsSummary(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getDeliverySummary(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getProgressUpdatesSummary(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getTreatmentBreakdown(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getPickupDeliveryBreakdown(employee_id, start_date, end_date, user_tenant_id, user_role),
                    EmployeeDetailRepository.getQCBreakdown(employee_id, start_date, end_date, user_tenant_id, user_role)
                ]);
                
                console.log('Repository data:', {
                    attendanceData,
                    revenueData,
                    processedItemsData,
                    deliveryData,
                    progressUpdatesData
                });
            } catch (error) {
                console.error('Error fetching summary data:', error);
                // Set default values if any query fails
                attendanceData = { present_days: 0, personal_leave_days: 0, total_work_hours: 0 };
                revenueData = { total_revenue: 0, total_items: 0 };
                processedItemsData = { total_items: 0 };
                deliveryData = { total_deliveries: 0, total_cost: 0 };
                progressUpdatesData = { total_updates: 0 };
                treatmentBreakdown = [];
                pickupDeliveryBreakdown = { total_pickups: 0, total_deliveries: 0 };
                qcBreakdown = [];
            }

            // Calculate total work days in period
            const start = new Date(start_date);
            const end = new Date(end_date);
            // Calculate days between start and end (inclusive)
            const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

            // Calculate total treatments completed from breakdown
            const totalTreatmentsCompleted = treatmentBreakdown.reduce((sum, t) => sum + t.total_items, 0);
            
            // Calculate total QC from breakdown
            const totalQC = qcBreakdown.reduce((sum, q) => sum + q.total_qc, 0);

            // Calculate daily averages based on actual work days (present_days)
            const workDays = attendanceData.present_days || 1; // Use 1 to avoid division by zero
            const dailyAverages = {
                revenue: revenueData.total_revenue / workDays,
                items_processed: processedItemsData.total_items / workDays,
                progress_updates: progressUpdatesData.total_updates / workDays,
                deliveries: deliveryData.total_deliveries / workDays
            };

            return {
                employee: {
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    phone: employee.phone,
                    status: employee.status,
                    role: employee.role,
                    branch: employee.branch
                },
                period: {
                    start_date,
                    end_date,
                    total_days: totalDays
                },
                summary: {
                    // Revenue metrics
                    revenue: {
                        total: revenueData.total_revenue,
                        daily_average: dailyAverages.revenue,
                        items_processed: processedItemsData.total_items,
                        revenue_per_item: processedItemsData.total_items > 0 ? revenueData.total_revenue / processedItemsData.total_items : 0,
                        treatments_completed: totalTreatmentsCompleted
                    },
                    
                    // Attendance metrics
                    attendance: {
                        present_days: attendanceData.present_days,
                        personal_leave_days: attendanceData.personal_leave_days,
                        total_work_hours: attendanceData.total_work_hours,
                        attendance_rate: totalDays > 0 ? (attendanceData.present_days / totalDays) * 100 : 0,
                        average_hours_per_day: attendanceData.present_days > 0 ? attendanceData.total_work_hours / attendanceData.present_days : 0
                    },
                    
                    // Progress metrics
                    progress: {
                        total_updates: progressUpdatesData.total_updates,
                        daily_average: dailyAverages.progress_updates,
                        updates_per_item: processedItemsData.total_items > 0 ? progressUpdatesData.total_updates / processedItemsData.total_items : 0
                    },
                    
                    // Delivery metrics
                    delivery: {
                        total_deliveries: deliveryData.total_deliveries,
                        total_cost: deliveryData.total_cost,
                        total_distance: deliveryData.total_distance,
                        daily_average: dailyAverages.deliveries,
                        cost_per_delivery: deliveryData.total_deliveries > 0 ? deliveryData.total_cost / deliveryData.total_deliveries : 0
                    }
                },
                
                // Breakdown data for detailed activity
                breakdown: {
                    pickup_delivery: {
                        total_pickups: pickupDeliveryBreakdown.total_pickups,
                        total_deliveries: pickupDeliveryBreakdown.total_deliveries
                    },
                    treatments: treatmentBreakdown,
                    qc: {
                        total_qc: totalQC,
                        treatments: qcBreakdown
                    }
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get employee performance chart data (monthly aggregation)
     * @param {number} employee_id - Employee ID
     * @param {string} period - Period type: '6_months', '1_year', 'all_time'
     * @param {string} custom_start_date - Custom start date (optional)
     * @param {string} custom_end_date - Custom end date (optional)
     * @param {number} user_tenant_id - User tenant ID
     * @param {string} user_role - User role
     * @returns {object} Chart data
     */
    static async getPerformanceChart(employee_id, period = '6_months', custom_start_date = null, custom_end_date = null, user_tenant_id = null, user_role = null) {
        try {
            // Calculate date range based on period
            let start_date, end_date;
            const today = new Date();
            
            if (custom_start_date && custom_end_date) {
                // Custom range
                start_date = custom_start_date;
                end_date = custom_end_date;
            } else if (period === '6_months') {
                // 6 months ago
                const sixMonthsAgo = new Date(today);
                sixMonthsAgo.setMonth(today.getMonth() - 6);
                start_date = sixMonthsAgo.toISOString().split('T')[0];
                end_date = today.toISOString().split('T')[0];
            } else if (period === '1_year') {
                // 1 year ago
                const oneYearAgo = new Date(today);
                oneYearAgo.setFullYear(today.getFullYear() - 1);
                start_date = oneYearAgo.toISOString().split('T')[0];
                end_date = today.toISOString().split('T')[0];
            } else if (period === 'all_time') {
                // From employee creation date
                const employee = await EmployeeDetailRepository.getEmployeeBasicInfo(employee_id, user_tenant_id, user_role);
                if (!employee) {
                    throw new Error('Employee not found');
                }
                
                // Fallback to 1 year ago if createdAt is invalid
                if (employee.createdAt && !isNaN(new Date(employee.createdAt).getTime())) {
                    start_date = new Date(employee.createdAt).toISOString().split('T')[0];
                } else {
                    const oneYearAgo = new Date(today);
                    oneYearAgo.setFullYear(today.getFullYear() - 1);
                    start_date = oneYearAgo.toISOString().split('T')[0];
                }
                end_date = today.toISOString().split('T')[0];
            } else {
                // Default to 6 months
                const sixMonthsAgo = new Date(today);
                sixMonthsAgo.setMonth(today.getMonth() - 6);
                start_date = sixMonthsAgo.toISOString().split('T')[0];
                end_date = today.toISOString().split('T')[0];
            }

            // Get monthly data from repository
            const monthlyData = await EmployeeDetailRepository.getMonthlyPerformanceData(
                employee_id,
                start_date,
                end_date,
                user_tenant_id,
                user_role
            );

            // Add month-over-month growth to each month
            for (let i = 0; i < monthlyData.length; i++) {
                if (i === 0) {
                    // First month has no previous month
                    monthlyData[i].revenue_growth_pct = null;
                    monthlyData[i].items_growth_pct = null;
                } else {
                    const prevMonth = monthlyData[i - 1];
                    const currMonth = monthlyData[i];
                    
                    // Revenue growth
                    if (prevMonth.revenue > 0) {
                        monthlyData[i].revenue_growth_pct = ((currMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
                    } else {
                        monthlyData[i].revenue_growth_pct = null;
                    }
                    
                    // Items growth
                    if (prevMonth.items > 0) {
                        monthlyData[i].items_growth_pct = ((currMonth.items - prevMonth.items) / prevMonth.items) * 100;
                    } else {
                        monthlyData[i].items_growth_pct = null;
                    }
                }
            }
            
            // Calculate summary statistics
            const totalRevenue = monthlyData.reduce((sum, month) => sum + parseFloat(month.revenue || 0), 0);
            const totalItems = monthlyData.reduce((sum, month) => sum + parseInt(month.items || 0), 0);
            
            // Overall growth (last month vs previous month)
            let revenueGrowth = 0;
            let itemsGrowth = 0;
            
            if (monthlyData.length >= 2) {
                const lastMonth = monthlyData[monthlyData.length - 1];
                revenueGrowth = lastMonth.revenue_growth_pct || 0;
                itemsGrowth = lastMonth.items_growth_pct || 0;
            }

            return {
                period: period,
                date_range: {
                    start: start_date,
                    end: end_date
                },
                data: monthlyData,
                summary: {
                    total_revenue: totalRevenue,
                    total_items: totalItems,
                    avg_monthly_revenue: monthlyData.length > 0 ? totalRevenue / monthlyData.length : 0,
                    avg_monthly_items: monthlyData.length > 0 ? totalItems / monthlyData.length : 0,
                    revenue_growth: revenueGrowth,
                    items_growth: itemsGrowth
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = EmployeeDetailService;
