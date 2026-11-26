const express = require('express');
const router = express.Router();
const AppVersionController = require('../controllers/appVersionController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Public route - no auth required
router.get('/check', AppVersionController.checkVersion);

// All routes below require authentication
router.use(AuthMiddleware.authenticateUser);

// Get all versions (superapp-superadmin only for management)
router.get('/', AuthMiddleware.allow([4]), AppVersionController.getAll);

// Get version by ID (superapp-superadmin only)
router.get('/:id', AuthMiddleware.allow([4]), AppVersionController.getById);

// Create version (superapp-superadmin only)
router.post('/', AuthMiddleware.allow([4]), AppVersionController.create);

// Update version (superapp-superadmin only)
router.put('/:id', AuthMiddleware.allow([4]), AppVersionController.update);

// Delete version (superapp-superadmin only)
router.delete('/:id', AuthMiddleware.allow([4]), AppVersionController.delete);

module.exports = router;

