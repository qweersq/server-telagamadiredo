const express = require('express');
const router = express.Router();

const { TaskTemplateController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Karyawan (3) hanya perlu membaca template untuk daftar tugasnya
router.get('/task-templates', AuthMiddleware.allow([1, 2, 3, 4]), TaskTemplateController.getAll);
router.get('/task-templates/positions', AuthMiddleware.allow([1, 2, 4]), TaskTemplateController.getPositions);
router.get('/task-templates/:id', AuthMiddleware.allow([1, 2, 4]), TaskTemplateController.getById);

router.post('/task-templates', AuthMiddleware.allow([1, 2, 4]), TaskTemplateController.create);
router.put('/task-templates/:id', AuthMiddleware.allow([1, 2, 4]), TaskTemplateController.update);
router.patch('/task-templates/:id/toggle-status', AuthMiddleware.allow([1, 2, 4]), TaskTemplateController.toggleStatus);
router.delete('/task-templates/:id', AuthMiddleware.allow([1, 4]), TaskTemplateController.delete);

module.exports = router;
