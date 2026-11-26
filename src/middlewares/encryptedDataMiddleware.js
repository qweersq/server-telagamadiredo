const ResponseHelper = require('../helpers/responseHelper');
const { decryptSecureData } = require('../helpers/secureDataHelper');

class EncryptedDataMiddleware {
  /**
   * Middleware untuk validate encrypted data tanpa JWT
   * Digunakan untuk inactive tenants yang tidak bisa login
   */
  static async validateEncryptedData(req, res, next) {
    try {
      console.log('🔍 EncryptedDataMiddleware.validateEncryptedData - Starting validation');
      
      // Get encrypted data from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No valid authorization header found');
        return res.status(401).send(ResponseHelper.errorResponse('Encrypted data required in Authorization header', 401));
      }
      
      const encryptedData = authHeader.replace('Bearer ', '');
      console.log('🔍 Encrypted data received:', encryptedData.substring(0, 50) + '...');
      
      // Decrypt data
      const decryptedData = decryptSecureData(encryptedData);
      if (!decryptedData) {
        console.log('❌ Failed to decrypt data or invalid signature');
        return res.status(401).send(ResponseHelper.errorResponse('Invalid or expired encrypted data', 401));
      }
      
      // Validate required fields
      if (!decryptedData.tenant_id || !decryptedData.user_id) {
        console.log('❌ Missing required fields in decrypted data:', decryptedData);
        return res.status(401).send(ResponseHelper.errorResponse('Invalid encrypted data - missing required fields', 401));
      }
      
      // Block only if status is active (allow all non-active statuses)
      if (decryptedData.tenant_status === 'active') {
        console.log('❌ Active tenants cannot access inactive tenant endpoints:', decryptedData.tenant_status);
        return res.status(403).send(ResponseHelper.errorResponse('This endpoint is only for inactive tenants', 403));
      }
      
      // Add decrypted data to request
      req.encryptedUser = decryptedData;
      req.tenantId = decryptedData.tenant_id;
      req.userId = decryptedData.user_id;
      
      console.log('✅ EncryptedDataMiddleware.validateEncryptedData - Validation successful:', {
        tenantId: decryptedData.tenant_id,
        userId: decryptedData.user_id,
        tenantStatus: decryptedData.tenant_status,
        subscriptionStatus: decryptedData.subscription_status
      });
      
      next();
    } catch (error) {
      console.error('❌ EncryptedDataMiddleware.validateEncryptedData - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error during validation', 500));
    }
  }
  
  /**
   * Middleware untuk validate encrypted data dengan fallback ke regular auth
   * Digunakan untuk endpoints yang bisa diakses oleh active dan inactive tenants
   */
  static async validateEncryptedDataWithFallback(req, res, next) {
    try {
      console.log('🔍 EncryptedDataMiddleware.validateEncryptedDataWithFallback - Starting validation');
      
      // Try encrypted data first
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const encryptedData = authHeader.replace('Bearer ', '');
        const decryptedData = decryptSecureData(encryptedData);
        
        if (decryptedData && decryptedData.tenant_id && decryptedData.user_id) {
          console.log('✅ Using encrypted data authentication');
          req.encryptedUser = decryptedData;
          req.tenantId = decryptedData.tenant_id;
          req.userId = decryptedData.user_id;
          return next();
        }
      }
      
      // Fallback to regular authentication
      if (req.user && req.user.tenant_id) {
        console.log('✅ Using regular JWT authentication');
        req.tenantId = req.user.tenant_id;
        req.userId = req.user.id;
        return next();
      }
      
      console.log('❌ No valid authentication found');
      return res.status(401).send(ResponseHelper.errorResponse('Authentication required', 401));
      
    } catch (error) {
      console.error('❌ EncryptedDataMiddleware.validateEncryptedDataWithFallback - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error during validation', 500));
    }
  }
}

module.exports = EncryptedDataMiddleware;
