const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// GET /reminders
router.get('/reminders', reminderController.getReminders);

module.exports = router; 