const express = require('express');
const router = express.Router();
const EmployeeDailyReportController = require('../controllers/employeeDailyReportController');
const { AuthMiddleware } = require('../middlewares');

// Get daily employee report (superadmin/owner, admin, supervisor)
router.get(
    '/employee-daily-report',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getDailyReport
);

// Get branches for filter dropdown
router.get(
    '/employee-daily-report/branches',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getBranches
);

// Get order input detail for a specific employee
router.get(
    '/employee-daily-report/input-detail',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getOrderInputDetail
);

// Get pickup detail for a specific employee
router.get(
    '/employee-daily-report/pickup-detail',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getPickupDetail
);

// Get delivery detail for a specific employee
router.get(
    '/employee-daily-report/delivery-detail',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getDeliveryDetail
);

// Get on_progress detail (Mulai Pengerjaan) for a specific employee
router.get(
    '/employee-daily-report/mulai-pengerjaan-detail',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getOnProgressDetail
);

// Get selesai dikerjakan detail (Selesai Pengerjaan) for a specific employee
router.get(
    '/employee-daily-report/selesai-pengerjaan-detail',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getSelesaiDikerjakanDetail
);

// Get QC item detail for a specific employee
router.get(
    '/employee-daily-report/qc-item-detail',
    AuthMiddleware.allow([1, 2, 4]),
    EmployeeDailyReportController.getQCItemDetail
);

module.exports = router;
