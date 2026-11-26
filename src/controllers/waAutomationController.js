const waGatewayHelper = require('../helpers/waGatewayHelper');

exports.sendMessage = async (req, res) => {
  try {
    const { phone, message, sessionId, branch_id } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    const result = await waGatewayHelper.sendMessage(phone, message, sessionId, branch_id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Message sent successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { sessionId, branchId } = req.query;
    const status = await waGatewayHelper.checkStatus(sessionId, branchId);
    res.json(status);
  } catch (error) {
    console.error('Error in getStatus controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getQRCode = async (req, res) => {
  try {
    console.log('🔄 Received request to get QR Code');
    const { sessionId, branchId } = req.query;
    const qrData = await waGatewayHelper.getQRCode(sessionId, branchId);
    console.log('✅ QR Code:', qrData);
    res.json(qrData);
  } catch (error) {
    console.error('Error in getQRCode controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const status = await waGatewayHelper.checkStatus(sessionId);
    const qrData = await waGatewayHelper.getQRCode(sessionId);
    
    res.json({
      success: true,
      message: 'WhatsApp automation test completed',
      timestamp: new Date().toISOString(),
      status: status,
      qrAvailable: qrData.success && qrData.qrCode ? true : false
    });
  } catch (error) {
    console.error('Error in testConnection controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Session Management Controllers

exports.createSession = async (req, res) => {
  try {
    const { branch_id, session_type = 'tenant' } = req.body;
    console.log('🔄 Creating WhatsApp session for branch:', branch_id, 'type:', session_type);
    
    // For superapp sessions, branch_id is not required
    if (session_type !== 'superapp' && !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required for tenant sessions',
        timestamp: new Date().toISOString()
      });
    }
    
    // Import models for cleanup
    const { WaSession, Branch } = require('../models');
    
    // Cleanup old sessions first (for both tenant and superapp)
    if (session_type === 'tenant' && branch_id) {
      console.log('🧹 Cleaning up old tenant sessions for branch:', branch_id);
      
      // Get branch info
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Find and destroy old sessions
      const oldSessions = await WaSession.findAll({
        where: {
          branch_id: branch_id,
          tenant_id: branch.tenant_id,
          status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
        }
      });
      
      if (oldSessions.length > 0) {
        console.log(`🗑️ Found ${oldSessions.length} old tenant sessions to cleanup`);
        
        // Destroy each session in WA Gateway
        for (const session of oldSessions) {
          try {
            console.log(`🔄 Destroying old tenant session: ${session.session_id}`);
            await waGatewayHelper.logoutSession(session.session_id);
          } catch (error) {
            console.error(`❌ Error destroying tenant session ${session.session_id}:`, error.message);
          }
        }
        
        // Mark old sessions as DESTROYED
        await WaSession.update(
          { status: 'DESTROYED' },
          {
            where: {
              branch_id: branch_id,
              tenant_id: branch.tenant_id,
              status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
            }
          }
        );
        
        console.log(`✅ Cleaned up ${oldSessions.length} old tenant sessions`);
      }
    } else if (session_type === 'superapp') {
      console.log('🧹 Cleaning up old superapp sessions');
      
      // Import WaConnection model for superapp cleanup
      const { WaConnection } = require('../models');
      
      // Find and destroy old superapp sessions
      const oldConnections = await WaConnection.findAll({
        where: {
          connection_type: 'superapp',
          status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
        }
      });
      
      if (oldConnections.length > 0) {
        console.log(`🗑️ Found ${oldConnections.length} old superapp connections to cleanup`);
        
        // Destroy each connection in WA Gateway
        for (const connection of oldConnections) {
          try {
            console.log(`🔄 Destroying old superapp connection: ${connection.connection_id}`);
            await waGatewayHelper.logoutSession(connection.connection_id);
          } catch (error) {
            console.error(`❌ Error destroying superapp connection ${connection.connection_id}:`, error.message);
          }
        }
        
        // Mark old connections as DESTROYED
        await WaConnection.update(
          { status: 'DESTROYED' },
          {
            where: {
              connection_type: 'superapp',
              status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
            }
          }
        );
        
        console.log(`✅ Cleaned up ${oldConnections.length} old superapp connections`);
      }
    }
    
    // Create new session
    const result = await waGatewayHelper.createSession(branch_id, session_type);
    
    if (result.success) {
      console.log('✅ Session created successfully:', result.sessionId);
      res.json({
        success: true,
        message: result.message,
        sessionId: result.sessionId,
        branch_id: branch_id,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Failed to create session:', result.message);
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error in createSession controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};


exports.destroySession = async (req, res) => {
  try {
    console.log('🗑️ Received request to destroy WhatsApp session');
    const { sessionId } = req.body;
    
    const result = await waGatewayHelper.logoutSession(sessionId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in destroySession controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};


// New function for sending file messages
exports.sendMessageWithFile = async (req, res) => {
  try {
    const { phone, message, filePath, sessionId } = req.body;

    if (!phone || !filePath) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and file path are required'
      });
    }

    const result = await waGatewayHelper.sendMessageWithFile(phone, message, filePath, sessionId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'File message sent successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessageWithFile controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Notification Controllers
exports.notifyItemDone = async (req, res) => {
  try {
    const { customerName, orderNumber, customerPhone, itemName, branch_id, tenant_id } = req.body;

    if (!customerName || !orderNumber || !customerPhone || !itemName || !branch_id || !tenant_id) {
      return res.status(400).json({
        success: false,
        message: 'customerName, orderNumber, customerPhone, itemName, branch_id, and tenant_id are required'
      });
    }

    // Import template
    const ItemDoneWaTemplate = require('../templateWa/itemDone');
    
    // Generate message using template
    const message = ItemDoneWaTemplate.perItem({
      customerName,
      itemName,
      orderNumber
    });

    // Get session for this branch
    console.log('🔍 Getting session for branch_id:', branch_id, 'tenant_id:', tenant_id);
    const sessionResult = await waGatewayHelper.ensureWhatsAppSession(branch_id, tenant_id);
    console.log('🔍 Session result:', sessionResult);
    
    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        message: sessionResult.message
      });
    }

    // Send message
    console.log('🔍 Sending message to:', customerPhone, 'with session:', sessionResult.sessionId);
    const result = await waGatewayHelper.sendMessage(
      customerPhone, 
      message, 
      sessionResult.sessionId, 
      branch_id
    );
    console.log('🔍 Send message result:', result);

    if (result.success) {
      res.json({
        success: true,
        message: 'Item done notification sent successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in notifyItemDone controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.notifyItemDoneAll = async (req, res) => {
  try {
    const { customerName, orderNumber, customerPhone, branch_id, tenant_id } = req.body;

    if (!customerName || !orderNumber || !customerPhone || !branch_id || !tenant_id) {
      return res.status(400).json({
        success: false,
        message: 'customerName, orderNumber, customerPhone, branch_id, and tenant_id are required'
      });
    }

    // Import template
    const ItemDoneWaTemplate = require('../templateWa/itemDone');
    
    // Generate message using template
    const message = ItemDoneWaTemplate.allDone({
      customerName,
      orderNumber
    });

    // Get session for this branch
    console.log('🔍 Getting session for branch_id:', branch_id, 'tenant_id:', tenant_id);
    const sessionResult = await waGatewayHelper.ensureWhatsAppSession(branch_id, tenant_id);
    console.log('🔍 Session result:', sessionResult);
    
    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        message: sessionResult.message
      });
    }

    // Send message
    console.log('🔍 Sending message to:', customerPhone, 'with session:', sessionResult.sessionId);
    const result = await waGatewayHelper.sendMessage(
      customerPhone, 
      message, 
      sessionResult.sessionId, 
      branch_id
    );
    console.log('🔍 Send message result:', result);

    if (result.success) {
      res.json({
        success: true,
        message: 'All items done notification sent successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in notifyItemDoneAll controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 