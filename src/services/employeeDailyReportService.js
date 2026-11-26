const EmployeeDailyReportRepository = require('../repositories/employeeDailyReportRepository');

class EmployeeDailyReportService {
    /**
     * Get performance report for all employees within a date range.
     * Untuk satu hari saja, panggil dengan startDate === endDate.
     *
     * @param {number} tenant_id - Tenant ID
     * @param {string} startDate - Tanggal awal (YYYY-MM-DD)
     * @param {string} endDate - Tanggal akhir (YYYY-MM-DD)
     * @param {number|null} branch_id - Optional branch filter
     * @returns {object} Report data
     */
    static async getDailyReport(tenant_id, startDate, endDate, branch_id = null) {
        try {
            // Get all employees
            const employees = await EmployeeDailyReportRepository.getAllEmployees(tenant_id, branch_id);

            // Info periode ikut dikirim supaya UI tidak perlu menebak.
            // `date` tetap ada ( = startDate ) demi kompatibilitas aplikasi mobile
            // yang masih mengirim & membaca satu tanggal saja.
            const period = {
                date: startDate,
                start_date: startDate,
                end_date: endDate,
                is_single_day: startDate === endDate,
                branch_id
            };

            if (!employees || employees.length === 0) {
                return {
                    ...period,
                    total_employees: 0,
                    employees: []
                };
            }

            // Fetch all activity counts in parallel for efficiency
            const [
                pickupCounts,
                onProgressCounts,
                selesaiCounts,
                qcItemCounts,
                deliveryCounts,
                deliveryTableData,
                attendanceData,
                orderInputCounts
            ] = await Promise.all([
                EmployeeDailyReportRepository.getPickupCounts(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getOnProgressCounts(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getSelesaiDikerjakanCounts(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getQCItemCounts(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getDeliveryCounts(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getDeliveryTableData(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getAttendanceData(tenant_id, startDate, endDate, branch_id),
                EmployeeDailyReportRepository.getOrderInputCounts(tenant_id, startDate, endDate, branch_id)
            ]);

            // Map data to each employee
            const reportData = employees.map(emp => {
                const empId = emp.id;
                const deliveryInfo = deliveryTableData[empId] || { total_deliveries: 0, total_qty: 0, total_distance: 0 };
                const attendance = attendanceData[empId] || null;

                return {
                    id: empId,
                    name: emp.name,
                    email: emp.email,
                    phone: emp.phone,
                    status: emp.status,
                    branch_id: emp.branch_id,
                    // Input pesanan
                    input: orderInputCounts[empId] || 0,
                    // Aktivitas dari status_logs
                    pickup: pickupCounts[empId] || 0,
                    dikerjakan: onProgressCounts[empId] || 0,
                    selesai: selesaiCounts[empId] || 0,
                    qc_item: qcItemCounts[empId] || 0,
                    delivery: deliveryCounts[empId] || 0,
                    // Data dari tabel deliveries (qty & jarak)
                    delivery_qty: deliveryInfo.total_qty,
                    delivery_distance: deliveryInfo.total_distance,
                    // Data absensi
                    // - Mode harian : clock_in / clock_out / status / total_work_hours
                    // - Mode periode: days_present (jumlah hari ada absensi) & days_late + total_work_hours
                    //   (total sepanjang periode) — clock_in/clock_out jadi jam paling awal & paling akhir
                    attendance: attendance ? {
                        clock_in: attendance.clock_in,
                        clock_out: attendance.clock_out,
                        status: attendance.status,
                        total_work_hours: attendance.total_work_hours,
                        total_work_seconds: attendance.total_work_seconds,
                        days_present: attendance.days_present,
                        days_late: attendance.days_late
                    } : null
                };
            });

            return {
                ...period,
                total_employees: employees.length,
                employees: reportData
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of orders input by a specific employee
     */
    static async getOrderInputDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            const orders = await EmployeeDailyReportRepository.getOrderInputDetail(
                tenant_id, employee_id, startDate, endDate, branch_id
            );
            return orders;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of pickup items by a specific employee
     */
    static async getPickupDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            const items = await EmployeeDailyReportRepository.getPickupDetail(
                tenant_id, employee_id, startDate, endDate, branch_id
            );
            return items;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of deliveries by a specific employee
     */
    static async getDeliveryDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            const deliveries = await EmployeeDailyReportRepository.getDeliveryDetail(
                tenant_id, employee_id, startDate, endDate, branch_id
            );
            return deliveries;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of items started (Mulai Pengerjaan) by a specific employee
     */
    static async getOnProgressDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            const items = await EmployeeDailyReportRepository.getOnProgressDetail(
                tenant_id, employee_id, startDate, endDate, branch_id
            );
            return items;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of items completed (Selesai Dikerjakan) by a specific employee
     */
    static async getSelesaiDikerjakanDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            const items = await EmployeeDailyReportRepository.getSelesaiDikerjakanDetail(
                tenant_id, employee_id, startDate, endDate, branch_id
            );
            return items;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get detail list of QC items by a specific employee
     */
    static async getQCItemDetail(tenant_id, employee_id, startDate, endDate, branch_id = null) {
        try {
            const items = await EmployeeDailyReportRepository.getQCItemDetail(
                tenant_id, employee_id, startDate, endDate, branch_id
            );
            return items;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get branches for a tenant
     */
    static async getBranches(tenant_id) {
        try {
            const { Branch } = require('../models');
            const branches = await Branch.findAll({
                where: { tenant_id, deletedAt: null },
                attributes: ['id', 'name'],
                raw: true
            });
            return branches;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = EmployeeDailyReportService;
