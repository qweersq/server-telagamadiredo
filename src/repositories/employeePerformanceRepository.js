const { Op, sequelize, User, Absent, Delivery, OrderDetail, OrderDetailStatusLog, Branch, Item, Treatment, Order, Customer, ShoePhoto, ItemStatusPhoto } = require('../models');
const moment = require('moment');

class EmployeePerformanceRepository {
    static async getAllEmployees(raw) {
        try {
            const offset = (raw.page - 1) * raw.pageSize;
            const limit = raw.pageSize;

            const whereClause = {};

            // Filter status - default active jika tidak ada filter
            if (raw.status) {
                whereClause.status = raw.status;
            } else {
                whereClause.status = 'active';
            }

            // Filter role - include employee, admin, dan supervisor; exclude superadmin
            if (raw.role) {
                whereClause.role = raw.role;
            } else {
                whereClause.role = {
                    [Op.in]: ['employee', 'admin', 'supervisor']
                };
            }

            // Filter branch
            if (raw.branch_id) {
                whereClause.branch_id = raw.branch_id;
            }

            // Filter tenant_id
            if (raw.tenant_id) {
                whereClause.tenant_id = raw.tenant_id;
            }

            // Search filter
            if (raw.search) {
                whereClause[Op.or] = [
                    { name: { [Op.substring]: raw.search } },
                    { email: { [Op.substring]: raw.search } },
                    { phone: { [Op.substring]: raw.search } }
                ];
            }

            // Prepare branch include with tenant_id filter
            const branchInclude = {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name']
            };

            // Add tenant_id filter to branch if tenant_id is provided
            if (raw.tenant_id) {
                branchInclude.where = {
                    tenant_id: raw.tenant_id
                };
            }

            const employees = await User.findAndCountAll({
                where: whereClause,
                include: [branchInclude],
                attributes: ['id', 'name', 'email', 'phone', 'status', 'role', 'salary', 'branch_id'],
                limit: limit,
                offset: offset,
                order: [['name', 'ASC']]
            });

            return {
                employees: employees.rows,
                pagination: {
                    page: raw.page,
                    pageSize: raw.pageSize,
                    total: employees.count,
                    totalPages: Math.ceil(employees.count / raw.pageSize)
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeSummary(employee_id, raw) {
        try {
            // Get employee basic info
            const employee = await User.findByPk(employee_id, {
                include: [
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name'],
                        ...(raw.tenant_id && { where: { tenant_id: raw.tenant_id } })
                    }
                ],
                attributes: ['id', 'name', 'email', 'phone', 'status', 'role', 'salary', 'branch_id']
            });

            if (!employee) {
                throw new Error('Employee not found');
            }

            // Get attendance summary
            const attendanceSummary = await this.getAttendanceSummary(employee_id, raw);

            // Transform employee data to match expected format
            const employeeData = employee.toJSON();
            const branchData = employeeData.branch;
            delete employeeData.branch;
            
            return {
                employee: {
                    ...employeeData,
                    Branch: branchData
                },
                summary: {
                    attendance: attendanceSummary
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeAttendance(employee_id, raw) {
        try {
            const attendance = await Absent.findAll({
                where: {
                    employee_id: employee_id,
                    date: {
                        [Op.between]: [raw.start_date, raw.end_date]
                    }
                },
                order: [['date', 'DESC']]
            });

            // Add calculated work_hours to each attendance record
            const attendanceWithWorkHours = attendance.map(a => {
                const attendanceData = a.toJSON();
                let workHours = 0;
                
                if (a.clock_in && a.clock_out && a.status && a.status.toLowerCase() === 'present') {
                    const clockIn = moment(a.clock_in, 'HH:mm:ss');
                    const clockOut = moment(a.clock_out, 'HH:mm:ss');
                    workHours = Math.max(0, clockOut.diff(clockIn, 'hours', true));
                }
                
                return {
                    ...attendanceData,
                    calculated_work_hours: workHours
                };
            });

            return attendanceWithWorkHours;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeDeliveries(employee_id, raw) {
        try {
            const offset = (raw.page - 1) * raw.pageSize;
            const limit = raw.pageSize;

            const whereClause = {
                users_id: employee_id,
                date: {
                    [Op.between]: [raw.start_date, raw.end_date]
                }
            };

            // Get total count for pagination
            const totalCount = await Delivery.count({
                where: whereClause
            });

            // Get paginated deliveries
            const deliveries = await Delivery.findAll({
                where: whereClause,
                order: [['date', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Get summary data (all data, not paginated)
            const summaryData = await this.getDeliverySummary(employee_id, raw);

            return {
                deliveries: deliveries,
                summary: summaryData,
                pagination: {
                    page: raw.page,
                    pageSize: raw.pageSize,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / raw.pageSize)
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeProcessedItems(employee_id, raw) {
        try {
            const offset = (raw.page - 1) * raw.pageSize;
            const limit = raw.pageSize;

            const whereClause = {
                updated_by: employee_id,
                created_at: {
                    [Op.between]: [raw.start_date + ' 00:00:00', raw.end_date + ' 23:59:59']
                }
            };

            // Get total count for pagination (only valid order_details)
            const totalCount = await OrderDetailStatusLog.count({
                where: whereClause,
                include: [
                    {
                        model: OrderDetail,
                        as: 'order_detail',
                        required: true
                    }
                ],
                distinct: true,
                col: 'order_detail_id'
            });

            // Get paginated status logs
            const statusLogs = await OrderDetailStatusLog.findAll({
                where: whereClause,
                include: [
                    {
                        model: OrderDetail,
                        as: 'order_detail',
                        required: true, // Only include logs that have valid order_detail
                        include: [
                            {
                                model: Item,
                                as: 'item',
                                attributes: ['id', 'name']
                            },
                            {
                                model: Treatment,
                                as: 'treatment',
                                attributes: ['id', 'name']
                            },
                            {
                                model: Order,
                                required: false, // Allow null orders
                                include: [
                                    {
                                        model: Customer,
                                        as: 'customer',
                                        required: false, // Allow null customers
                                        attributes: ['id', 'name', 'phone']
                                    }
                                ],
                                attributes: ['id']
                            },
                            {
                                model: ShoePhoto,
                                as: 'shoes_photos',
                                attributes: ['id', 'url_photo', 'createdAt'],
                            }
                        ],
                        attributes: ['id','order_id','treatment_id', 'item_id', 'final_price', 'status', 'description', 'createdAt']
                    },
                    {
                        model: User,
                        as: 'status_updater',
                        attributes: ['id', 'name']
                    },
                    {
                        model: ItemStatusPhoto,
                        as: 'item_status_photos',
                        attributes: ['id', 'photo_url', 'createdAt']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: limit,
                offset: offset
            });

            // Get summary data (all data, not paginated)
            const summaryData = await this.getProcessedItemsSummary(employee_id, raw);

            // Transform data to match expected format
            const processedItems = statusLogs
                .filter(log => log.order_detail !== null) // Filter out null order_detail
                .map(log => {
                    const orderDetail = log.order_detail;
                    
                                
                    
                    return {
                        id: orderDetail.id,
                        order_detail_id: log.order_detail_id,
                        employee_id: employee_id,
                        treatment_id: orderDetail.treatment_id,
                        item_id: orderDetail.item_id,
                        final_price: orderDetail.final_price,
                        status: orderDetail.status,
                        description: orderDetail.description,
                        createdAt: orderDetail.createdAt,
                        updatedAt: log.created_at,
                        item: orderDetail.item,
                        treatment: orderDetail.treatment,
                        customer: orderDetail.order?.customer || null,
                        item_photo: orderDetail.shoes_photos || [],
                        status_logs: [{
                            id: log.id,
                            order_detail_id: log.order_detail_id,
                            old_status: log.old_status,
                            new_status: log.new_status,
                            updated_by: log.updated_by,
                            created_at: log.created_at,
                            status_updater: log.status_updater,
                            photos: log.item_status_photos || []
                        }]
                    };
                });

            return {
                items: processedItems,
                summary: summaryData,
                pagination: {
                    page: raw.page,
                    pageSize: raw.pageSize,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / raw.pageSize)
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeePerformanceChart(employee_id, raw) {
        try {
            let chartData = [];

            switch (raw.chart_type) {
                case 'work_hours':
                    chartData = await this.getWorkHoursChartData(employee_id, raw);
                    break;
                case 'processed_items':
                    chartData = await this.getProcessedItemsChartData(employee_id, raw);
                    break;
                case 'delivery_cost':
                    chartData = await this.getDeliveryCostChartData(employee_id, raw);
                    break;
                default:
                    throw new Error('Invalid chart type');
            }

            return chartData;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeDetail(employee_id, raw = {}) {
        try {
            const employee = await User.findByPk(employee_id, {
                include: [
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name'],
                        ...(raw.tenant_id && { where: { tenant_id: raw.tenant_id } })
                    }
                ],
                attributes: ['id', 'name', 'email', 'phone', 'address', 'status', 'role', 'salary', 'salary_date', 'branch_id', 'createdAt']
            });

            if (!employee) {
                throw new Error('Employee not found');
            }

            return employee;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Helper methods for summary calculations
    static async getAttendanceSummary(employee_id, raw) {
        try {
            const attendance = await Absent.findAll({
                where: {
                    employee_id: employee_id,
                    date: {
                        [Op.between]: [raw.start_date, raw.end_date]
                    }
                }
            });

            const totalDays = attendance.length;
            const presentDays = attendance.filter(a => a.status && a.status.toLowerCase() === 'present').length;
            
            // Calculate work hours manually from clock_in and clock_out
            const totalWorkHours = attendance.reduce((total, a) => {
                if (a.clock_in && a.clock_out && a.status && a.status.toLowerCase() === 'present') {
                    const clockIn = moment(a.clock_in, 'HH:mm:ss');
                    const clockOut = moment(a.clock_out, 'HH:mm:ss');
                    const duration = clockOut.diff(clockIn, 'hours', true);
                    return total + Math.max(0, duration); // Ensure non-negative
                }
                return total;
            }, 0);

            return {
                total_days: totalDays,
                present_days: presentDays,
                attendance_rate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
                total_work_hours: totalWorkHours,
                average_work_hours: presentDays > 0 ? totalWorkHours / presentDays : 0
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDeliverySummary(employee_id, raw) {
        try {
            const deliveries = await Delivery.findAll({
                where: {
                    users_id: employee_id,
                    date: {
                        [Op.between]: [raw.start_date, raw.end_date]
                    }
                }
            });

            const totalDistance = deliveries.reduce((total, d) => total + parseFloat(d.total_distance || 0), 0);
            const totalCost = deliveries.reduce((total, d) => total + parseFloat(d.total_cost || 0), 0);
            const totalQuantity = deliveries.reduce((total, d) => total + parseInt(d.quantity || 0), 0);

            return {
                total_deliveries: deliveries.length,
                total_distance: totalDistance,
                total_cost: totalCost,
                total_quantity: totalQuantity,
                average_distance: deliveries.length > 0 ? totalDistance / deliveries.length : 0,
                average_cost: deliveries.length > 0 ? totalCost / deliveries.length : 0,
                average_quantity: deliveries.length > 0 ? totalQuantity / deliveries.length : 0
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getProcessedItemsSummary(employee_id, raw) {
        try {
            const statusLogs = await OrderDetailStatusLog.findAll({
                where: {
                    updated_by: employee_id,
                    created_at: {
                        [Op.between]: [raw.start_date + ' 00:00:00', raw.end_date + ' 23:59:59']
                    }
                },
                include: [
                    {
                        model: OrderDetail,
                        as: 'order_detail',
                        required: true, // Only include logs that have valid order_detail
                        attributes: ['id', 'status', 'final_price']
                    }
                ]
            });

            // Get unique order details that were processed by this employee
            const uniqueOrderDetails = new Set();
            const statusCounts = {
                completed: 0,
                pending: 0,
                processing: 0,
                not_yet: 0,
                antrian: 0
            };
            let totalRevenue = 0;

            statusLogs.forEach(log => {
                if (log.order_detail !== null) {
                    uniqueOrderDetails.add(log.order_detail_id);
                    const status = log.order_detail.status;
                    const finalPrice = parseFloat(log.order_detail.final_price || 0);
                    
                    if (statusCounts.hasOwnProperty(status)) {
                        statusCounts[status]++;
                    }
                    
                    // Add to total revenue
                    totalRevenue += finalPrice;
                }
            });

            const totalItems = uniqueOrderDetails.size;
            const completedItems = statusCounts.completed || 0;
            const pendingItems = statusCounts.pending || 0;
            const processingItems = statusCounts.processing || 0;

            return {
                total_items: totalItems,
                completed_items: completedItems,
                pending_items: pendingItems,
                processing_items: processingItems,
                not_yet_items: statusCounts.not_yet || 0,
                antrian_items: statusCounts.antrian || 0,
                total_revenue: totalRevenue,
                average_revenue_per_item: totalItems > 0 ? totalRevenue / totalItems : 0,
                completion_rate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Helper methods for chart data
    static async getWorkHoursChartData(employee_id, raw) {
        try {
            const attendance = await Absent.findAll({
                where: {
                    employee_id: employee_id,
                    date: {
                        [Op.between]: [raw.start_date, raw.end_date]
                    }
                },
                order: [['date', 'ASC']]
            });

            return attendance.map(a => {
                let workHours = 0;
                if (a.clock_in && a.clock_out && a.status && a.status.toLowerCase() === 'present') {
                    const clockIn = moment(a.clock_in, 'HH:mm:ss');
                    const clockOut = moment(a.clock_out, 'HH:mm:ss');
                    workHours = Math.max(0, clockOut.diff(clockIn, 'hours', true));
                }

                return {
                    date: a.date,
                    work_hours: workHours,
                    status: a.status,
                    clock_in: a.clock_in,
                    clock_out: a.clock_out
                };
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getProcessedItemsChartData(employee_id, raw) {
        try {
            const statusLogs = await OrderDetailStatusLog.findAll({
                where: {
                    updated_by: employee_id,
                    created_at: {
                        [Op.between]: [raw.start_date + ' 00:00:00', raw.end_date + ' 23:59:59']
                    }
                },
                include: [
                    {
                        model: OrderDetail,
                        as: 'order_detail',
                        required: true, // Only include logs that have valid order_detail
                        attributes: ['id']
                    }
                ],
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('order_detail_id'))), 'count']
                ],
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
            });

            return statusLogs.map(item => ({
                date: item.getDataValue('date'),
                count: parseInt(item.getDataValue('count'))
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDeliveryCostChartData(employee_id, raw) {
        try {
            const deliveries = await Delivery.findAll({
                where: {
                    users_id: employee_id,
                    date: {
                        [Op.between]: [raw.start_date, raw.end_date]
                    }
                },
                order: [['date', 'ASC']]
            });

            return deliveries.map(d => ({
                date: d.date,
                cost: parseFloat(d.total_cost || 0),
                distance: parseFloat(d.total_distance || 0)
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = EmployeePerformanceRepository;
