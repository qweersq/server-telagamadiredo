const express = require('express');
const router = express.Router();

const { AdminNoteController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.post('/admin-notes', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.create);
router.get('/admin-notes', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.getAll);
router.get('/admin-notes/pending-count', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.getPendingCount);
router.get('/admin-notes/:id', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.getById);
router.put('/admin-notes/:id', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.update);
router.put('/admin-notes/:id/mark-done', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.markAsDone);
router.delete('/admin-notes/:id', AuthMiddleware.allow([1, 2, 4]), AdminNoteController.delete);

module.exports = router;

