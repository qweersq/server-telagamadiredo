const express = require('express');
const router = express.Router();

const { CalendarViewController }  = require('../controllers');
const { AuthMiddleware } = require('../middlewares');

router.use(AuthMiddleware.authenticateUser);

router.get('/calendar-view', AuthMiddleware.allow([1,2,3,4]), CalendarViewController.getCalendarView);

module.exports = router;