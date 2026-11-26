const express = require('express');
const router = express.Router();

const { ShiftController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/shifts', AuthMiddleware.allow([1,2,4]), ShiftController.create);
router.get('/shifts', AuthMiddleware.allow([1,2,4]), ShiftController.getAll);
router.get('/shifts/active', AuthMiddleware.allow([1,2,4]), ShiftController.getActive); // ✅ New lightweight endpoint
router.get('/shifts/:id', AuthMiddleware.allow([1,2,4]), ShiftController.getById);
router.get('/shifts/:id/detail', AuthMiddleware.allow([1,2,4]), ShiftController.getShiftDetail);
router.put('/shifts/:id', AuthMiddleware.allow([1,2,4]), ShiftController.update);
router.put('/end-shifts/:id', AuthMiddleware.allow([1,2,4]), ShiftController.endShiftById);
router.delete('/shifts/:id', AuthMiddleware.allow([1,4]), ShiftController.delete);
router.get('/shifts/branches/active', AuthMiddleware.allow([1,2,4]), ShiftController.getActiveBranches);

module.exports = router;