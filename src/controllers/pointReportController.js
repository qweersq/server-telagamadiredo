const PointReportService = require('../services/pointReportService');

class PointReportController {
  /**
   * Get point report
   * GET /points/report
   */
  static async getPointReport(req, res) {
    try {
      const { branch_id, start_date, end_date } = req.query;
      const tenant_id = req.user.tenant_id;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      const filters = {
        tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      const reportData = await PointReportService.getPointReport(filters);

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: reportData
      });
    } catch (error) {
      console.error('❌ PointReportController.getPointReport - Error:', error);
      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get point report: ${error.message}`
        }
      });
    }
  }
}

module.exports = PointReportController;

