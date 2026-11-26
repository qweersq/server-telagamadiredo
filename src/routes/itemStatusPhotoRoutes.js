const express = require('express');
const router = express.Router();
const ItemStatusPhotoController = require('../controllers/itemStatusPhotoController');
const { AuthMiddleware } = require('../middlewares');

// Auth middleware jika ingin proteksi, bisa diaktifkan jika perlu
router.use(AuthMiddleware.authenticateUser);

router.get('/', ItemStatusPhotoController.getAll);
router.get('/:id', ItemStatusPhotoController.getById);
router.post('/', ItemStatusPhotoController.create);
router.put('/:id', ItemStatusPhotoController.update);
router.delete('/:id', ItemStatusPhotoController.delete);

module.exports = router; 