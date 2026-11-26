const CalendarViewService = require('../services/calendarViewService');
const { ResponseHelper } = require('../helpers');

class CalendarViewController {
    static async getCalendarView(req, res) {
        try {
            const raw = {
                month: req.query.month,
                year: req.query.year
            }

            const data = await CalendarViewService.getCalendarView(raw);

            return res.status(200).json(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).json(ResponseHelper.errorResponse(error.message));
        }
    };
}

module.exports = CalendarViewController;