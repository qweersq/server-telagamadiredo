const express = require('express');
const router = express.Router();

const KitchenController = require('../controllers/kitchenController');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

// Tiket dapur untuk satu order (tombol print di detail pesanan)
router.get('/orders/:id/kitchen-tickets', AuthMiddleware.allow([1, 2, 3, 4]), KitchenController.getByOrder);

// Antrian tiket satu dapur (display dapur / reprint)
router.get('/kitchen/tickets', AuthMiddleware.allow([1, 2, 3, 4]), KitchenController.getByBranch);

// Ubah status item dari layar dapur
router.patch('/kitchen/tickets/:id/status', AuthMiddleware.allow([1, 2, 3, 4]), KitchenController.updateStatus);

module.exports = router;
