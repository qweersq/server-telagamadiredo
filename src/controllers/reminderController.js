const reminderService = require('../services/reminderService');

exports.getReminders = async (req, res) => {
  try {
    const { category, search } = req.query;
    const reminders = await reminderService.getReminders({ category, search });
    res.json({ success: true, data: reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 