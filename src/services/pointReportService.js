const PointReportRepository = require('../repositories/pointReportRepository');

class PointReportService {
  /**
   * Get point report
   */
  static async getPointReport(filters) {
    try {
      const reportData = await PointReportRepository.getPointReport(filters);
      return reportData;
    } catch (error) {
      throw new Error(`Failed to get point report: ${error.message}`);
    }
  }
}

module.exports = PointReportService;

