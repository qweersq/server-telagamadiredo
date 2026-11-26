const express = require('express');
const router = express.Router();

const { EmployeePerformanceController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Get all employees with pagination and filters
router.get('/employees', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getAllEmployees);

// Get employee detail
router.get('/employees/:id', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getEmployeeDetail);

// Get employee performance summary
router.get('/employees/:id/summary', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getEmployeeSummary);

// Get employee attendance data
router.get('/employees/:id/attendance', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getEmployeeAttendance);

// Get employee delivery data
router.get('/employees/:id/deliveries', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getEmployeeDeliveries);

// Get employee processed items
router.get('/employees/:id/processed-items', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getEmployeeProcessedItems);

// Get employee performance chart data
router.get('/employees/:id/performance-chart', AuthMiddleware.allow([1, 2, 3, 4]), EmployeePerformanceController.getEmployeePerformanceChart);

module.exports = router;
