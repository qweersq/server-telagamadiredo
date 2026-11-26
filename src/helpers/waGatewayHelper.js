const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const { Branch, WaSession, Tenant } = require('../models');

// WhatsApp API Gateway server URL
const WA_GATEWAY_URL = process.env.WA_GATEWAY_URL || 'http://localhost:3003/api';

// Session management
let currentSessionId = null;

/**
 * Get tenant_id from branch_id
 */
const getTenantIdFromBranch = async (branchId) => {
  try {
    const branch = await Branch.findByPk(branchId);
    return branch ? branch.tenant_id : null;
  } catch (error) {
    console.error('❌ Error getting tenant_id from branch:', error);
    return null;
  }
};

/**
 * Cleanup old sessions for a branch (max 1 active session per branch)
 */
const cleanupOldSessions = async (branchId, tenantId, sessionType = 'tenant') => {
  try {
    // Find existing active sessions for this branch
    const existingSessions = await WaSession.findAll({
      where: {
        branch_id: branchId,
        tenant_id: tenantId,
        session_type: sessionType,
        status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
      },
      order: [['created_at', 'DESC']]
    });

    if (existingSessions.length > 0) {
      console.log(`🧹 Found ${existingSessions.length} existing sessions for branch ${branchId}, cleaning up...`);
      
      // Destroy old sessions in WA Gateway
      for (const session of existingSessions) {
        try {
          console.log(`🗑️ Destroying old session: ${session.session_id}`);
          await fetch(`${WA_GATEWAY_URL}/session/destroy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.session_id })
          });
        } catch (error) {
          console.error(`❌ Error destroying session ${session.session_id}:`, error);
        }
      }

      // Mark old sessions as DESTROYED in database
      await WaSession.update(
        { status: 'DESTROYED' },
        { 
          where: {
            branch_id: branchId,
            tenant_id: tenantId,
            session_type: sessionType,
            status: ['PENDING', 'READY', 'DISCONNECTED', 'FAILED']
          }
        }
      );

      console.log('✅ Old sessions cleaned up successfully');
    }
  } catch (error) {
    console.error('❌ Error cleaning up old sessions:', error);
  }
};

/**
 * Save session to wa_sessions table
 */
const saveSessionToHistory = async (sessionId, branchId, tenantId, status = 'PENDING', qrCode = null, sessionType = 'tenant') => {
  try {
    const [session, created] = await WaSession.findOrCreate({
      where: { session_id: sessionId },
      defaults: {
        session_id: sessionId,
        branch_id: branchId,
        tenant_id: tenantId,
        session_type: sessionType,
        status: status,
        qr_code: qrCode,
        last_activity: new Date()
      }
    });

    if (!created) {
      // Update existing session
      await session.update({
        status: status,
        qr_code: qrCode,
        last_activity: new Date()
      });
    }

    console.log('✅ Session saved to history:', sessionId);
    return session;
  } catch (error) {
    console.error('❌ Error saving session to history:', error);
    return null;
  }
};

/**
 * Update session status
 */
const updateSessionStatus = async (sessionId, status, phoneNumber = null) => {
  try {
    await WaSession.update(
      { 
        status: status,
        phone_number: phoneNumber,
        last_activity: new Date()
      },
      { where: { session_id: sessionId } }
    );
    console.log(`✅ Session status updated: ${sessionId} -> ${status}`);
  } catch (error) {
    console.error('❌ Error updating session status:', error);
  }
};

/**
 * Save session ID to branch in database (legacy support)
 */
const saveSessionToBranch = async (branchId, sessionId) => {
  try {
    await Branch.update(
      { wa_session_id: sessionId },
      { where: { id: branchId } }
    );
    console.log('✅ Session ID saved to branch:', branchId);
  } catch (error) {
    console.error('❌ Error saving session to branch:', error);
  }
};

/**
 * Create a new WhatsApp session
 */
exports.createSession = async (branchId = null, sessionType = 'tenant') => {
  try {
    console.log('🔄 Creating new WhatsApp session for branch:', branchId, 'type:', sessionType);
    
    // For superapp sessions, branch_id and tenant_id are not required
    let tenantId = null;
    if (sessionType === 'superapp') {
      // Use default tenant_id = 1 for superapp sessions
      tenantId = 1;
      branchId = 1; // Use default branch_id = 1 for superapp sessions
    } else {
      if (!branchId) {
        return {
          success: false,
          message: 'Branch ID is required for tenant session creation',
          error: 'Missing branch_id'
        };
      }

      // Get tenant_id from branch
      tenantId = await getTenantIdFromBranch(branchId);
      if (!tenantId) {
        return {
          success: false,
          message: 'Invalid branch ID or tenant not found',
          error: 'Branch not found'
        };
      }
    }

    // Cleanup old sessions for this branch/type
    await cleanupOldSessions(branchId, tenantId, sessionType);
    
    console.log('🔍 Calling WA Gateway API:', `${WA_GATEWAY_URL}/session/create`);
    
    const response = await fetch(`${WA_GATEWAY_URL}/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_id: branchId }),
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WA Gateway API error:', response.status, errorText);
      return {
        success: false,
        message: `WA Gateway API error: ${response.status} - ${errorText}`,
        error: `HTTP ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('🔍 WA Gateway response:', data);
    
    if (data.success) {
      currentSessionId = data.id;
      console.log('✅ Session created:', currentSessionId);
      
      // Save session to history table
      await saveSessionToHistory(currentSessionId, branchId, tenantId, 'PENDING', null, sessionType);
      
      // Save session ID to branch (legacy support)
      await saveSessionToBranch(branchId, data.id);
      
      return {
        success: true,
        message: data.message,
        sessionId: data.id
      };
    } else {
      console.error('❌ Failed to create session:', data.message);
      return {
        success: false,
        message: data.message || 'Unknown error from WA Gateway',
        error: data.message || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('❌ Error creating session:', {
      message: error.message,
      stack: error.stack,
      branchId,
      sessionType
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timeout - WA Gateway tidak merespons',
        error: 'TIMEOUT'
      };
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: 'WA Gateway tidak dapat diakses - pastikan server berjalan',
        error: 'CONNECTION_REFUSED'
      };
    }
    
    return {
      success: false,
      message: 'Failed to create WhatsApp session: ' + error.message,
      error: error.message
    };
  }
};

/**
 * Get QR code for session authentication
 */
exports.getQRCode = async (sessionId = null, branchId = null) => {
  try {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!targetSessionId) {
      return {
        success: false,
        message: 'No active session. Please create a session first.',
        error: 'No session ID available'
      };
    }
    
    console.log('🔄 Getting QR code for session:', targetSessionId);
    
    const response = await fetch(`${WA_GATEWAY_URL}/session/qr?id=${targetSessionId}`, {
      timeout: 15000 // 15 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WA Gateway QR API error:', response.status, errorText);
      return {
        success: false,
        message: `WA Gateway QR API error: ${response.status} - ${errorText}`,
        error: `HTTP ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('🔍 WA Gateway QR response:', data);
    
    if (data.success && data.qr) {
      console.log('✅ QR code retrieved successfully');
      
      // Update session in history with QR code
      if (branchId) {
        const tenantId = await getTenantIdFromBranch(branchId);
        if (tenantId) {
          await saveSessionToHistory(targetSessionId, branchId, tenantId, 'PENDING', data.qr);
        }
      }
      
      return {
        success: true,
        qrCode: data.qr,
        sessionId: data.id
      };
    } else {
      console.error('❌ Failed to get QR code:', data.message);
      return {
        success: false,
        message: data.message || 'QR code not available yet',
        error: data.message || 'QR_NOT_READY'
      };
    }
  } catch (error) {
    console.error('❌ Error getting QR code:', {
      message: error.message,
      stack: error.stack,
      sessionId,
      branchId
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timeout - WA Gateway tidak merespons',
        error: 'TIMEOUT'
      };
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: 'WA Gateway tidak dapat diakses - pastikan server berjalan',
        error: 'CONNECTION_REFUSED'
      };
    }
    
    return {
      success: false,
      message: 'Failed to get QR code: ' + error.message,
      error: error.message
    };
  }
};

/**
 * Check session status
 */
exports.checkStatus = async (sessionId = null, branchId = null) => {
  try {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!targetSessionId) {
      return {
        success: false,
        message: 'No active session. Please create a session first.',
        error: 'No session ID available'
      };
    }
    
    console.log('🔄 Checking session status:', targetSessionId);
    
    const response = await fetch(`${WA_GATEWAY_URL}/session/status?id=${targetSessionId}`, {
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WA Gateway Status API error:', response.status, errorText);
      return {
        success: false,
        message: `WA Gateway Status API error: ${response.status} - ${errorText}`,
        error: `HTTP ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('🔍 WA Gateway Status response:', data);
    
    if (data.success) {
      console.log('✅ Session status:', data.status);
      
      // Update session status in history
      await updateSessionStatus(targetSessionId, data.status, data.phone_number);
      
      return {
        success: true,
        status: data.status,
        sessionId: data.id,
        phone_number: data.phone_number
      };
    } else {
      console.error('❌ Failed to check status:', data.message);
      return {
        success: false,
        message: data.message || 'Failed to get session status',
        error: data.message || 'STATUS_CHECK_FAILED'
      };
    }
  } catch (error) {
    console.error('❌ Error checking status:', {
      message: error.message,
      stack: error.stack,
      sessionId,
      branchId
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timeout - WA Gateway tidak merespons',
        error: 'TIMEOUT'
      };
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: 'WA Gateway tidak dapat diakses - pastikan server berjalan',
        error: 'CONNECTION_REFUSED'
      };
    }
    
    return {
      success: false,
      message: 'Failed to check session status: ' + error.message,
      error: error.message
    };
  }
};

/**
 * Get session details
 */
exports.getSessionDetail = async (sessionId = null) => {
  try {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!targetSessionId) {
      return {
        success: false,
        message: 'No active session. Please create a session first.',
        error: 'No session ID available'
      };
    }
    
    console.log('🔄 Getting session details:', targetSessionId);
    
    const response = await fetch(`${WA_GATEWAY_URL}/session/detail?id=${targetSessionId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Session details retrieved');
      return {
        success: true,
        sessionId: data.id,
        status: data.status,
        metadata: data.metadata
      };
    } else {
      console.error('❌ Failed to get session details:', data.message);
      return {
        success: false,
        message: data.message,
        error: data.message
      };
    }
  } catch (error) {
    console.error('Error getting session details:', error);
    return {
      success: false,
      message: 'Failed to get session details',
      error: error.message
    };
  }
};

/**
 * Get all sessions
 */
exports.getAllSessions = async () => {
  try {
    console.log('🔄 Getting all sessions...');
    
    const response = await fetch(`${WA_GATEWAY_URL}/session/list`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Sessions retrieved:', data.count);
      return {
        success: true,
        count: data.count,
        sessions: data.sessions
      };
    } else {
      console.error('❌ Failed to get sessions:', data.message);
      return {
        success: false,
        message: data.message,
        error: data.message
      };
    }
  } catch (error) {
    console.error('Error getting sessions:', error);
    return {
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    };
  }
};

/**
 * Send WhatsApp message
 */
exports.sendMessage = async (phone, message, sessionId = null, branchId = null) => {
  try {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!targetSessionId) {
      return {
        success: false,
        message: 'No active session. Please create a session first.',
        error: 'No session ID available'
      };
    }
    
    console.log(`📱 Sending message to ${phone}: ${message}`);
    
    const response = await fetch(`${WA_GATEWAY_URL}/send-message/${targetSessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to: phone, 
        text: message 
      })
    });
    
    const data = await response.json();
    console.log('🔍 WhatsApp API Response:', JSON.stringify(data, null, 2));
    
    // Handle different response formats
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      if (result.success) {
        console.log('✅ Message sent successfully to:', result.number);
        return {
          success: true,
          message: 'Message sent successfully',
          data: result
        };
      } else {
        console.error('❌ Message failed:', result.message);
        return {
          success: false,
          message: result.message,
          error: result.message
        };
      }
    } else if (data && typeof data === 'object') {
      // Handle single object response
      if (data.success) {
        console.log('✅ Message sent successfully to:', data.number || phone);
        return {
          success: true,
          message: 'Message sent successfully',
          data: data
        };
      } else {
        console.error('❌ Message failed:', data.message);
        return {
          success: false,
          message: data.message,
          error: data.message
        };
      }
    } else {
      console.error('❌ Invalid response format:', data);
      return {
        success: false,
        message: 'Invalid response from WhatsApp API',
        error: 'Invalid response format'
      };
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      message: 'Failed to send WhatsApp message',
      error: error.message
    };
  }
};

/**
 * Send WhatsApp message with file
 */
exports.sendMessageWithFile = async (phone, message, filePath, sessionId = null) => {
  try {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!targetSessionId) {
      return {
        success: false,
        message: 'No active session. Please create a session first.',
        error: 'No session ID available'
      };
    }
    
    console.log(`📎 Sending file message to ${phone}: ${filePath}`);
    
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('to', phone);
    if (message) form.append('text', message);
    form.append('file', fs.createReadStream(filePath));
    
    const response = await fetch(`${WA_GATEWAY_URL}/send-message-with-file/${targetSessionId}`, {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      if (result.success) {
        console.log('✅ File message sent successfully to:', result.recipient);
        return {
          success: true,
          message: 'File message sent successfully',
          data: result
        };
      } else {
        console.error('❌ File message failed:', result.message);
        return {
          success: false,
          message: result.message,
          error: result.message
        };
      }
    } else {
      console.error('❌ Invalid response format:', data);
      return {
        success: false,
        message: 'Invalid response from WhatsApp API',
        error: 'Invalid response format'
      };
    }
  } catch (error) {
    console.error('Error sending file message:', error);
    return {
      success: false,
      message: 'Failed to send WhatsApp file message',
      error: error.message
    };
  }
};

/**
 * Logout session
 */
exports.logoutSession = async (sessionId = null) => {
  try {
    const targetSessionId = sessionId || currentSessionId;
    
    if (!targetSessionId) {
      return {
        success: false,
        message: 'No active session to logout.',
        error: 'No session ID available'
      };
    }
    
    console.log('👋 Logging out session:', targetSessionId);
    
    const response = await fetch(`${WA_GATEWAY_URL}/session/logout?id=${targetSessionId}`, {
      method: 'DELETE',
      timeout: 15000 // 15 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WA Gateway Logout API error:', response.status, errorText);
      return {
        success: false,
        message: `WA Gateway Logout API error: ${response.status} - ${errorText}`,
        error: `HTTP ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('🔍 WA Gateway Logout response:', data);
    
    if (data.success) {
      currentSessionId = null;
      console.log('✅ Session logged out successfully');
      
      // Update session status in history to DESTROYED
      await updateSessionStatus(targetSessionId, 'DESTROYED');
      
      return {
        success: true,
        message: data.message || 'Session logged out successfully'
      };
    } else {
      console.error('❌ Failed to logout session:', data.message);
      return {
        success: false,
        message: data.message || 'Failed to logout session',
        error: data.message || 'LOGOUT_FAILED'
      };
    }
  } catch (error) {
    console.error('❌ Error logging out session:', {
      message: error.message,
      stack: error.stack,
      sessionId
    });
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timeout - WA Gateway tidak merespons',
        error: 'TIMEOUT'
      };
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: 'WA Gateway tidak dapat diakses - pastikan server berjalan',
        error: 'CONNECTION_REFUSED'
      };
    }
    
    return {
      success: false,
      message: 'Failed to logout session: ' + error.message,
      error: error.message
    };
  }
};

/**
 * Get current session ID
 */
exports.getCurrentSessionId = () => {
  return currentSessionId;
};

/**
 * Set current session ID
 */
exports.setCurrentSessionId = (sessionId) => {
  currentSessionId = sessionId;
};

/**
 * Get WhatsApp session for specific branch and tenant (read-only)
 */
exports.ensureWhatsAppSession = async (branchId = null, tenantId = null) => {
  try {
    // Cari session yang ready untuk branch dan tenant ini dari database
    const readySession = await WaSession.findOne({
      where: {
        branch_id: branchId,
        tenant_id: tenantId,
        status: 'READY'
      },
      order: [['updated_at', 'DESC']] // Ambil yang terbaru
    });
    
    if (readySession) {
      return { 
        success: true, 
        sessionId: readySession.session_id,
        phone_number: readySession.phone_number
      };
    }
    
    // Jika tidak ada session ready, cari session PENDING
    const pendingSession = await WaSession.findOne({
      where: {
        branch_id: branchId,
        tenant_id: tenantId,
        status: 'PENDING'
      },
      order: [['created_at', 'DESC']]
    });
    
    if (pendingSession) {
      return { 
        success: true, 
        sessionId: pendingSession.session_id,
        needsQR: true,
        message: 'Session exists but waiting for QR scan'
      };
    }
    
    // Jika tidak ada session sama sekali, return error
    return { 
      success: false, 
      message: 'No WhatsApp session found for this branch. Please create a session first.' 
    };
  } catch (error) {
    console.error('Error getting WhatsApp session:', error);
    return { 
      success: false, 
      message: 'Error getting WhatsApp session: ' + error.message 
    };
  }
};

/**
 * Clean phone number for WhatsApp (remove non-digits, ensure starts with 62)
 */
exports.cleanPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // If doesn't start with 62, add it
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
};

/**
 * Send follow-up message using real WhatsApp API Gateway
 */
exports.sendFollowupMessage = async (phone, message, sessionId = null) => {
  try {
    console.log(`📱 Preparing to send follow-up message to ${phone}`);
    console.log(`📱 Session ID: ${sessionId || 'default'}`);
    
    const waGatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:3003/api';
    const url = `${waGatewayUrl}/send-message/${sessionId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        text: message
      })
    });
    
    const result = await response.json();
    
    // WA Gateway returns an array of results, find the one for this phone number
    const phoneResult = Array.isArray(result) ? result.find(r => r.number === phone) : result;
    
    if (response.ok && phoneResult && phoneResult.success) {
      console.log(`✅ Message sent successfully to ${phone}`);
      return {
        success: true,
        message: 'Message sent successfully',
        data: {
          number: phone,
          message: message,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          status: 'sent',
          wa_response: phoneResult
        }
      };
    } else {
      const errorMessage = phoneResult?.message || result?.message || 'Failed to send message';
      console.log(`❌ Message failed to send to ${phone}: ${errorMessage}`);
      return {
        success: false,
        message: errorMessage,
        error: 'WA_GATEWAY_ERROR',
        data: {
          number: phone,
          message: message,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          status: 'failed',
          wa_response: phoneResult || result
        }
      };
    }
    
  } catch (error) {
    console.error(`❌ Error sending follow-up message:`, error);
    return {
      success: false,
      message: error.message,
      error: error.message
    };
  }
};

/**
 * Send follow-up message with file using real WhatsApp API Gateway
 */
exports.sendFollowupMessageWithFile = async (phone, message, fileUrl, sessionId = null) => {
  try {
    console.log(`📱 Preparing to send follow-up message with file to ${phone}`);
    console.log(`📱 Session ID: ${sessionId || 'default'}`);
    console.log(`📎 File URL: ${fileUrl}`);
    
    const waGatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:3003/api';
    const url = `${waGatewayUrl}/send-message-with-file/${sessionId}`;
    
    // Convert file URL to actual file path
    const filePath = fileUrl.replace('/public/', './public/');
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('to', phone);
    formData.append('text', message);
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    // WA Gateway returns an array of results, find the one for this phone number
    const phoneResult = Array.isArray(result) ? result.find(r => r.number === phone) : result;
    
    if (response.ok && phoneResult && phoneResult.success) {
      console.log(`✅ Message with file sent successfully to ${phone}`);
      return {
        success: true,
        message: 'Message with file sent successfully',
        data: {
          number: phone,
          message: message,
          file_url: fileUrl,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          status: 'sent',
          wa_response: phoneResult
        }
      };
    } else {
      const errorMessage = phoneResult?.message || result?.message || 'Failed to send message with file';
      console.log(`❌ Message with file failed to send to ${phone}: ${errorMessage}`);
      return {
        success: false,
        message: errorMessage,
        error: 'WA_GATEWAY_ERROR',
        data: {
          number: phone,
          message: message,
          file_url: fileUrl,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          status: 'failed',
          wa_response: phoneResult || result
        }
      };
    }
    
  } catch (error) {
    console.error(`❌ Error sending follow-up message with file:`, error);
    return {
      success: false,
      message: error.message,
      error: error.message
    };
  }
};
