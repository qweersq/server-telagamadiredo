const CalendarService = require('../services/calendarService');
const ResponseHelper = require('../helpers/responseHelper');
const CalendarNote = require('../models/CalendarNote');

class CalendarController {
  /**
   * Get calendar summary untuk sebulan
   * GET /calendar/summary
   * Query params: month, year, type (items|payments)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getSummary(req, res) {
    try {
      const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();
      const type = req.query.type || 'items'; // 'items' atau 'payments'

      // Add user context for data isolation
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : req.user.branch_id;
      const user_role = req.user.role;

      const data = await CalendarService.getSummary({
        month,
        year,
        type,
        user_tenant_id,
        user_branch_id,
        user_role
      });

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error('❌ CalendarController - Error getting summary:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get detail orders untuk tanggal tertentu
   * GET /calendar/date-details
   * Query params: date (YYYY-MM-DD), type (items|payments)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getDateDetails(req, res) {
    try {
      const date = req.query.date; // Format: YYYY-MM-DD
      const type = req.query.type || 'items'; // 'items' atau 'payments'

      if (!date) {
        return res.status(400).send(ResponseHelper.errorResponse('Date parameter is required'));
      }

      // Add user context for data isolation
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : req.user.branch_id;
      const user_role = req.user.role;

      // Opt-in: sertakan item lain milik order yang sama (due date berbeda).
      // Default false supaya perilaku endpoint tidak berubah untuk caller lain.
      const includeOtherItems = ['1', 'true'].includes(
        String(req.query.include_other_items || '').toLowerCase()
      );

      const data = await CalendarService.getDateDetails({
        date,
        type,
        user_tenant_id,
        user_branch_id,
        user_role,
        includeOtherItems
      });

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      console.error('❌ CalendarController - Error getting date details:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
  /**
   * GET /calendar/note?date=YYYY-MM-DD&branch_id=X
   */
  static async getNote(req, res) {
    try {
      const { date, branch_id } = req.query;
      if (!date) return res.status(400).send(ResponseHelper.errorResponse('Date required'));

      const tenant_id = req.user.tenant_id;
      const branchId = branch_id ? parseInt(branch_id, 10) : req.user.branch_id;

      const note = await CalendarNote.findOne({
        where: { tenant_id, branch_id: branchId, date },
      });

      return res.status(200).send(ResponseHelper.successResponse(note || null));
    } catch (error) {
      console.error('❌ CalendarController.getNote:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * PUT /calendar/note — upsert note per tanggal per cabang
   */
  static async upsertNote(req, res) {
    try {
      const { date, note, branch_id } = req.body;
      if (!date || !note?.trim()) {
        return res.status(400).send(ResponseHelper.errorResponse('Date dan note wajib diisi'));
      }

      const tenant_id = req.user.tenant_id;
      const branchId = branch_id ? parseInt(branch_id, 10) : req.user.branch_id;

      const [record, created] = await CalendarNote.findOrCreate({
        where: { tenant_id, branch_id: branchId, date },
        defaults: { note: note.trim(), created_by: req.user.id },
      });

      if (!created) {
        await record.update({ note: note.trim() });
      }

      return res.status(200).send(ResponseHelper.successResponse(record));
    } catch (error) {
      console.error('❌ CalendarController.upsertNote:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * DELETE /calendar/note?date=YYYY-MM-DD&branch_id=X
   */
  static async deleteNote(req, res) {
    try {
      const { date, branch_id } = req.query;
      if (!date) return res.status(400).send(ResponseHelper.errorResponse('Date required'));

      const tenant_id = req.user.tenant_id;
      const branchId = branch_id ? parseInt(branch_id, 10) : req.user.branch_id;

      await CalendarNote.destroy({ where: { tenant_id, branch_id: branchId, date } });

      return res.status(200).send(ResponseHelper.successResponse({ message: 'Note dihapus' }));
    } catch (error) {
      console.error('❌ CalendarController.deleteNote:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = CalendarController;

