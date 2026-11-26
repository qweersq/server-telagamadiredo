const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');
const { EncryptionHelper } = require('../helpers');

class BillingValidationMiddleware {
    /**
     * Authenticate using JWT token
     * For all billing validation operations
     */
    static async authenticateWithJWT(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    statusCode: 401,
                    error: {
                        message: 'Authorization header missing or invalid'
                    }
                });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Decrypt the user ID
                const userId = EncryptionHelper.decryptID(decoded.id);
                
                // Get user data
                const user = await User.findByPk(userId, {
                    include: [{
                        model: Tenant,
                        as: 'tenant'
                    }]
                });

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        statusCode: 401,
                        error: {
                            message: 'User not found'
                        }
                    });
                }

                // Check if user has tenant
                if (!user.tenant_id) {
                    return res.status(403).json({
                        success: false,
                        statusCode: 403,
                        error: {
                            message: 'User has no associated tenant'
                        }
                    });
                }

                // Add user and tenant to request
                req.user = user;
                req.tenant = user.tenant;

                console.log('✅ BillingValidationMiddleware.authenticateWithJWT - Success:', {
                    user_id: user.id,
                    tenant_id: user.tenant_id,
                    tenant_status: user.tenant?.status
                });

                next();
            } catch (jwtError) {
                console.error('❌ BillingValidationMiddleware.authenticateWithJWT - JWT Error:', jwtError.message);
                return res.status(401).json({
                    success: false,
                    statusCode: 401,
                    error: {
                        message: 'Invalid or expired token'
                    }
                });
            }
        } catch (error) {
            console.error('❌ BillingValidationMiddleware.authenticateWithJWT - Error:', error);
            return res.status(500).json({
                success: false,
                statusCode: 500,
                error: {
                    message: 'Internal server error'
                }
            });
        }
    }
}

module.exports = BillingValidationMiddleware;
