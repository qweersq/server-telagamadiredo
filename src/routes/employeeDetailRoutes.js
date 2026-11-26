const express = require('express');
const router = express.Router();
const EmployeeDetailController = require('../controllers/employeeDetailController');
const { AuthMiddleware } = require('../middlewares');

// Test route
router.get('/test', AuthMiddleware.allow([1, 2, 3, 4]), (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'Test route working' });
});

// Get employee detail summary (all metrics in one call)
router.get('/employee-detail/:id/summary', AuthMiddleware.allow([1, 4]), EmployeeDetailController.getEmployeeSummary);

// Get employee performance chart (monthly data)
router.get('/employee-detail/:id/performance-chart', AuthMiddleware.allow([1, 4]), EmployeeDetailController.getPerformanceChart);

module.exports = router;
