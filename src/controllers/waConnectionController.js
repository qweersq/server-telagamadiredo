const WaConnectionService = require('../services/waConnectionService');
const { ResponseHelper } = require('../helpers');

class WaConnectionController {
  /**
   * Create a new WhatsApp connection
   */
  static async createConnection(req, res) {
    try {
      const { connection_type, tenant_id, branch_id } = req.body;
      
      if (!connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Connection type is required'
        });
      }

      const result = await WaConnectionService.createConnection({
        connection_type,
        tenant_id,
        branch_id
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error creating WhatsApp connection:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get QR code for connection
   */
  static async getQRCode(req, res) {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'Connection ID is required'
        });
      }

      const result = await WaConnectionService.getQRCode(connectionId);
      return res.json(result);
    } catch (error) {
      console.error('Error getting QR code:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Check connection status
   */
  static async checkStatus(req, res) {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'Connection ID is required'
        });
      }

      const result = await WaConnectionService.checkStatus(connectionId);
      return res.json(result);
    } catch (error) {
      console.error('Error checking status:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Send message through connection
   */
  static async sendMessage(req, res) {
    try {
      const { connectionId } = req.params;
      const { phone, message } = req.body;
      
      if (!connectionId || !phone || !message) {
        return res.status(400).json({
          success: false,
          message: 'Connection ID, phone number, and message are required'
        });
      }

      const result = await WaConnectionService.sendMessage(connectionId, phone, message);
      return res.json(result);
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get connection history
   */
  static async getConnectionHistory(req, res) {
    try {
      const { connection_type } = req.params;
      const { tenant_id, branch_id, status, page = 1, limit = 10 } = req.query;
      
      if (!connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Connection type is required'
        });
      }

      const options = {
        tenant_id: tenant_id ? parseInt(tenant_id) : undefined,
        branch_id: branch_id ? parseInt(branch_id) : undefined,
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await WaConnectionService.getConnectionHistory(connection_type, options);
      return res.json(result);
    } catch (error) {
      console.error('Error getting connection history:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get connection statistics
   */
  static async getConnectionStats(req, res) {
    try {
      const { connection_type } = req.params;
      const { tenant_id, branch_id } = req.query;
      
      if (!connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Connection type is required'
        });
      }

      const options = {
        tenant_id: tenant_id ? parseInt(tenant_id) : undefined,
        branch_id: branch_id ? parseInt(branch_id) : undefined
      };

      const result = await WaConnectionService.getConnectionStats(connection_type, options);
      return res.json(result);
    } catch (error) {
      console.error('Error getting connection statistics:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Cleanup old connections
   */
  static async cleanupConnections(req, res) {
    try {
      const { connection_type } = req.params;
      const { tenant_id, branch_id } = req.body;
      
      if (!connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Connection type is required'
        });
      }

      const options = {
        tenant_id: tenant_id ? parseInt(tenant_id) : undefined,
        branch_id: branch_id ? parseInt(branch_id) : undefined
      };

      const result = await WaConnectionService.cleanupConnections(connection_type, options);
      return res.json(result);
    } catch (error) {
      console.error('Error cleaning up connections:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get active connection
   */
  static async getActiveConnection(req, res) {
    try {
      const { connection_type } = req.params;
      const { tenant_id, branch_id } = req.query;
      
      if (!connection_type) {
        return res.status(400).json({
          success: false,
          message: 'Connection type is required'
        });
      }

      const options = {
        tenant_id: tenant_id ? parseInt(tenant_id) : undefined,
        branch_id: branch_id ? parseInt(branch_id) : undefined
      };

      const result = await WaConnectionService.getActiveConnection(connection_type, options);
      return res.json(result);
    } catch (error) {
      console.error('Error getting active connection:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Destroy connection
   */
  static async destroyConnection(req, res) {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'Connection ID is required'
        });
      }

      const result = await WaConnectionService.destroyConnection(connectionId);
      return res.json(result);
    } catch (error) {
      console.error('Error destroying connection:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = WaConnectionController;
