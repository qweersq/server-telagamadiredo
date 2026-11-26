const WaConnectionRepository = require('../repositories/waConnectionRepository');
const waGatewayHelper = require('../helpers/waGatewayHelper');

class WaConnectionService {
  /**
   * Create a new WhatsApp connection
   */
  static async createConnection(connectionData) {
    try {
      const { connection_type, tenant_id, branch_id } = connectionData;
      
      console.log('🔍 WaConnectionService - Creating connection:', {
        connection_type,
        tenant_id,
        branch_id
      });
      
      // Cleanup old connections of the same type
      console.log('🧹 Cleaning up old connections...');
      await WaConnectionRepository.cleanupByType(connection_type, {
        tenant_id,
        branch_id
      });

      // Create session in WA Gateway
      console.log('🔄 Creating session in WA Gateway...');
      const gatewayResult = await waGatewayHelper.createSession(connection_type === 'superapp' ? 1 : branch_id, connection_type);
      
      console.log('🔍 WA Gateway result:', gatewayResult);
      
      if (!gatewayResult.success) {
        console.error('❌ WA Gateway session creation failed:', gatewayResult.message);
        throw new Error(`WA Gateway error: ${gatewayResult.message}`);
      }

      // Save connection to database
      const connectionData_db = {
        connection_id: gatewayResult.sessionId,
        connection_type: connection_type,
        tenant_id: tenant_id || null,
        branch_id: branch_id || null,
        status: 'PENDING',
        last_activity: new Date()
      };

      console.log('💾 Saving connection to database:', connectionData_db);
      const connection = await WaConnectionRepository.create(connectionData_db);
      
      console.log('✅ Connection created successfully:', connection.id);
      
      return {
        success: true,
        message: 'WhatsApp connection created successfully',
        data: {
          id: connection.id,
          connection_id: connection.connection_id,
          connection_type: connection.connection_type,
          status: connection.status
        }
      };
    } catch (error) {
      console.error('❌ WaConnectionService - Create connection error:', {
        message: error.message,
        stack: error.stack,
        connectionData
      });
      
      // Handle specific error types
      if (error.message.includes('WA Gateway error')) {
        throw new Error(`Failed to create WhatsApp connection: ${error.message}`);
      }
      
      if (error.message.includes('TIMEOUT')) {
        throw new Error('Failed to create WhatsApp connection: WA Gateway timeout - server tidak merespons');
      }
      
      if (error.message.includes('CONNECTION_REFUSED')) {
        throw new Error('Failed to create WhatsApp connection: WA Gateway tidak dapat diakses - pastikan server berjalan');
      }
      
      throw new Error(`Failed to create WhatsApp connection: ${error.message}`);
    }
  }

  /**
   * Get QR code for connection
   */
  static async getQRCode(connectionId) {
    try {
      console.log('🔍 WaConnectionService - Getting QR code for:', connectionId);
      
      const connection = await WaConnectionRepository.getByConnectionId(connectionId);
      if (!connection) {
        console.error('❌ Connection not found:', connectionId);
        throw new Error('WhatsApp connection not found');
      }

      console.log('🔄 Calling WA Gateway for QR code...');
      const qrResult = await waGatewayHelper.getQRCode(connectionId);
      
      console.log('🔍 WA Gateway QR result:', qrResult);
      
      if (qrResult.success && qrResult.qrCode) {
        // Update connection with QR code
        await WaConnectionRepository.updateByConnectionId(connectionId, {
          qr_code: qrResult.qrCode,
          last_activity: new Date()
        });

        console.log('✅ QR code retrieved and saved successfully');
        return {
          success: true,
          qrCode: qrResult.qrCode,
          connectionId: connectionId
        };
      } else {
        console.error('❌ Failed to get QR code:', qrResult.message);
        return {
          success: false,
          message: qrResult.message || 'Failed to get QR code'
        };
      }
    } catch (error) {
      console.error('❌ WaConnectionService - Get QR code error:', {
        message: error.message,
        stack: error.stack,
        connectionId
      });
      
      // Handle specific error types
      if (error.message.includes('TIMEOUT')) {
        throw new Error('Failed to get QR code: WA Gateway timeout - server tidak merespons');
      }
      
      if (error.message.includes('CONNECTION_REFUSED')) {
        throw new Error('Failed to get QR code: WA Gateway tidak dapat diakses - pastikan server berjalan');
      }
      
      throw new Error(`Failed to get QR code: ${error.message}`);
    }
  }

  /**
   * Check connection status
   */
  static async checkStatus(connectionId) {
    try {
      const connection = await WaConnectionRepository.getByConnectionId(connectionId);
      if (!connection) {
        throw new Error('WhatsApp connection not found');
      }

      const statusResult = await waGatewayHelper.checkStatus(connectionId);
      
      if (statusResult.success) {
        // Update connection status
        await WaConnectionRepository.updateByConnectionId(connectionId, {
          status: statusResult.status,
          phone_number: statusResult.phone_number,
          last_activity: new Date()
        });

        return {
          success: true,
          status: statusResult.status,
          connectionId: connectionId,
          phone_number: statusResult.phone_number
        };
      } else {
        return {
          success: false,
          message: statusResult.message || 'Failed to check status'
        };
      }
    } catch (error) {
      throw new Error(`Failed to check status: ${error.message}`);
    }
  }

  /**
   * Send message through connection
   */
  static async sendMessage(connectionId, phone, message) {
    try {
      const connection = await WaConnectionRepository.getByConnectionId(connectionId);
      if (!connection) {
        throw new Error('WhatsApp connection not found');
      }

      if (connection.status !== 'READY') {
        throw new Error('WhatsApp connection is not ready');
      }

      const messageResult = await waGatewayHelper.sendMessage(phone, message, connectionId);
      
      if (messageResult.success) {
        // Update last activity
        await WaConnectionRepository.updateByConnectionId(connectionId, {
          last_activity: new Date()
        });

        return {
          success: true,
          message: 'Message sent successfully',
          data: messageResult.data
        };
      } else {
        return {
          success: false,
          message: messageResult.message || 'Failed to send message'
        };
      }
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Get connection history
   */
  static async getConnectionHistory(connectionType, options = {}) {
    try {
      const result = await WaConnectionRepository.getHistory(connectionType, options);
      return {
        success: true,
        data: result.connections,
        pagination: result.pagination
      };
    } catch (error) {
      throw new Error(`Failed to get connection history: ${error.message}`);
    }
  }

  /**
   * Get connection statistics
   */
  static async getConnectionStats(connectionType, options = {}) {
    try {
      const stats = await WaConnectionRepository.getStatsByType(connectionType, options);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      throw new Error(`Failed to get connection statistics: ${error.message}`);
    }
  }

  /**
   * Cleanup old connections
   */
  static async cleanupConnections(connectionType, options = {}) {
    try {
      const result = await WaConnectionRepository.cleanupByType(connectionType, options);
      return {
        success: true,
        message: `Cleaned up ${result.cleaned} old connections`,
        data: result
      };
    } catch (error) {
      throw new Error(`Failed to cleanup connections: ${error.message}`);
    }
  }

  /**
   * Get active connection by type
   */
  static async getActiveConnection(connectionType, options = {}) {
    try {
      const connections = await WaConnectionRepository.getActiveByType(connectionType, options);
      
      if (connections.length === 0) {
        return {
          success: false,
          message: 'No active WhatsApp connection found'
        };
      }

      const activeConnection = connections[0]; // Get the most recent one
      
      return {
        success: true,
        data: {
          id: activeConnection.id,
          connection_id: activeConnection.connection_id,
          connection_type: activeConnection.connection_type,
          status: activeConnection.status,
          phone_number: activeConnection.phone_number,
          last_activity: activeConnection.last_activity
        }
      };
    } catch (error) {
      throw new Error(`Failed to get active connection: ${error.message}`);
    }
  }

  /**
   * Destroy connection
   */
  static async destroyConnection(connectionId) {
    try {
      console.log('🔍 WaConnectionService - Destroying connection:', connectionId);
      
      const connection = await WaConnectionRepository.getByConnectionId(connectionId);
      if (!connection) {
        console.error('❌ Connection not found:', connectionId);
        throw new Error('WhatsApp connection not found');
      }

      console.log('🔄 Calling WA Gateway to logout session...');
      // Destroy session in WA Gateway
      const destroyResult = await waGatewayHelper.logoutSession(connectionId);
      
      console.log('🔍 WA Gateway logout result:', destroyResult);
      
      // Update connection status regardless of WA Gateway result
      await WaConnectionRepository.updateByConnectionId(connectionId, {
        status: 'DESTROYED',
        last_activity: new Date()
      });

      console.log('✅ Connection destroyed successfully');
      
      if (destroyResult.success) {
        return {
          success: true,
          message: 'WhatsApp connection destroyed successfully'
        };
      } else {
        // Even if WA Gateway logout failed, we still mark as destroyed in our DB
        return {
          success: true,
          message: 'WhatsApp connection destroyed successfully (WA Gateway cleanup may have failed)',
          warning: destroyResult.message
        };
      }
    } catch (error) {
      console.error('❌ WaConnectionService - Destroy connection error:', {
        message: error.message,
        stack: error.stack,
        connectionId
      });
      
      // Handle specific error types
      if (error.message.includes('TIMEOUT')) {
        throw new Error('Failed to destroy connection: WA Gateway timeout - server tidak merespons');
      }
      
      if (error.message.includes('CONNECTION_REFUSED')) {
        throw new Error('Failed to destroy connection: WA Gateway tidak dapat diakses - pastikan server berjalan');
      }
      
      throw new Error(`Failed to destroy connection: ${error.message}`);
    }
  }
}

module.exports = WaConnectionService;
