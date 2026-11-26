const express = require('express');
const router = express.Router();

const { StockController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Baca: kasir & supervisor boleh lihat stok outlet-nya
router.get('/stocks', AuthMiddleware.allow([1, 2, 3, 4]), StockController.getAll);
router.get('/stocks/movements', AuthMiddleware.allow([1, 2, 3, 4]), StockController.getMovements);

// Mutasi stok: hanya admin/owner (dan supervisor yang dinormalisasi)
router.post('/stocks', AuthMiddleware.allow([1, 2, 4]), StockController.startTracking);
router.post('/stocks/restock', AuthMiddleware.allow([1, 2, 4]), StockController.restock);
router.post('/stocks/adjust', AuthMiddleware.allow([1, 2, 4]), StockController.adjust);
router.post('/stocks/transfer', AuthMiddleware.allow([1, 2, 4]), StockController.transfer);
router.patch('/stocks/:treatment_id', AuthMiddleware.allow([1, 2, 4]), StockController.updateSettings);

module.exports = router;
