const { Feedback, User, Tenant } = require('../models');
const ResponseHelper = require('../helpers/responseHelper');

class FeedbackController {
  // Create feedback
  static async createFeedback(req, res) {
    try {
      const { subject, message } = req.body;
      const tenant_id = req.user.tenant_id;
      const user_id = req.user.id;

      // Validation
      if (!subject || !message) {
        return res.status(400).send(ResponseHelper.errorResponse('Subject dan message harus diisi'));
      }

      if (subject.length < 5) {
        return res.status(400).send(ResponseHelper.errorResponse('Subject minimal 5 karakter'));
      }

      if (message.length < 10) {
        return res.status(400).send(ResponseHelper.errorResponse('Message minimal 10 karakter'));
      }

      // Create feedback
      const feedback = await Feedback.create({
        tenant_id,
        user_id,
        subject,
        message,
        status: 'pending'
      });

      console.log('✅ Feedback created:', feedback.id);

      return res.status(201).send(ResponseHelper.successResponse({
        id: feedback.id,
        subject: feedback.subject,
        message: feedback.message,
        status: feedback.status,
        created_at: feedback.created_at,
        message: 'Feedback berhasil dikirim'
      }));

    } catch (error) {
      console.error('❌ Error creating feedback:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Gagal mengirim feedback'));
    }
  }

  // Get feedback list (superadmin only)
  static async getFeedbackList(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      // Build search clause
      const searchClause = [];
      if (search) {
        searchClause.push({
          subject: {
            [require('sequelize').Op.like]: `%${search}%`
          }
        });
        searchClause.push({
          message: {
            [require('sequelize').Op.like]: `%${search}%`
          }
        });
      }

      if (searchClause.length > 0) {
        whereClause[require('sequelize').Op.or] = searchClause;
      }

      // Get feedback with pagination
      const { count, rows: feedbacks } = await Feedback.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'business_name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      return res.status(200).send(ResponseHelper.successResponse({
        feedbacks,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: count,
          items_per_page: parseInt(limit)
        }
      }));

    } catch (error) {
      console.error('❌ Error getting feedback list:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil daftar feedback'));
    }
  }

  // Update feedback status (superadmin only)
  static async updateFeedbackStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).send(ResponseHelper.errorResponse('Status tidak valid'));
      }

      const feedback = await Feedback.findByPk(id);
      if (!feedback) {
        return res.status(404).send(ResponseHelper.errorResponse('Feedback tidak ditemukan'));
      }

      await feedback.update({ status });

      console.log('✅ Feedback status updated:', id, 'to', status);

      return res.status(200).send(ResponseHelper.successResponse({
        id: feedback.id,
        status: feedback.status,
        message: 'Status feedback berhasil diupdate'
      }));

    } catch (error) {
      console.error('❌ Error updating feedback status:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Gagal mengupdate status feedback'));
    }
  }
}

module.exports = FeedbackController;
