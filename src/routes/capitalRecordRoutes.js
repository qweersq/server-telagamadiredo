// const express = require('express');
// const router = express.Router();

// const { CapitalRecordController } = require('../controllers');
// const { AuthMiddleware } = require('../middlewares');

// router.use(AuthMiddleware.authenticateUser);

// router.post('/capital-records', AuthMiddleware.allow([1]), CapitalRecordController.create);
// router.get('/capital-records', AuthMiddleware.allow([1]), CapitalRecordController.getAll);
// router.get('/total-capitals', AuthMiddleware.allow([1]), CapitalRecordController.calculateTotalCapital);
// router.put('/capital-records/:id', AuthMiddleware.allow([1]), CapitalRecordController.update);
// router.delete('/capital-records/:id', AuthMiddleware.allow([1]), CapitalRecordController.delete);

// module.exports = router;