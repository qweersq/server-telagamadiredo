const { BugReport, User, Tenant } = require('../models');
const ResponseHelper = require('../helpers/responseHelper');

class BugReportController {
  // Create bug report
  static async createBugReport(req, res) {
    try {
      const { title, description } = req.body;
      const tenant_id = req.user.tenant_id;
      const user_id = req.user.id;

      // Validation
      if (!title || !description) {
        return res.status(400).send(ResponseHelper.errorResponse('Title dan description harus diisi'));
      }

      if (title.length < 5) {
        return res.status(400).send(ResponseHelper.errorResponse('Title minimal 5 karakter'));
      }

      if (description.length < 10) {
        return res.status(400).send(ResponseHelper.errorResponse('Description minimal 10 karakter'));
      }

      // Create bug report
      const bugReport = await BugReport.create({
        tenant_id,
        user_id,
        title,
        description,
        status: 'pending',
        priority: 'medium'
      });

      console.log('✅ Bug report created:', bugReport.id);

      return res.status(201).send(ResponseHelper.successResponse({
        id: bugReport.id,
        title: bugReport.title,
        description: bugReport.description,
        status: bugReport.status,
        priority: bugReport.priority,
        created_at: bugReport.created_at,
        message: 'Bug report berhasil dikirim'
      }));

    } catch (error) {
      console.error('❌ Error creating bug report:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Gagal mengirim bug report'));
    }
  }

  // Get bug report list (superadmin only)
  static async getBugReportList(req, res) {
    try {
      const { page = 1, limit = 10, status, priority, search } = req.query;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }
      if (priority) {
        whereClause.priority = priority;
      }

      // Build search clause
      const searchClause = [];
      if (search) {
        searchClause.push({
          title: {
            [require('sequelize').Op.like]: `%${search}%`
          }
        });
        searchClause.push({
          description: {
            [require('sequelize').Op.like]: `%${search}%`
          }
        });
      }

      if (searchClause.length > 0) {
        whereClause[require('sequelize').Op.or] = searchClause;
      }

      // Get bug reports with pagination
      const { count, rows: bugReports } = await BugReport.findAndCountAll({
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
        bug_reports: bugReports,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: count,
          items_per_page: parseInt(limit)
        }
      }));

    } catch (error) {
      console.error('❌ Error getting bug report list:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil daftar bug report'));
    }
  }

  // Update bug report status (superadmin only)
  static async updateBugReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, priority } = req.body;

      if (status && !['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).send(ResponseHelper.errorResponse('Status tidak valid'));
      }

      if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
        return res.status(400).send(ResponseHelper.errorResponse('Priority tidak valid'));
      }

      const bugReport = await BugReport.findByPk(id);
      if (!bugReport) {
        return res.status(404).send(ResponseHelper.errorResponse('Bug report tidak ditemukan'));
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;

      await bugReport.update(updateData);

      console.log('✅ Bug report updated:', id, updateData);

      return res.status(200).send(ResponseHelper.successResponse({
        id: bugReport.id,
        status: bugReport.status,
        priority: bugReport.priority,
        message: 'Bug report berhasil diupdate'
      }));

    } catch (error) {
      console.error('❌ Error updating bug report:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Gagal mengupdate bug report'));
    }
  }
}

module.exports = BugReportController;
