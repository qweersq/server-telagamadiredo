class EncryptionService {
  /**
   * Create encrypted data for 402 payment required response
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object
   * @param {Object} validationResult - Validation result from SubscriptionValidationService
   * @returns {Object} - Encrypted data response
   */
  static createPaymentRequiredData(user, tenant, validationResult) {
    const secureData = {
      user_id: user.id,
      tenant_id: user.tenant_id,
      role: user.role_asli || user.role,
      tenant_name: tenant.business_name,
      subscription_status: tenant.subscription_status,
      tenant_status: tenant.status,
      days_remaining: validationResult.daysRemaining || 0,
      message: validationResult.message || 'Subscription tidak aktif, silakan lakukan pembayaran'
    };

    try {
      const encryptedData = require('../helpers/secureDataHelper').encryptSecureData(secureData);
      
      return {
        success: false,
        statusCode: 402,
        error: {
          message: 'Payment required'
        },
        data: {
          redirect_to: '/subscription-payment',
          encrypted_data: encryptedData
        }
      };
    } catch (encryptError) {
      console.error('❌ Error encrypting data:', encryptError.message);
      return {
        success: false,
        statusCode: 500,
        error: {
          message: 'Failed to encrypt data'
        }
      };
    }
  }

  /**
   * Create encrypted data for trial expired response
   * @param {Object} user - User object
   * @param {Object} tenant - Tenant object
   * @param {number} daysRemaining - Days remaining in trial
   * @returns {Object} - Encrypted data response
   */
  static createTrialExpiredData(user, tenant, daysRemaining) {
    const secureData = {
      user_id: user.id,
      tenant_id: user.tenant_id,
      role: user.role_asli || user.role,
      tenant_name: tenant.business_name,
      subscription_status: 'expired',
      tenant_status: 'trial',
      days_remaining: daysRemaining,
      message: 'Trial telah berakhir, silakan lakukan pembayaran'
    };

    try {
      const encryptedData = require('../helpers/secureDataHelper').encryptSecureData(secureData);
      
      return {
        success: false,
        statusCode: 402,
        error: {
          message: 'Payment required'
        },
        data: {
          redirect_to: '/subscription-payment',
          encrypted_data: encryptedData
        }
      };
    } catch (encryptError) {
      console.error('❌ Error encrypting data:', encryptError.message);
      return {
        success: false,
        statusCode: 500,
        error: {
          message: 'Failed to encrypt data'
        }
      };
    }
  }
}

module.exports = EncryptionService;
