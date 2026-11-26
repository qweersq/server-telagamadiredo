const ReferralRepository = require('../repositories/referralRepository');

class ReferralService {
  /**
   * Get referral report
   */
  static async getReferralReport(filters) {
    try {
      const reportData = await ReferralRepository.getReferralReport(filters);
      return reportData;
    } catch (error) {
      throw new Error(`Failed to get referral report: ${error.message}`);
    }
  }
}

module.exports = ReferralService;

