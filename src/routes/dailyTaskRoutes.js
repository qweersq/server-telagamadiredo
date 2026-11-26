const express = require('express');
const router = express.Router();

const { DailyTaskController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Karyawan (3) hanya boleh melihat tugasnya sendiri, lewat /daily-tasks/me
router.get('/daily-tasks/me', AuthMiddleware.allow([1, 2, 3, 4]), DailyTaskController.getMine);
router.patch('/daily-tasks/:id/complete', AuthMiddleware.allow([1, 2, 3, 4]), DailyTaskController.complete);
router.patch('/daily-tasks/:id/reopen', AuthMiddleware.allow([1, 2, 3, 4]), DailyTaskController.reopen);

router.post('/daily-tasks/:id/verify', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.verify);
router.patch('/daily-tasks/:id/override', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.override);

router.get('/daily-tasks', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.getAll);
router.post('/daily-tasks/generate', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.generate);
router.post('/daily-tasks/copy', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.copy);
router.post('/daily-tasks/close-day', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.closeDay);
router.post('/daily-tasks', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.create);
router.delete('/daily-tasks/:id', AuthMiddleware.allow([1, 2, 4]), DailyTaskController.delete);

module.exports = router;
