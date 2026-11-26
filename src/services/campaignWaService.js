const { WaSession, Tenant, sequelize } = require('../models');
const waCampaignHelper = require('../helpers/waCampaignHelper');

class CampaignWaService {
  /**
   * Connect WA session for campaign
   */
  static async connectSession(tenant_id) {
    try {
      console.log(`🔗 Connecting campaign WA session for tenant ${tenant_id}`);
      
      // Logout ALL existing sessions for this tenant first
      const existingSessions = await WaSession.findAll({
        where: {
          tenant_id,
          session_type: 'tenant_campaign'
        }
      });
      
      for (const session of existingSessions) {
        console.log(`🧹 Logging out existing session: ${session.session_id} (${session.status})`);
        try {
          await waCampaignHelper.logoutSession(session.session_id);
        } catch (error) {
          console.error(`⚠️ Error logging out session ${session.session_id}: ${error.message}`);
        }
        
        // Mark all old sessions as DESTROYED
        await session.update({
          status: 'DESTROYED',
          last_activity: new Date()
        });
      }
      
      // Connect to WA Gateway to get fresh session ID
      const gatewayResult = await waCampaignHelper.createSession(`campaign_${tenant_id}_${Date.now()}`);
      
      console.log('🔍 WA Gateway response:', JSON.stringify(gatewayResult, null, 2));
      
      if (gatewayResult.success) {
        // Extract session ID from response (could be in data.id or directly in data)
        const sessionId = gatewayResult.data?.id || gatewayResult.id || gatewayResult.data;
        
        if (!sessionId) {
          throw new Error('Session ID not found in WA Gateway response');
        }
        
        // Always create NEW session record (never reuse old ones)
        const sessionData = {
          tenant_id,
          session_type: 'tenant_campaign',
          status: 'PENDING',
          phone_number: null,
          session_id: sessionId
        };
        
        const session = await WaSession.create(sessionData);
        
        console.log(`✅ Campaign WA session created fresh: ${session.session_id} (ID: ${session.id})`);
        return {
          id: session.id,
          session_id: session.session_id,
          status: 'PENDING',
          phone_number: null,
          qr_code: null // QR code will be fetched separately
        };
      } else {
        throw new Error(gatewayResult.message || 'Failed to create session in WA Gateway');
      }
    } catch (error) {
      console.error('❌ Error connecting campaign WA session:', error);
      throw error;
    }
  }

  /**
   * Get campaign WA session status
   */
  static async getSessionStatus(tenant_id) {
    try {
      const session = await WaSession.findOne({
        where: {
          tenant_id,
          session_type: 'tenant_campaign',
          status: ['PENDING', 'READY']
        },
        order: [['created_at', 'DESC']]
      });
      
      if (!session) {
        return {
          connected: false,
          message: 'No active campaign WA session found'
        };
      }
      
      // Check real-time status from WA Gateway
      try {
        const gatewayStatus = await waCampaignHelper.checkSessionStatus(session.session_id);
        
        if (gatewayStatus.success && gatewayStatus.data) {
          const gatewayData = gatewayStatus.data;
          const newStatus = gatewayData.status || session.status;
          
          // Update local session with real-time data
          await session.update({
            status: newStatus,
            phone_number: gatewayData.phone_number || session.phone_number,
            last_activity: new Date()
          });
          
          return {
            id: session.id,
            connected: newStatus === 'READY',
            session_id: session.session_id,
            status: newStatus,
            phone_number: gatewayData.phone_number || session.phone_number,
            last_activity: session.last_activity,
            qr_code: gatewayData.qr_code
          };
        } else {
          // If gateway check fails, return local status
          return {
            id: session.id,
            connected: session.status === 'READY',
            session_id: session.session_id,
            status: session.status,
            phone_number: session.phone_number,
            last_activity: session.last_activity
          };
        }
      } catch (gatewayError) {
        console.error('❌ Error checking gateway status:', gatewayError);
        // If gateway check fails, return local status
        return {
          id: session.id,
          connected: session.status === 'READY',
          session_id: session.session_id,
          status: session.status,
          phone_number: session.phone_number,
          last_activity: session.last_activity
        };
      }
    } catch (error) {
      console.error('❌ Error getting campaign WA session status:', error);
      throw error;
    }
  }

  /**
   * Get QR code for campaign WA session
   */
  static async getQRCode(tenant_id) {
    try {
      const session = await WaSession.findOne({
        where: {
          tenant_id,
          session_type: 'tenant_campaign',
          status: ['PENDING', 'READY']
        },
        order: [['created_at', 'DESC']]
      });
      
      if (!session) {
        return { message: 'No active campaign WA session found' };
      }
      
      // Get QR code from WA Gateway
      const qrResult = await waCampaignHelper.getQRCode(session.session_id);
      
      if (qrResult.success) {
        return {
          session_id: session.session_id,
          qr_code: qrResult.data.qr,
          status: session.status
        };
      } else {
        throw new Error(qrResult.message || 'Failed to get QR code');
      }
    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      throw error;
    }
  }

  /**
   * Disconnect campaign WA session
   */
  static async disconnectSession(tenant_id) {
    try {
      const session = await WaSession.findOne({
        where: {
          tenant_id,
          session_type: 'tenant_campaign',
          status: ['PENDING', 'READY']
        }
      });
      
      if (!session) {
        return { message: 'No active campaign WA session found' };
      }
      
      // Disconnect from WA Gateway
      await waCampaignHelper.logoutSession(session.session_id);
      
      // Update session status
      await session.update({ status: 'DISCONNECTED' });
      
      console.log(`✅ Campaign WA session disconnected: ${session.session_id}`);
      return { message: 'Campaign WA session disconnected successfully' };
    } catch (error) {
      console.error('❌ Error disconnecting campaign WA session:', error);
      throw error;
    }
  }

  /**
   * Get campaign WA sessions history
   */
  static async getSessions(tenant_id, options = {}) {
    try {
      const { status, page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;
      
      const whereClause = {
        tenant_id,
        session_type: 'tenant_campaign'
      };
      
      if (status) {
        whereClause.status = status;
      }
      
      const { count, rows: sessions } = await WaSession.findAndCountAll({
        where: whereClause,
        include: [
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
      
      return {
        sessions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting campaign WA sessions:', error);
      throw error;
    }
  }

  /**
   * Send test message through campaign WA session
   */
  static async sendTestMessage(tenant_id, phone, message) {
    try {
      const session = await WaSession.findOne({
        where: {
          tenant_id,
          session_type: 'tenant_campaign',
          status: ['PENDING', 'READY']
        },
        order: [['created_at', 'DESC']]
      });
      
      if (!session) {
        throw new Error('No active campaign WA session found');
      }
      
      const result = await waCampaignHelper.sendMessage(session.session_id, phone, message);
      
      if (result.success) {
        await session.update({ last_activity: new Date() });
        return { message: 'Test message sent successfully' };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Error sending test message:', error);
      throw error;
    }
  }

  /**
   * Auto-reconnect session when send message fails
   */4
  static async autoReconnectSession(tenant_id) {
    try {
      console.log(`🔄 Auto-reconnecting session for tenant ${tenant_id}`);
      
      // Find current session (including DESTROYED ones)
      const currentSession = await WaSession.findOne({
        where: {
          tenant_id,
          session_type: 'tenant_campaign'
        },
        order: [['created_at', 'DESC']]
      });
      
      if (currentSession) {
        // Destroy old session in WA Gateway
        try {
          await waCampaignHelper.logoutSession(currentSession.session_id);
        } catch (error) {
          console.error(`⚠️ Error destroying old session ${currentSession.session_id}:`, error.message);
        }
        
        // Mark old session as DESTROYED
        await currentSession.update({ status: 'DESTROYED' });
        console.log(`🗑️ Destroyed old session: ${currentSession.session_id}`);
      }
      
      // Create new session
      const gatewayResult = await waCampaignHelper.createSession(`campaign_${tenant_id}_${Date.now()}`);
      
                if (gatewayResult.success) {
                    if (currentSession) {
                        // Update existing session record with new session_id
                        await currentSession.update({
                            session_id: gatewayResult.data.id,
                            status: 'PENDING',
                            phone_number: null,
                            qr_code: null,
                            last_activity: new Date()
                        });
                        console.log(`✅ Auto-reconnected session: ${currentSession.session_id}`);
                        return currentSession;
                    } else {
                        // Create new session record only if no existing session found
                        const newSession = await WaSession.create({
                            tenant_id,
                            session_type: 'tenant_campaign',
                            status: 'PENDING',
                            phone_number: null,
                            session_id: gatewayResult.data.id
                        });
                        console.log(`✅ Created new session: ${newSession.session_id}`);
                        return newSession;
                    }
      } else {
        throw new Error(gatewayResult.message || 'Failed to create new session in WA Gateway');
      }
    } catch (error) {
      console.error('❌ Error in auto-reconnect session:', error);
      throw error;
    }
  }


  /**
   * Logout campaign WA session (destroy session)
   */
  static async logoutSession(tenant_id) {
    try {
      console.log(`🚪 Logging out campaign WA session for tenant ${tenant_id}`);
      
      // Find current session
      const currentSession = await WaSession.findOne({
        where: {
          tenant_id,
          session_type: 'tenant_campaign'
        },
        order: [['created_at', 'DESC']]
      });
      
      if (currentSession) {
        // Destroy session in WA Gateway
        try {
          await waCampaignHelper.logoutSession(currentSession.session_id);
        } catch (error) {
          console.error(`⚠️ Error destroying session ${currentSession.session_id}:`, error.message);
        }
        
        // Mark session as DESTROYED
        await currentSession.update({ status: 'DESTROYED' });
        console.log(`✅ Logged out session: ${currentSession.session_id}`);
        
        return {
          success: true,
          message: 'Session logged out successfully',
          session_id: currentSession.session_id
        };
      } else {
        return {
          success: true,
          message: 'No active session found',
          session_id: null
        };
      }
    } catch (error) {
      console.error('❌ Error logging out campaign WA session:', error);
      throw error;
    }
  }
}

module.exports = CampaignWaService;
