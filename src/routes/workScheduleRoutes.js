const express = require('express');
const router = express.Router();

const WorkScheduleController = require('../controllers/workScheduleController');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Jadwal kerja karyawan (pola mingguan, assign sekali per karyawan)
router.get('/work-schedules', AuthMiddleware.allow([1, 2, 4, 5]), WorkScheduleController.list);
router.get('/work-schedules/resolve', AuthMiddleware.allow([1, 2, 3, 4, 5]), WorkScheduleController.resolve);
router.get('/work-schedules/employee/:employee_id', AuthMiddleware.allow([1, 2, 3, 4, 5]), WorkScheduleController.getByEmployee);
router.put('/work-schedules/employee/:employee_id', AuthMiddleware.allow([1, 2, 4]), WorkScheduleController.upsert);

// Hari libur
router.get('/holidays', AuthMiddleware.allow([1, 2, 3, 4, 5]), WorkScheduleController.listHolidays);
router.post('/holidays', AuthMiddleware.allow([1, 2, 4]), WorkScheduleController.createHoliday);
router.delete('/holidays/:id', AuthMiddleware.allow([1, 2, 4]), WorkScheduleController.deleteHoliday);

module.exports = router;
