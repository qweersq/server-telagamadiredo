const CampaignWaService = require('../services/campaignWaService');
const { ResponseHelper } = require('../helpers');

class CampaignWaController {
  /**
   * Connect WA session for campaign
   * POST /api/campaigns/wa/connect
   */
  static async connectSession(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      
      // Always logout existing session first
      try {
        await CampaignWaService.logoutSession(tenant_id);
      } catch (logoutError) {
        console.log('ℹ️ No existing session to logout:', logoutError.message);
      }
      
      // Create new session
      const result = await CampaignWaService.connectSession(tenant_id);
      return res.status(201).json(ResponseHelper.successResponse(result, 'Campaign WA session connected successfully'));
    } catch (error) {
      console.error('❌ Error connecting campaign WA session:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get campaign WA session status
   * GET /api/campaigns/wa/status
   */
  static async getSessionStatus(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      
      const result = await CampaignWaService.getSessionStatus(tenant_id);
      return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign WA session status retrieved successfully'));
    } catch (error) {
      console.error('❌ Error getting campaign WA session status:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get QR code for campaign WA session
   * GET /api/campaigns/wa/qr
   */
  static async getQRCode(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      
      const result = await CampaignWaService.getQRCode(tenant_id);
      return res.status(200).json(ResponseHelper.successResponse(result, 'QR code retrieved successfully'));
    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Disconnect campaign WA session
   * POST /api/campaigns/wa/disconnect
   */
  static async disconnectSession(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      
      const result = await CampaignWaService.disconnectSession(tenant_id);
      return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign WA session disconnected successfully'));
    } catch (error) {
      console.error('❌ Error disconnecting campaign WA session:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get campaign WA sessions history
   * GET /api/campaigns/wa/sessions
   */
  static async getSessions(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      const { status, page = 1, limit = 10 } = req.query;
      
      const result = await CampaignWaService.getSessions(tenant_id, { status, page: parseInt(page), limit: parseInt(limit) });
      return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign WA sessions retrieved successfully'));
    } catch (error) {
      console.error('❌ Error getting campaign WA sessions:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Logout campaign WA session (destroy session)
   * POST /api/campaigns/wa/logout
   */
  static async logoutSession(req, res) {
    try {
      const tenant_id = req.user.tenant_id;
      
      const result = await CampaignWaService.logoutSession(tenant_id);
      return res.status(200).json(ResponseHelper.successResponse(result, 'Campaign WA session logged out successfully'));
    } catch (error) {
      console.error('❌ Error logging out campaign WA session:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Send test message through campaign WA session
   * POST /api/campaigns/wa/test-message
   */
  static async sendTestMessage(req, res) {
    try {
      const { phone, message } = req.body;
      const tenant_id = req.user.tenant_id;
      
      if (!phone || !message) {
        return res.status(400).json(ResponseHelper.errorResponse('Phone number and message are required'));
      }
      
      const result = await CampaignWaService.sendTestMessage(tenant_id, phone, message);
      return res.status(200).json(ResponseHelper.successResponse(result, 'Test message sent successfully'));
    } catch (error) {
      console.error('❌ Error in sendTestMessage:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = CampaignWaController;
