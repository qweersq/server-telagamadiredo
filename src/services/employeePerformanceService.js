const EmployeePerformanceRepository = require('../repositories/employeePerformanceRepository');
const moment = require('moment');

class EmployeePerformanceService {
    static async getAllEmployees(raw) {
        try {
            const result = await EmployeePerformanceRepository.getAllEmployees(raw);
            if (!result || result.length === 0) throw new Error('No employees found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeSummary(employee_id, raw) {
        try {
            if (isNaN(employee_id) || employee_id <= 0) throw new Error('Invalid Employee ID');

            // Validate dates
            if (raw.start_date && !moment(raw.start_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid start_date format. Use YYYY-MM-DD');
            }
            if (raw.end_date && !moment(raw.end_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid end_date format. Use YYYY-MM-DD');
            }

            // Set default dates if not provided
            if (!raw.start_date) {
                raw.start_date = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!raw.end_date) {
                raw.end_date = moment().endOf('month').format('YYYY-MM-DD');
            }

            const summary = await EmployeePerformanceRepository.getEmployeeSummary(employee_id, raw);

            return summary;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeAttendance(employee_id, raw) {
        try {
            if (isNaN(employee_id) || employee_id <= 0) throw new Error('Invalid Employee ID');

            // Validate dates
            if (raw.start_date && !moment(raw.start_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid start_date format. Use YYYY-MM-DD');
            }
            if (raw.end_date && !moment(raw.end_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid end_date format. Use YYYY-MM-DD');
            }

            // Set default dates if not provided
            if (!raw.start_date) {
                raw.start_date = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!raw.end_date) {
                raw.end_date = moment().endOf('month').format('YYYY-MM-DD');
            }

            const attendance = await EmployeePerformanceRepository.getEmployeeAttendance(employee_id, raw);

            return attendance;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeDeliveries(employee_id, raw) {
        try {
            if (isNaN(employee_id) || employee_id <= 0) throw new Error('Invalid Employee ID');

            // Validate pagination
            if (raw.page && (isNaN(raw.page) || raw.page <= 0)) {
                throw new Error('Invalid page number');
            }
            if (raw.pageSize && (isNaN(raw.pageSize) || raw.pageSize <= 0)) {
                throw new Error('Invalid page size');
            }

            // Validate dates
            if (raw.start_date && !moment(raw.start_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid start_date format. Use YYYY-MM-DD');
            }
            if (raw.end_date && !moment(raw.end_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid end_date format. Use YYYY-MM-DD');
            }

            // Set default dates if not provided
            if (!raw.start_date) {
                raw.start_date = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!raw.end_date) {
                raw.end_date = moment().endOf('month').format('YYYY-MM-DD');
            }

            const deliveries = await EmployeePerformanceRepository.getEmployeeDeliveries(employee_id, raw);

            return deliveries;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeProcessedItems(employee_id, raw) {
        try {
            if (isNaN(employee_id) || employee_id <= 0) throw new Error('Invalid Employee ID');

            // Validate pagination
            if (raw.page && (isNaN(raw.page) || raw.page <= 0)) {
                throw new Error('Invalid page number');
            }
            if (raw.pageSize && (isNaN(raw.pageSize) || raw.pageSize <= 0)) {
                throw new Error('Invalid page size');
            }

            // Validate dates
            if (raw.start_date && !moment(raw.start_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid start_date format. Use YYYY-MM-DD');
            }
            if (raw.end_date && !moment(raw.end_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid end_date format. Use YYYY-MM-DD');
            }

            // Set default dates if not provided
            if (!raw.start_date) {
                raw.start_date = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!raw.end_date) {
                raw.end_date = moment().endOf('month').format('YYYY-MM-DD');
            }

            const processedItems = await EmployeePerformanceRepository.getEmployeeProcessedItems(employee_id, raw);

            return processedItems;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeePerformanceChart(employee_id, raw) {
        try {
            if (isNaN(employee_id) || employee_id <= 0) throw new Error('Invalid Employee ID');

            // Validate chart type
            const validChartTypes = ['work_hours', 'processed_items', 'delivery_cost'];
            if (!validChartTypes.includes(raw.chart_type)) {
                throw new Error('Invalid chart_type. Must be one of: work_hours, processed_items, delivery_cost');
            }

            // Validate dates
            if (raw.start_date && !moment(raw.start_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid start_date format. Use YYYY-MM-DD');
            }
            if (raw.end_date && !moment(raw.end_date, 'YYYY-MM-DD', true).isValid()) {
                throw new Error('Invalid end_date format. Use YYYY-MM-DD');
            }

            // Set default dates if not provided
            if (!raw.start_date) {
                raw.start_date = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!raw.end_date) {
                raw.end_date = moment().endOf('month').format('YYYY-MM-DD');
            }

            const chartData = await EmployeePerformanceRepository.getEmployeePerformanceChart(employee_id, raw);

            return chartData;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployeeDetail(employee_id, raw = {}) {
        try {
            if (isNaN(employee_id) || employee_id <= 0) throw new Error('Invalid Employee ID');

            const employeeDetail = await EmployeePerformanceRepository.getEmployeeDetail(employee_id, raw);

            return employeeDetail;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = EmployeePerformanceService;
