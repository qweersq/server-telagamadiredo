const { Op } = require('sequelize');
const { User, Absent, Delivery, sequelize } = require('../models');

class EmployeeDailyReportRepository {
    /**
     * Ubah total detik kerja menjadi "HH:MM".
     * Jam di-pad minimal 2 digit (08:30) supaya tampilan satu hari tidak berubah
     * dibanding sebelumnya, tapi jam di atas 99 tetap tampil utuh (176:30)
     * karena periode bisa lebih dari 4 hari.
     */
    static formatWorkHours(totalSeconds) {
        const seconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    /**
     * Get all employees in a tenant (optionally filtered by branch)
     */
    static async getAllEmployees(tenant_id, branch_id = null) {
        try {
            const where = {
                tenant_id,
                role: { [Op.in]: ['employee', 'admin', 'supervisor'] },
                status: 'active',
                deletedAt: null
            };

            if (branch_id) {
                where.branch_id = branch_id;
            }

            const employees = await User.findAll({
                where,
                attributes: ['id', 'name', 'email', 'phone', 'status', 'role', 'branch_id'],
                raw: true
            });

            return employees;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get pickup counts per employee for a specific date
     * Counts DISTINCT order_id where employee did not_yet → antrian
     */
    static async getPickupCounts(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    odsl.updated_by as employee_id,
                    COUNT(DISTINCT od.order_id) as total
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'not_yet'
                  AND odsl.new_status = 'antrian'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY odsl.updated_by
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = parseInt(row.total || 0);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get "on_progress" counts per employee (antrian → on_progress)
     */
    static async getOnProgressCounts(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    odsl.updated_by as employee_id,
                    COUNT(DISTINCT odsl.order_detail_id) as total
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'antrian'
                  AND odsl.new_status = 'on_progress'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY odsl.updated_by
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = parseInt(row.total || 0);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get "selesai dikerjakan" counts (on_progress → pengeringan)
     */
    static async getSelesaiDikerjakanCounts(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    odsl.updated_by as employee_id,
                    COUNT(DISTINCT odsl.order_detail_id) as total
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'on_progress'
                  AND odsl.new_status = 'pengeringan'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY odsl.updated_by
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = parseInt(row.total || 0);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get QC Item counts (pengeringan → siap_diambil/siap_dikirim)
     */
    static async getQCItemCounts(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    odsl.updated_by as employee_id,
                    COUNT(DISTINCT odsl.order_detail_id) as total
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'pengeringan'
                  AND odsl.new_status IN ('siap', 'siap_diambil', 'siap_dikirim')
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY odsl.updated_by
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = parseInt(row.total || 0);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get delivery counts (siap_dikirim → done), grouped by DISTINCT order_id
     */
    static async getDeliveryCounts(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    odsl.updated_by as employee_id,
                    COUNT(DISTINCT od.order_id) as total
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'siap_dikirim'
                  AND odsl.new_status = 'done'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY odsl.updated_by
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = parseInt(row.total || 0);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get delivery data from deliveries table (qty & distance)
     */
    static async getDeliveryTableData(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate,
                end_date: endDate
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    d.users_id as employee_id,
                    COUNT(d.id) as total_deliveries,
                    COALESCE(SUM(d.quantity), 0) as total_qty,
                    COALESCE(SUM(d.total_distance), 0) as total_distance
                FROM deliveries d
                JOIN users u ON d.users_id = u.id
                WHERE d.date >= :start_date
                  AND d.date <= :end_date
                  AND d.deletedAt IS NULL
                  AND u.deletedAt IS NULL
                  AND u.tenant_id = :tenant_id
                  ${branchFilter}
                GROUP BY d.users_id
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = {
                    total_deliveries: parseInt(row.total_deliveries || 0),
                    total_qty: parseInt(row.total_qty || 0),
                    total_distance: parseFloat(row.total_distance || 0)
                };
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get attendance data for all employees on a specific date
     */
    static async getAttendanceData(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate,
                end_date: endDate
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    a.employee_id,
                    MIN(a.clock_in) as clock_in,
                    MAX(a.clock_out) as clock_out,
                    COUNT(DISTINCT a.date) as days_present,
                    COUNT(DISTINCT CASE WHEN LOWER(a.status) IN ('late', 'terlambat') THEN a.date END) as days_late,
                    COALESCE(SUM(GREATEST(COALESCE(a.work_duration, TIMEDIFF(a.clock_out, a.clock_in)), 0)), 0) as work_seconds,
                    SUBSTRING_INDEX(GROUP_CONCAT(a.status ORDER BY a.date DESC, a.id DESC SEPARATOR '|'), '|', 1) as latest_status
                FROM absents a
                JOIN users u ON a.employee_id = u.id
                WHERE a.date >= :start_date
                  AND a.date <= :end_date
                  AND a.deletedAt IS NULL
                  AND u.deletedAt IS NULL
                  AND u.tenant_id = :tenant_id
                  ${branchFilter}
                GROUP BY a.employee_id
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                const workSeconds = parseInt(row.work_seconds || 0, 10);
                acc[row.employee_id] = {
                    clock_in: row.clock_in,
                    clock_out: row.clock_out,
                    status: row.latest_status ? String(row.latest_status).toLowerCase() : '',
                    total_work_hours: EmployeeDailyReportRepository.formatWorkHours(workSeconds),
                    total_work_seconds: workSeconds,
                    days_present: parseInt(row.days_present || 0, 10),
                    days_late: parseInt(row.days_late || 0, 10)
                };
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get order input counts per employee for a specific date
     * Counts orders created by each employee
     */
    static async getOrderInputCounts(tenant_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                start_date: startDate,
                end_date: endDate
            };

            if (branch_id) {
                branchFilter = ' AND o.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    o.created_by as employee_id,
                    COUNT(o.id) as total
                FROM orders o
                JOIN users u ON o.created_by = u.id
                WHERE DATE(o.createdAt) >= :start_date
                  AND DATE(o.createdAt) <= :end_date
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY o.created_by
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results.reduce((acc, row) => {
                acc[row.employee_id] = parseInt(row.total || 0);
                return acc;
            }, {});
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of orders input by a specific employee within a date range
     * Returns: order id, customer name, total_qty (Total Item), total_treatments (Total Layanan), total price, payment status, created_at
     *
     * `total_qty` = jumlah BARANG, memakai aturan yang sama dengan seluruh aplikasi:
     * 1 sepatu = 1 item → COUNT(DISTINCT order_id, item_id). Tidak memakai orders.quantity
     * karena kolom itu sering tidak cocok dengan isi order_details.
     */
    static async getOrderInputDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                employee_id,
                start_date: startDate,
                end_date: endDate
            };

            if (branch_id) {
                branchFilter = ' AND o.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    o.id,
                    c.name as customer_name,
                    COUNT(DISTINCT od.order_id, od.item_id) as total_qty,
                    COUNT(od.id) as total_treatments,
                    COALESCE(p.final_price, p.total_price, 0) as total,
                    p.status as payment_status,
                    o.createdAt as created_at
                FROM orders o
                JOIN users u ON o.created_by = u.id
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN order_details od ON o.id = od.order_id AND od.deletedAt IS NULL
                LEFT JOIN payments p ON o.payment_id = p.id
                WHERE DATE(o.createdAt) >= :start_date
                  AND DATE(o.createdAt) <= :end_date
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND o.created_by = :employee_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY o.id, c.name, p.final_price, p.total_price, p.status, o.createdAt
                ORDER BY o.createdAt ASC
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of pickup items done by a specific employee on a specific date
     * Pickup = status log: not_yet → antrian
     * Returns: order detail info with customer, treatment, and pickup time
     */
    static async getPickupDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                employee_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND o.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    odsl.id as log_id,
                    o.id as order_id,
                    c.name as customer_name,
                    t.name as treatment_name,
                    od.id as order_detail_id,
                    odsl.created_at as pickup_time
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN customers c ON o.customer_id = c.id
                JOIN treatment t ON od.treatment_id = t.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'not_yet'
                  AND odsl.new_status = 'antrian'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND odsl.updated_by = :employee_id
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                ORDER BY odsl.created_at ASC
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of deliveries done by a specific employee on a specific date
     * Returns: delivery info with order id, customer, quantity, distance
     */
    static async getDeliveryDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                employee_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND u.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    od.order_id,
                    c.name as customer_name,
                    GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') as treatment_names,
                    COUNT(DISTINCT od.id) as qty,
                    MIN(odsl.created_at) as delivery_time
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN customers c ON o.customer_id = c.id
                LEFT JOIN treatment t ON od.treatment_id = t.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'siap_dikirim'
                  AND odsl.new_status = 'done'
                  AND odsl.updated_by = :employee_id
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                GROUP BY od.order_id, c.name
                ORDER BY MIN(odsl.created_at) ASC
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    /**
     * Get detail list of items started (Mulai Pengerjaan) by a specific employee
     * Status log: antrian → on_progress
     */
    static async getOnProgressDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                employee_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND o.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    o.id as order_id,
                    c.name as customer_name,
                    t.name as treatment_name,
                    od.id as order_detail_id,
                    odsl.created_at as start_time
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN customers c ON o.customer_id = c.id
                JOIN treatment t ON od.treatment_id = t.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'antrian'
                  AND odsl.new_status = 'on_progress'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND odsl.updated_by = :employee_id
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                ORDER BY odsl.created_at ASC
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of items completed (Selesai Dikerjakan) by a specific employee
     * Status log: on_progress → pengeringan
     */
    static async getSelesaiDikerjakanDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                employee_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND o.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    o.id as order_id,
                    c.name as customer_name,
                    t.name as treatment_name,
                    od.id as order_detail_id,
                    odsl.created_at as completion_time
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN customers c ON o.customer_id = c.id
                JOIN treatment t ON od.treatment_id = t.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'on_progress'
                  AND odsl.new_status = 'pengeringan'
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND odsl.updated_by = :employee_id
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                ORDER BY odsl.created_at ASC
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of QC items by a specific employee
     * Status log: pengeringan → siap_diambil OR siap_dikirim
     */
    static async getQCItemDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            let branchFilter = '';
            const replacements = {
                tenant_id,
                employee_id,
                start_date: startDate + ' 00:00:00',
                end_date: endDate + ' 23:59:59'
            };

            if (branch_id) {
                branchFilter = ' AND o.branch_id = :branch_id';
                replacements.branch_id = branch_id;
            }

            const query = `
                SELECT 
                    o.id as order_id,
                    c.name as customer_name,
                    t.name as treatment_name,
                    od.id as order_detail_id,
                    odsl.new_status as qc_status,
                    odsl.created_at as qc_time
                FROM order_detail_status_logs odsl
                JOIN order_details od ON odsl.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                JOIN customers c ON o.customer_id = c.id
                JOIN treatment t ON od.treatment_id = t.id
                JOIN users u ON odsl.updated_by = u.id
                WHERE odsl.old_status = 'pengeringan'
                  AND odsl.new_status IN ('siap', 'siap_diambil', 'siap_dikirim')
                  AND odsl.created_at >= :start_date
                  AND odsl.created_at <= :end_date
                  AND odsl.updated_by = :employee_id
                  AND od.deletedAt IS NULL
                  AND o.deletedAt IS NULL
                  AND o.tenant_id = :tenant_id
                  AND u.deletedAt IS NULL
                  ${branchFilter}
                ORDER BY odsl.created_at ASC
            `;

            const results = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = EmployeeDailyReportRepository;
