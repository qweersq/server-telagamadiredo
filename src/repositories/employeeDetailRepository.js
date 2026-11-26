const { Op } = require('sequelize');
const { User, Absent, OrderDetail, OrderDetailStatusLog, Delivery, Branch, Order, sequelize } = require('../models');

class EmployeeDetailRepository {
    /**
     * Get employee basic information
     */
    static async getEmployeeBasicInfo(employee_id, user_tenant_id = null, user_role = null) {
        try {
            // Only filter by tenant_id, not branch_id (owner can see all employees in same tenant)
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             { tenant_id: user_tenant_id };

            const employee = await User.findByPk(employee_id, {
                where: baseWhere,
                include: [{
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name']
                }],
                attributes: ['id', 'name', 'email', 'phone', 'status', 'role', 'branch_id', 'createdAt']
            });

            return employee;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get attendance summary
     */
    static async getAttendanceSummary(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // Absent table only has branch_id, not tenant_id
            // So we need to join with User to validate tenant_id
            const attendance = await Absent.findAll({
                where: {
                    employee_id: employee_id,
                    date: {
                        [Op.between]: [start_date, end_date]
                    }
                },
                include: [{
                    model: User,
                    as: 'employee_absent',
                    required: true,
                    where: user_role === 'superapp-superadmin' ? {} : { tenant_id: user_tenant_id },
                    attributes: []
                }],
                attributes: ['id', 'date', 'clock_in', 'clock_out', 'status']
            });

            // Calculate work hours
            let totalWorkHours = 0;
            let presentDays = 0;
            let personalLeaveDays = 0;

            attendance.forEach(record => {
                const status = record.status ? record.status.toLowerCase() : '';
                
                // Check for Present/Hadir
                const isPresent = status === 'present' || status === 'hadir';
                
                // Check for PersonalLeave
                const isPersonalLeave = status === 'personalleave';
                
                if (isPresent && record.clock_in && record.clock_out) {
                    const clockIn = new Date(`2000-01-01T${record.clock_in}`);
                    const clockOut = new Date(`2000-01-01T${record.clock_out}`);
                    const workHours = Math.max(0, (clockOut - clockIn) / (1000 * 60 * 60));
                    totalWorkHours += workHours;
                    presentDays++;
                } else if (isPersonalLeave) {
                    personalLeaveDays++;
                }
            });

            return {
                present_days: presentDays,
                personal_leave_days: personalLeaveDays,
                total_work_hours: Math.round(totalWorkHours * 10) / 10 // Round to 1 decimal
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get revenue summary from order details
     */
    static async getRevenueSummary(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // ✅ FIX: Use subquery to get DISTINCT order_detail_ids first, then JOIN to avoid double counting
            const query = `
                SELECT 
                    COUNT(DISTINCT od.id) as total_items,
                    COALESCE(SUM(od.final_price), 0) as total_revenue
                FROM (
                    SELECT DISTINCT odsl.order_detail_id
                    FROM order_detail_status_logs odsl
                    WHERE odsl.updated_by = :employee_id
                      AND odsl.created_at >= :start_date
                      AND odsl.created_at <= :end_date
                ) AS DISTINCT_UPDATES
                JOIN order_details od ON DISTINCT_UPDATES.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND od.final_price > 0
            `;
            
            const replacements = {
                employee_id,
                start_date: start_date + ' 00:00:00',
                end_date: end_date + ' 23:59:59',
                tenant_id: user_tenant_id
            };

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return {
                total_revenue: parseFloat(result[0]?.total_revenue || 0),
                total_items: parseInt(result[0]?.total_items || 0)
            };
        } catch (error) {
            console.error('getRevenueSummary error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get processed items summary
     */
    static async getProcessedItemsSummary(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // Use OrderDetailStatusLog to find items processed by this employee
            const query = `
                SELECT COUNT(DISTINCT od.id) as total_items
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE odsl.updated_by = :employee_id
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND od.final_price > 0
            `;
            
            const replacements = {
                employee_id,
                start_date: start_date + ' 00:00:00',
                end_date: end_date + ' 23:59:59',
                tenant_id: user_tenant_id
            };

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return {
                total_items: parseInt(result[0]?.total_items || 0)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get delivery summary
     */
    static async getDeliverySummary(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // Use raw SQL query to avoid GROUP BY issues
            const query = `
                SELECT 
                    COUNT(d.id) as total_deliveries,
                    COALESCE(SUM(d.total_cost), 0) as total_cost,
                    COALESCE(SUM(d.total_distance), 0) as total_distance
                FROM deliveries d
                JOIN users u ON d.users_id = u.id
                WHERE d.users_id = :employee_id
                  AND d.date >= :start_date
                  AND d.date <= :end_date
                  AND d.deletedAt IS NULL
                  AND u.deletedAt IS NULL
                  AND u.tenant_id = :tenant_id
            `;
            
            const replacements = {
                employee_id,
                start_date,
                end_date,
                tenant_id: user_tenant_id
            };

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return {
                total_deliveries: parseInt(result[0]?.total_deliveries || 0),
                total_cost: parseFloat(result[0]?.total_cost || 0),
                total_distance: parseFloat(result[0]?.total_distance || 0)
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get progress updates summary (status changes)
     */
    static async getProgressUpdatesSummary(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // Only filter by tenant_id, not branch_id
            const baseWhere = user_role === 'superapp-superadmin' ? {} : 
                             { tenant_id: user_tenant_id };

            // Count status updates by this employee
            const result = await OrderDetailStatusLog.count({
                where: {
                    updated_by: employee_id,
                    created_at: {
                        [Op.between]: [start_date + ' 00:00:00', end_date + ' 23:59:59']
                    }
                },
                include: [{
                    model: OrderDetail,
                    as: 'order_detail',
                    required: true,
                    include: [{
                        model: Order,
                        where: baseWhere,
                        required: true
                    }]
                }]
            });

            return {
                total_updates: result
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get treatment breakdown by type (on_progress → pengeringan transition)
     */
    static async getTreatmentBreakdown(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            const query = `
                SELECT 
                    t.name as treatment_name,
                    COUNT(DISTINCT odsl.order_detail_id) as total_items
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN treatment t ON od.treatment_id = t.id
                WHERE odsl.updated_by = :employee_id
                  AND odsl.old_status = 'on_progress'
                  AND odsl.new_status = 'pengeringan'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                GROUP BY t.id, t.name
                ORDER BY total_items DESC
            `;
            
            const replacements = {
                employee_id,
                start_date: start_date + ' 00:00:00',
                end_date: end_date + ' 23:59:59',
                tenant_id: user_tenant_id
            };

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return result.map(row => ({
                treatment_name: row.treatment_name,
                total_items: parseInt(row.total_items || 0)
            }));
        } catch (error) {
            console.error('getTreatmentBreakdown error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get QC breakdown by treatment (pengeringan → siap/siap_diambil/siap_dikirim)
     */
    static async getQCBreakdown(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            const query = `
                SELECT 
                    t.name as treatment_name,
                    COUNT(DISTINCT odsl.order_detail_id) as total_qc
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN treatment t ON od.treatment_id = t.id
                WHERE odsl.updated_by = :employee_id
                  AND odsl.old_status = 'pengeringan'
                  AND odsl.new_status IN ('siap', 'siap_diambil', 'siap_dikirim')
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                GROUP BY t.id, t.name
                ORDER BY total_qc DESC
            `;
            
            const replacements = {
                employee_id,
                start_date: start_date + ' 00:00:00',
                end_date: end_date + ' 23:59:59',
                tenant_id: user_tenant_id
            };

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return result.map(row => ({
                treatment_name: row.treatment_name,
                total_qc: parseInt(row.total_qc || 0)
            }));
        } catch (error) {
            console.error('getQCBreakdown error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get pickup vs delivery breakdown (from status log transitions)
     */
    static async getPickupDeliveryBreakdown(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            // Count pickup (not_yet → antrian transition) - grouped by order_id
            // Satu order dengan 2 sepatu = 1 pickup (bukan 2)
            const pickupQuery = `
                SELECT COUNT(DISTINCT od.order_id) as total_pickups
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE odsl.updated_by = :employee_id
                  AND odsl.old_status = 'not_yet'
                  AND odsl.new_status = 'antrian'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
            `;

            // Count deliveries (siap_dikirim → done transition) - grouped by order_id
            // Satu order dengan 2 sepatu = 1 delivery (bukan 2)
            const deliveryQuery = `
                SELECT COUNT(DISTINCT od.order_id) as total_deliveries
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE odsl.updated_by = :employee_id
                  AND odsl.old_status = 'siap_dikirim'
                  AND odsl.new_status = 'done'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
            `;
            
            const replacements = {
                employee_id,
                start_date: start_date + ' 00:00:00',
                end_date: end_date + ' 23:59:59',
                tenant_id: user_tenant_id
            };

            const [pickupResult, deliveryResult] = await Promise.all([
                sequelize.query(pickupQuery, { replacements, type: sequelize.QueryTypes.SELECT }),
                sequelize.query(deliveryQuery, { replacements, type: sequelize.QueryTypes.SELECT })
            ]);

            return {
                total_pickups: parseInt(pickupResult[0]?.total_pickups || 0),
                total_deliveries: parseInt(deliveryResult[0]?.total_deliveries || 0)
            };
        } catch (error) {
            console.error('getPickupDeliveryBreakdown error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Get monthly performance data (revenue & items)
     */
    static async getMonthlyPerformanceData(employee_id, start_date, end_date, user_tenant_id = null, user_role = null) {
        try {
            const replacements = {
                employee_id,
                start_date: start_date + ' 00:00:00',
                end_date: end_date + ' 23:59:59'
            };

            const tenantFilter = this._buildTenantFilter(user_role, user_tenant_id, replacements);
            const query = this._buildMonthlyPerformanceQuery(tenantFilter);
            
            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.map(row => this._formatMonthlyData(row));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Build tenant filter for data isolation
     * @private
     */
    static _buildTenantFilter(user_role, user_tenant_id, replacements) {
        if (user_role === 'superapp-superadmin') {
            return '';
        }
        
        // Only filter by tenant_id, not branch_id
            replacements.tenant_id = user_tenant_id;
            return 'AND o.tenant_id = :tenant_id';
    }

    /**
     * Build monthly performance SQL query
     * @private
     */
    static _buildMonthlyPerformanceQuery(tenantFilter) {
        return `
            SELECT 
                month,
                COUNT(*) as items,
                COALESCE(SUM(final_price), 0) as revenue
            FROM (
                SELECT DISTINCT
                    DATE_FORMAT(odsl.created_at, '%Y-%m') as month,
                    odsl.order_detail_id,
                    od.final_price
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE odsl.updated_by = :employee_id
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  ${tenantFilter}
            ) AS monthly_items
            GROUP BY month
            ORDER BY month ASC
        `;
    }

    /**
     * Format monthly data with Indonesian month labels
     * @private
     */
    static _formatMonthlyData(row) {
        const monthLabels = {
            '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
            '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
            '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
        };

        const [year, monthNum] = row.month.split('-');
        const monthLabel = `${monthLabels[monthNum]} ${year.slice(2)}`;

        return {
            month: row.month,
            month_label: monthLabel,
            revenue: parseFloat(row.revenue || 0),
            items: parseInt(row.items || 0)
        };
    }
}

module.exports = EmployeeDetailRepository;
