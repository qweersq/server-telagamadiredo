const express = require('express');
const router = express.Router();

const { DeliveryController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/deliveries', AuthMiddleware.allow([1,2,4]), DeliveryController.create);
router.post('/deliveries-odo', AuthMiddleware.allow([1,2,3,4]), DeliveryController.createOdoData);
router.get('/deliveries', AuthMiddleware.allow([1,2,3,4]), DeliveryController.getAll);
router.get('/deliveries/:id', AuthMiddleware.allow([1,2,3,4]), DeliveryController.getById);
router.put('/deliveries/:id', AuthMiddleware.allow([1,2,3,4]), DeliveryController.update);
router.delete('/deliveries/:id', AuthMiddleware.allow([1,4]), DeliveryController.delete);

module.exports = router;