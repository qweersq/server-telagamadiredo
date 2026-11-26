const EmployeeDetailService = require('../services/employeeDetailService');
const ResponseHelper = require('../helpers/responseHelper');

class EmployeeDetailController {
    /**
     * Get comprehensive employee summary data
     * GET /employees/:id/summary
     */
    static async getEmployeeSummary(req, res) {
        try {
            console.log('getEmployeeSummary called');
            const employee_id = parseInt(req.params.id, 10);
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;
            
            // Validate employee_id
            if (isNaN(employee_id) || employee_id <= 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Invalid employee ID'));
            }
            
            // Validate dates
            if (!start_date || !end_date) {
                return res.status(400).send(ResponseHelper.errorResponse('start_date and end_date are required'));
            }
            
            // Get user context for data isolation (only tenant_id, no branch_id)
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;
            
            console.log('Calling EmployeeDetailService.getEmployeeSummary with:', {
                employee_id, start_date, end_date, user_tenant_id, user_role
            });
            
            const summaryData = await EmployeeDetailService.getEmployeeSummary(
                employee_id, 
                start_date, 
                end_date, 
                user_tenant_id, 
                user_role
            );

            console.log('EmployeeDetailService.getEmployeeSummary returned:', summaryData);

            return res.status(200).send(ResponseHelper.successResponse(summaryData));
        } catch (error) {
            console.error('Error in getEmployeeSummary:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get employee performance chart data (monthly)
     * GET /employee-detail/:id/performance-chart
     */
    static async getPerformanceChart(req, res) {
        try {
            const employee_id = parseInt(req.params.id, 10);
            const period = req.query.period || '6_months';
            const custom_start_date = req.query.start_date;
            const custom_end_date = req.query.end_date;
            
            // Validate employee_id
            if (isNaN(employee_id) || employee_id <= 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Invalid employee ID'));
            }
            
            // Get user context (only tenant_id, no branch_id)
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;
            
            const chartData = await EmployeeDetailService.getPerformanceChart(
                employee_id,
                period,
                custom_start_date,
                custom_end_date,
                user_tenant_id,
                user_role
            );

            return res.status(200).send(ResponseHelper.successResponse(chartData));
        } catch (error) {
            console.error('Error in getPerformanceChart:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = EmployeeDetailController;
