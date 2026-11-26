const axios = require('axios');

class WhatsAppAutomationService {
  constructor() {
    this.baseURL = process.env.WA_AUTOMATION_URL || 'http://localhost:3001';
    this.targetPhone = '6282255355740';
  }

  // Check WhatsApp automation status
  async checkStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/wa/status`);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking WhatsApp status:', error.message);
      return {
        success: false,
        message: 'Failed to check WhatsApp status',
        error: error.message
      };
    }
  }

  // Send daily check message
  async sendDailyCheck() {
    try {
      const timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const message = `🤖 *WhatsApp Automation Daily Check*

📅 Tanggal: ${timestamp}
✅ Status: Sistem berjalan normal
🔗 Server: ${this.baseURL}

*Pesan ini dikirim otomatis setiap hari untuk memastikan sistem WhatsApp automation berfungsi dengan baik.*

---
Katsikat System`;

      const response = await axios.post(`${this.baseURL}/api/wa/send-message`, {
        phone: this.targetPhone,
        message: message
      });

      console.log('✅ Daily check message sent successfully');
      return response.data;

    } catch (error) {
      console.error('❌ Error sending daily check message:', error.message);
      
      // Try to get more detailed error info
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      
      return {
        success: false,
        message: 'Failed to send daily check message',
        error: error.message
      };
    }
  }

  // Send error notification
  async sendErrorNotification(errorMessage) {
    try {
      const timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const message = `🚨 *WhatsApp Automation Error Alert*

📅 Tanggal: ${timestamp}
❌ Error: ${errorMessage}
🔗 Server: ${this.baseURL}

*Sistem WhatsApp automation mengalami masalah. Mohon segera diperiksa.*

---
Katsikat System`;

      const response = await axios.post(`${this.baseURL}/api/wa/send-message`, {
        phone: this.targetPhone,
        message: message
      });

      console.log('✅ Error notification sent successfully');
      return response.data;

    } catch (error) {
      console.error('❌ Error sending error notification:', error.message);
      return {
        success: false,
        message: 'Failed to send error notification',
        error: error.message
      };
    }
  }

  // Send system status report
  async sendSystemStatusReport() {
    try {
      // Check WhatsApp status first
      const statusResponse = await this.checkStatus();
      
      const timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      let statusEmoji = '❌';
      let statusText = 'Tidak Terhubung';
      
      if (statusResponse.success && statusResponse.isReady) {
        statusEmoji = '✅';
        statusText = 'Terhubung';
      }

      const message = `📊 *WhatsApp Automation Status Report*

📅 Tanggal: ${timestamp}
${statusEmoji} Status: ${statusText}
🔗 Server: ${this.baseURL}

*Laporan status sistem WhatsApp automation.*

---
Katsikat System`;

      const response = await axios.post(`${this.baseURL}/api/wa/send-message`, {
        phone: this.targetPhone,
        message: message
      });

      console.log('✅ System status report sent successfully');
      return response.data;

    } catch (error) {
      console.error('❌ Error sending system status report:', error.message);
      return {
        success: false,
        message: 'Failed to send system status report',
        error: error.message
      };
    }
  }

  // Comprehensive daily check with error handling
  async performDailyCheck() {
    console.log('🔍 Performing WhatsApp automation daily check...');
    
    try {
      // Step 1: Check if WhatsApp automation server is running
      const statusCheck = await this.checkStatus();
      
      if (!statusCheck.success) {
        console.log('❌ WhatsApp automation server is not responding');
        await this.sendErrorNotification('Server tidak merespons');
        return false;
      }

      // Step 2: Check if WhatsApp is connected
      if (!statusCheck.isReady) {
        console.log('⚠️ WhatsApp is not connected');
        await this.sendErrorNotification('WhatsApp tidak terhubung - QR code perlu di-scan');
        return false;
      }

      // Step 3: Send daily check message
      const dailyCheckResult = await this.sendDailyCheck();
      
      if (dailyCheckResult.success) {
        console.log('✅ Daily check completed successfully');
        return true;
      } else {
        console.log('❌ Failed to send daily check message');
        await this.sendErrorNotification('Gagal mengirim pesan daily check');
        return false;
      }

    } catch (error) {
      console.error('❌ Error during daily check:', error.message);
      await this.sendErrorNotification(`Error during daily check: ${error.message}`);
      return false;
    }
  }

  // Destroy WhatsApp session (force reset)
  async destroySession() {
    try {
      console.log('🗑️ Destroying WhatsApp session...');
      const response = await axios.post(`${this.baseURL}/api/wa/destroy-session`);
      
      if (response.data.success) {
        console.log('✅ WhatsApp session destroyed successfully');
        return response.data;
      } else {
        console.log('❌ Failed to destroy WhatsApp session');
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error destroying WhatsApp session:', error.message);
      return {
        success: false,
        message: 'Failed to destroy WhatsApp session',
        error: error.message
      };
    }
  }

  // Logout from WhatsApp
  async logout() {
    try {
      console.log('👋 Logging out from WhatsApp...');
      const response = await axios.post(`${this.baseURL}/api/wa/logout`);
      
      if (response.data.success) {
        console.log('✅ WhatsApp logout successful');
        return response.data;
      } else {
        console.log('❌ Failed to logout from WhatsApp');
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error logging out from WhatsApp:', error.message);
      return {
        success: false,
        message: 'Failed to logout from WhatsApp',
        error: error.message
      };
    }
  }

  // Restart WhatsApp service
  async restart() {
    try {
      console.log('🔄 Restarting WhatsApp service...');
      const response = await axios.post(`${this.baseURL}/api/wa/restart`);
      
      if (response.data.success) {
        console.log('✅ WhatsApp service restarted successfully');
        return response.data;
      } else {
        console.log('❌ Failed to restart WhatsApp service');
        return response.data;
      }
    } catch (error) {
      console.error('❌ Error restarting WhatsApp service:', error.message);
      return {
        success: false,
        message: 'Failed to restart WhatsApp service',
        error: error.message
      };
    }
  }

  // Recovery attempt with session reset
  async attemptRecovery() {
    console.log('🔧 Attempting WhatsApp automation recovery...');
    
    try {
      // Step 1: Try to restart the service
      console.log('🔄 Step 1: Restarting service...');
      const restartResult = await this.restart();
      
      if (restartResult.success) {
        // Wait for service to initialize
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check if it's working now
        const statusCheck = await this.checkStatus();
        if (statusCheck.success) {
          await this.sendErrorNotification('✅ Recovery berhasil: Service direstart dan berfungsi normal');
          return true;
        }
      }

      // Step 2: If restart didn't work, try logout
      console.log('👋 Step 2: Trying logout...');
      const logoutResult = await this.logout();
      
      if (logoutResult.success) {
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const statusCheck = await this.checkStatus();
        if (statusCheck.success) {
          await this.sendErrorNotification('✅ Recovery berhasil: Logout dan QR code baru tersedia');
          return true;
        }
      }

      // Step 3: If logout didn't work, try destroy session
      console.log('🗑️ Step 3: Destroying session...');
      const destroyResult = await this.destroySession();
      
      if (destroyResult.success) {
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const statusCheck = await this.checkStatus();
        if (statusCheck.success) {
          await this.sendErrorNotification('✅ Recovery berhasil: Session direset dan QR code baru tersedia');
          return true;
        }
      }

      // If all recovery attempts failed
      await this.sendErrorNotification('❌ Recovery gagal: Semua metode recovery sudah dicoba. Perlu pengecekan manual.');
      return false;

    } catch (error) {
      console.error('❌ Error during recovery attempt:', error.message);
      await this.sendErrorNotification(`❌ Error during recovery: ${error.message}`);
      return false;
    }
  }
}

module.exports = new WhatsAppAutomationService();
