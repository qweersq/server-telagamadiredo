const express = require('express');
const router = express.Router();

const { TreatmentController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/treatments', AuthMiddleware.allow([1,2,4], true), TreatmentController.create);
router.get('/treatments', AuthMiddleware.allow([1,2,4], true), TreatmentController.getAll);
router.get('/treatments/options', AuthMiddleware.allow([1,2,4], true), TreatmentController.getOptions);
router.get('/treatments/:id', AuthMiddleware.allow([1,2,4], true), TreatmentController.getById);
router.put('/treatments/:id', AuthMiddleware.allow([1,2,4], true), TreatmentController.update);
router.delete('/treatments/:id', AuthMiddleware.allow([1,4], true), TreatmentController.delete);
router.patch('/treatments/:id/toggle-status', AuthMiddleware.allow([1,2,4], true), TreatmentController.toggleStatus);

module.exports = router;