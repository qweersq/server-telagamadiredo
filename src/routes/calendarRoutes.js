const express = require('express');
const router = express.Router();
const CalendarController = require('../controllers/calendarController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Get calendar summary untuk sebulan
// GET /calendar/summary?month=1&year=2024&type=items
// GET /calendar/summary?month=1&year=2024&type=payments
router.get('/calendar/summary', AuthMiddleware.allow([1,2,3,4], true), CalendarController.getSummary);

// Get detail orders untuk tanggal tertentu
// GET /calendar/date-details?date=2024-01-15&type=items
// GET /calendar/date-details?date=2024-01-15&type=payments
router.get('/calendar/date-details', AuthMiddleware.allow([1,2,3,4], true), CalendarController.getDateDetails);

router.get('/calendar/note',    AuthMiddleware.allow([1,2,3,4], true), CalendarController.getNote);
router.put('/calendar/note',    AuthMiddleware.allow([1,2,3,4], true), CalendarController.upsertNote);
router.delete('/calendar/note', AuthMiddleware.allow([1,2,3,4], true), CalendarController.deleteNote);

module.exports = router;

