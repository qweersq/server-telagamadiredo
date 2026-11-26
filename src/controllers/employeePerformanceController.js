const EmployeePerformanceService = require('../services/employeePerformanceService');
const { ResponseHelper } = require('../helpers');

class EmployeePerformanceController {
    static async getAllEmployees(req, res) {
        try {
            const raw = {
                page: parseInt(req.query.page, 10) || 1,
                pageSize: parseInt(req.query.pageSize, 10) || 10,
                branch_id: req.query.branch_id ? parseInt(req.query.branch_id, 10) : null,
                tenant_id: req.user.tenant_id, // Always use JWT token for data isolation (security)
                status: req.query.status,
                role: req.query.role,
                search: req.query.search
            };

            const employees = await EmployeePerformanceService.getAllEmployees(raw);

            return res.status(200).send(ResponseHelper.successResponse(employees));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getEmployeeSummary(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const raw = {
                start_date: req.query.start_date,
                end_date: req.query.end_date,
                period_type: req.query.period_type || 'monthly' // daily, weekly, monthly
            };

            const summary = await EmployeePerformanceService.getEmployeeSummary(employee_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(summary));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getEmployeeAttendance(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const raw = {
                start_date: req.query.start_date,
                end_date: req.query.end_date
            };

            const attendance = await EmployeePerformanceService.getEmployeeAttendance(employee_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(attendance));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getEmployeeDeliveries(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const raw = {
                page: parseInt(req.query.page, 10) || 1,
                pageSize: parseInt(req.query.pageSize, 10) || 10,
                start_date: req.query.start_date,
                end_date: req.query.end_date
            };

            const deliveries = await EmployeePerformanceService.getEmployeeDeliveries(employee_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(deliveries));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getEmployeeProcessedItems(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const raw = {
                page: parseInt(req.query.page, 10) || 1,
                pageSize: parseInt(req.query.pageSize, 10) || 10,
                start_date: req.query.start_date,
                end_date: req.query.end_date,
                status: req.query.status
            };

            const processedItems = await EmployeePerformanceService.getEmployeeProcessedItems(employee_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(processedItems));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getEmployeePerformanceChart(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const raw = {
                start_date: req.query.start_date,
                end_date: req.query.end_date,
                chart_type: req.query.chart_type || 'work_hours' // work_hours, processed_items, delivery_cost
            };

            const chartData = await EmployeePerformanceService.getEmployeePerformanceChart(employee_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(chartData));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getEmployeeDetail(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const raw = {
                tenant_id: req.user.tenant_id // Always use JWT token for data isolation (security)
            };

            const employeeDetail = await EmployeePerformanceService.getEmployeeDetail(employee_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(employeeDetail));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = EmployeePerformanceController;
