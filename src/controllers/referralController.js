const ReferralService = require('../services/referralService');

class ReferralController {
  /**
   * Get referral report
   * GET /referral/report
   */
  static async getReferralReport(req, res) {
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

      const reportData = await ReferralService.getReferralReport(filters);

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: reportData
      });
    } catch (error) {
      console.error('❌ ReferralController.getReferralReport - Error:', error);
      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get referral report: ${error.message}`
        }
      });
    }
  }
}

module.exports = ReferralController;

