const OperationalService = require('../services/operationalService');

class OperationalController {
  /**
   * Get comprehensive operational report
   * GET /operational/report
   */
  static async getOperationalReport(req, res) {
    try {
      console.log('🔍 OperationalController.getOperationalReport - Query:', req.query);

      const { branch_id, start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getOperationalReport - Processing:', filters);

      // Get operational report data
      const reportData = await OperationalService.getOperationalReport(filters);

      console.log('✅ OperationalController.getOperationalReport - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: reportData
      });
    } catch (error) {
      console.error('❌ OperationalController.getOperationalReport - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get operational report: ${error.message}`
        }
      });
    }
  }

  /**
   * Get operational summary
   * GET /operational/summary
   */
  static async getOperationalSummary(req, res) {
    try {
      console.log('🔍 OperationalController.getOperationalSummary - Query:', req.query);

      const { branch_id, start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getOperationalSummary - Processing:', filters);

      // Get summary data
      const summaryData = await OperationalService.getOperationalSummary(filters);

      console.log('✅ OperationalController.getOperationalSummary - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: summaryData
      });
    } catch (error) {
      console.error('❌ OperationalController.getOperationalSummary - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get operational summary: ${error.message}`
        }
      });
    }
  }

  /**
   * Get performance metrics per branch (beranda Supervisor "Top Cabang")
   * GET /operational/branches-performance
   *
   * ⚠️ Sengaja TIDAK menerima `branch_id` — endpoint ini memang mengembalikan
   *    SEMUA cabang milik tenant sekaligus. Keputusan owner: supervisor boleh
   *    melihat data & omzet semua cabang.
   *
   * Response: { success: true, data: { [branch_id]: { revenue, cashIn, treatments, items, orders, delta } } }
   */
  static async getBranchesPerformance(req, res) {
    try {
      console.log('🔍 OperationalController.getBranchesPerformance - Query:', req.query);

      const { start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters (semua cabang — tanpa branch_id)
      const filters = {
        tenant_id: tenant_id,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getBranchesPerformance - Processing:', filters);

      const branchMetrics = await OperationalService.getBranchesPerformance(filters);

      console.log('✅ OperationalController.getBranchesPerformance - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: branchMetrics
      });
    } catch (error) {
      console.error('❌ OperationalController.getBranchesPerformance - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get branches performance: ${error.message}`
        }
      });
    }
  }

  /**
   * Get top services
   * GET /operational/top-services
   */
  static async getTopServices(req, res) {
    try {
      console.log('🔍 OperationalController.getTopServices - Query:', req.query);

      const { branch_id, start_date, end_date, limit = 10 } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date,
        limit: parseInt(limit)
      };

      console.log('📊 OperationalController.getTopServices - Processing:', filters);

      // Get top services data
      const topServicesData = await OperationalService.getTopServices(filters);

      console.log('✅ OperationalController.getTopServices - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: topServicesData
      });
    } catch (error) {
      console.error('❌ OperationalController.getTopServices - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get top services: ${error.message}`
        }
      });
    }
  }

  /**
   * Get top customers
   * GET /operational/top-customers
   */
  static async getTopCustomers(req, res) {
    try {
      console.log('🔍 OperationalController.getTopCustomers - Query:', req.query);

      const { branch_id, start_date, end_date, limit = 10 } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date,
        limit: parseInt(limit)
      };

      console.log('📊 OperationalController.getTopCustomers - Processing:', filters);

      // Get top customers data
      const topCustomersData = await OperationalService.getTopCustomers(filters);

      console.log('✅ OperationalController.getTopCustomers - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: topCustomersData
      });
    } catch (error) {
      console.error('❌ OperationalController.getTopCustomers - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get top customers: ${error.message}`
        }
      });
    }
  }

  /**
   * Get discount analysis
   * GET /operational/discount-analysis
   */
  static async getDiscountAnalysis(req, res) {
    try {
      console.log('🔍 OperationalController.getDiscountAnalysis - Query:', req.query);

      const { branch_id, start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getDiscountAnalysis - Processing:', filters);

      // Get discount analysis data
      const discountAnalysisData = await OperationalService.getDiscountAnalysis(filters);

      console.log('✅ OperationalController.getDiscountAnalysis - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: discountAnalysisData
      });
    } catch (error) {
      console.error('❌ OperationalController.getDiscountAnalysis - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get discount analysis: ${error.message}`
        }
      });
    }
  }

  /**
   * Get item analysis
   * GET /operational/item-analysis
   */
  static async getItemAnalysis(req, res) {
    try {
      console.log('🔍 OperationalController.getItemAnalysis - Query:', req.query);

      const { branch_id, start_date, end_date, limit = 10 } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date,
        limit: parseInt(limit)
      };

      console.log('📊 OperationalController.getItemAnalysis - Processing:', filters);

      // Get item analysis data
      const itemAnalysisData = await OperationalService.getItemAnalysis(filters);

      console.log('✅ OperationalController.getItemAnalysis - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: itemAnalysisData
      });
    } catch (error) {
      console.error('❌ OperationalController.getItemAnalysis - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get item analysis: ${error.message}`
        }
      });
    }
  }

  /**
   * Get membership analysis
   * GET /operational/membership-analysis
   */
  static async getMembershipAnalysis(req, res) {
    try {
      console.log('🔍 OperationalController.getMembershipAnalysis - Query:', req.query);

      const { branch_id, start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getMembershipAnalysis - Processing:', filters);

      // Get membership analysis data
      const membershipAnalysisData = await OperationalService.getMembershipAnalysis(filters);

      console.log('✅ OperationalController.getMembershipAnalysis - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: membershipAnalysisData
      });
    } catch (error) {
      console.error('❌ OperationalController.getMembershipAnalysis - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get membership analysis: ${error.message}`
        }
      });
    }
  }

  /**
   * Get operational trends
   * GET /operational/trends
   */
  static async getOperationalTrends(req, res) {
    try {
      console.log('🔍 OperationalController.getOperationalTrends - Query:', req.query);

      const { branch_id, start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getOperationalTrends - Processing:', filters);

      // Get trends data
      const trendsData = await OperationalService.getOperationalTrends(filters);

      console.log('✅ OperationalController.getOperationalTrends - Success');

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: trendsData
      });
    } catch (error) {
      console.error('❌ OperationalController.getOperationalTrends - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to get operational trends: ${error.message}`
        }
      });
    }
  }

  /**
   * Get operational report PDF
   * GET /operational/report/pdf
   */
  static async getOperationalReportPDF(req, res) {
    try {
      console.log('🔍 OperationalController.getOperationalReportPDF - Query:', req.query);

      const { branch_id, start_date, end_date } = req.query;
      // Always use tenant_id from JWT token for data isolation (security)
      const tenant_id = req.user.tenant_id;

      // Validate required parameters
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            message: 'start_date and end_date are required'
          }
        });
      }

      // Build filters
      const filters = {
        tenant_id: tenant_id,
        branch_id: branch_id ? parseInt(branch_id) : null,
        start_date,
        end_date
      };

      console.log('📊 OperationalController.getOperationalReportPDF - Processing:', filters);

      // Generate PDF buffer
      const pdfBuffer = await OperationalService.generateOperationalReportPDF(filters);

      // Generate filename
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[startDate.getMonth()];
      const year = startDate.getFullYear();
      const dateStr = new Date().toISOString().split('T')[0];
      const branchSuffix = branch_id ? `_${branch_id}` : '_Semua_Cabang';
      const filename = `Laporan_Operasional_${monthName}_${year}${branchSuffix}_${dateStr}.pdf`;

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log('✅ OperationalController.getOperationalReportPDF - Success');

      return res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ OperationalController.getOperationalReportPDF - Error:', error);

      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          message: `Failed to generate operational report PDF: ${error.message}`
        }
      });
    }
  }
}

module.exports = OperationalController;
