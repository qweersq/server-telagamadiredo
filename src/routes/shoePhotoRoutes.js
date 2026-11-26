const express = require('express');
const router = express.Router();

const { ShoePhotoController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/shoe-photos', AuthMiddleware.allow([1,2,3,4]), ShoePhotoController.create);
router.get('/shoe-photos', AuthMiddleware.allow([1,2,3,4]), ShoePhotoController.getAll);
router.get('/shoe-photos/:id', AuthMiddleware.allow([1,2,3,4]), ShoePhotoController.getById);
router.put('/shoe-photos/:id', AuthMiddleware.allow([1,2,3,4]), ShoePhotoController.update);
router.delete('/shoe-photos/:id', AuthMiddleware.allow([1,2,3,4]), ShoePhotoController.delete);

module.exports = router;