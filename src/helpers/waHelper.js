const fetch = require('node-fetch');

// WhatsApp automation server URL
const WA_AUTOMATION_URL = process.env.WA_AUTOMATION_URL || 'http://localhost:3001';

exports.sendMessage = async (phone, message, wa_type = 'admin') => {
  try {
    console.log(`Kirim WA ke ${phone}: ${message}`);
    
    // Use the new WhatsApp automation system
    const waRes = await fetch(`${WA_AUTOMATION_URL}/api/wa/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phone: phone, 
        message: message 
      })
    });
    
    const waData = await waRes.json();
    
    if (waData.success) {
      console.log('WhatsApp message sent successfully:', waData.data);
      return {
        success: true,
        message: 'Message sent successfully',
        data: waData.data
      };
    } else {
      console.error('WhatsApp message failed:', waData.message);
      return {
        success: false,
        message: waData.message,
        error: waData.error
      };
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      message: 'Failed to send WhatsApp message',
      error: error.message
    };
  }
};

// Check WhatsApp connection status
exports.checkStatus = async () => {
  try {
    const response = await fetch(`${WA_AUTOMATION_URL}/api/wa/status`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return {
      success: false,
      message: 'Failed to check WhatsApp status',
      error: error.message
    };
  }
};

// Get QR code for authentication
exports.getQRCode = async () => {
  try {
    const response = await fetch(`${WA_AUTOMATION_URL}/api/wa/qr`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting QR code:', error);
    return {
      success: false,
      message: 'Failed to get QR code',
      error: error.message
    };
  }
}; 