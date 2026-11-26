// const express = require('express');
// const router = express.Router();

// const { CollaborationController } = require('../controllers');
// const { AuthMiddleware } = require('../middlewares');

// router.use(AuthMiddleware.authenticateUser);

// router.post('/collaborations', AuthMiddleware.allow([1]), CollaborationController.create);
// router.get('/collaborations', AuthMiddleware.allow([1]), CollaborationController.getAll);
// router.get('/collaborations/:id', AuthMiddleware.allow([1]), CollaborationController.getById);
// router.put('/collaborations/:id', AuthMiddleware.allow([1]), CollaborationController.update);
// router.delete('/collaborations/:id', AuthMiddleware.allow([1]), CollaborationController.delete);

// module.exports = router;