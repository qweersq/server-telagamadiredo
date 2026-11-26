const { EncryptionHelper, ResponseHelper, RoleHelper } = require('../helpers');
const UserService = require('../services/userService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRED = process.env.JWT_EXPIRED;
const JWT_EXPIRED_OPTION = process.env.JWT_EXPIRED_OPTION || 'd';

if (!JWT_SECRET || !JWT_EXPIRED || !JWT_EXPIRED_OPTION) throw new Error('JWT_SECRET or JWT_EXPIRED or JWT_EXPIRED_OPTION is not defined in .env');

class AuthMiddleware {
  static async authenticateUser(req, res, next) {
    try {
      
      let token = null;

      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
      } else if (req.query.token) {
        token = req.query.token;
      }

      if (!token) {
        return res.status(401).send(ResponseHelper.errorResponse('Token tidak ditemukan', 401));
      }

      // Validasi token khusus (misalnya: 12345 sebagai akses umum)
      if (token === 'katsikatid5740') {
        req.user = {
          id: 4, // bisa diatur default user_id untuk input pengeluaran
          name: 'hadad',
          role: 'superadmin',
          tenant_id: 1, // Tambahkan tenant_id untuk testing
          branch_id: 1 // Tambahkan branch_id untuk testing
        };
        req.token = token;
        return next();
      }

      // const authHeader = req.header('Authorization');
      // if (!authHeader || !authHeader.startsWith('Bearer ')) {
      //   return res.status(401).send(ResponseHelper.errorResponse('Authorization header is missing or invalid', 401));
      // }

      // const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, JWT_SECRET);

      const user_id = EncryptionHelper.decryptID(decoded.id);
      const user = await UserService.getById(user_id);

      if (!user) return res.status(401).send(ResponseHelper.errorResponse('User not found', 401));

      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      return res.status(401).send(ResponseHelper.errorResponse('Invalid token or authentication failed', 401));
    }
  }

  static async generateAccessToken(user) {
    const payload = {
      id: EncryptionHelper.encryptID(user.id)
    };

    const options = {
      expiresIn: `${JWT_EXPIRED}${JWT_EXPIRED_OPTION}`
    };

    return jwt.sign(payload, JWT_SECRET, options);
  }

  static allow(allowedRoleIds, requireActiveSubscription = false) {
    return async (req, res, next) => {
      try {

        if (req.token === 'katsikatid5740') {
          // Skip subscription validation untuk token khusus
          if (requireActiveSubscription) {
            console.log('🔓 Token khusus: Skipping subscription validation');
            return next();
          }
          return next();
        }
        const roleName = req.user.role;
        const role = RoleHelper.getRoleByName(roleName);

        if (!role || !allowedRoleIds.includes(role.id)) {
          return res.status(403).send(ResponseHelper.errorResponse('Forbidden', 403));
        }

        // Validasi tenant_id untuk role employee, admin, superadmin (bukan superapp-superadmin)
        if (roleName !== 'superapp-superadmin') {
          const userTenantId = req.user.tenant_id;
          const requestTenantId = req.query.tenant_id || req.body.tenant_id || req.params.tenant_id;

          // Jika request memiliki tenant_id, validasi harus cocok dengan user's tenant_id
          if (requestTenantId) {
            const parsedRequestTenantId = parseInt(requestTenantId);
            const parsedUserTenantId = parseInt(userTenantId);

            console.log('🔍 Tenant validation:', {
              userRole: roleName,
              userTenantId: parsedUserTenantId,
              requestTenantId: parsedRequestTenantId,
              requestMethod: req.method,
              requestUrl: req.originalUrl
            });

            if (parsedRequestTenantId !== parsedUserTenantId) {
              console.log('❌ Tenant validation failed:', {
                userTenantId: parsedUserTenantId,
                requestTenantId: parsedRequestTenantId
              });
              return res.status(403).send(ResponseHelper.errorResponse('Access denied: Tenant ID mismatch', 403));
            }

            console.log('✅ Tenant validation passed');
          }
        } else {
          console.log('🔓 Superapp-superadmin access: No tenant validation required');
        }

        // Add subscription validation if required
        if (requireActiveSubscription) {
          return await AuthMiddleware.validateSubscription(req, res, next);
        }

        next();
      } catch (error) {
        console.error('❌ AuthMiddleware.allow error:', error);
        return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
      }
    };
  }

  static async validateSubscription(req, res, next) {
    try {
      const user = req.user;
      
      // Skip validation untuk superapp-superadmin (role 4)
      if (user.role === 'superapp-superadmin') {
        console.log('🔓 Subscription validation skipped for superapp-superadmin');
        return next();
      }
      
      // Get fresh tenant data from database to ensure latest status
      const { Tenant } = require('../models');
      const tenant = await Tenant.findByPk(user.tenant_id);
      if (!tenant) {
        console.log('❌ Subscription validation failed: Tenant not found');
        return res.status(403).send(ResponseHelper.errorResponse('Tenant not found', 403));
      }
      
      // Check subscription status
      const subscriptionStatus = tenant.subscription_status;
      const tenantStatus = tenant.status;
      const trialEndDate = tenant.trial_end_date;
      
      console.log('🔍 Subscription validation:', {
        userId: user.id,
        tenantId: tenant.id,
        subscriptionStatus,
        tenantStatus,
        trialEndDate
      });
      
      // Check if tenant is suspended or subscription is expired
      if (tenantStatus === 'suspended' || subscriptionStatus === 'expired') {
        console.log('❌ Subscription validation failed: Tenant not active:', {
          subscriptionStatus,
          tenantStatus,
          trialEndDate
        });
        
        // Calculate days remaining for trial
        let daysRemaining = 0;
        if (trialEndDate && subscriptionStatus === 'trial') {
          const now = new Date();
          const trialEnd = new Date(trialEndDate);
          const diffTime = trialEnd - now;
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // Create secure data with signature
        const secureData = {
          user_id: user.id,
          tenant_id: user.tenant_id,
          role: user.role,
          tenant_name: tenant.business_name,
          subscription_status: subscriptionStatus,
          tenant_status: tenantStatus,
          days_remaining: daysRemaining,
          message: subscriptionStatus === 'trial' 
            ? `Trial berakhir dalam ${daysRemaining} hari` 
            : 'Subscription tidak aktif'
        };
        
        // Encrypt data dengan signature
        try {
          const encryptedData = require('../helpers/secureDataHelper').encryptSecureData(secureData);
          
          return res.status(402).send(ResponseHelper.errorResponse('Payment required', 402, {
            redirect_to: '/subscription-payment',
            encrypted_data: encryptedData
          }));
        } catch (encryptError) {
          console.error('❌ Error encrypting data:', encryptError.message);
          // Return error jika encrypt gagal
          return res.status(500).send(ResponseHelper.errorResponse('Failed to encrypt data', 500));
        }
      }
      
      // Check subscription status for active tenants
      if (subscriptionStatus === 'active') {
        console.log('✅ Subscription validation passed: Active subscription');
        return next();
      }
      
      // Check if trial is still valid
      if (subscriptionStatus === 'trial' && trialEndDate) {
        const now = new Date();
        const trialEnd = new Date(trialEndDate);
        const diffTime = trialEnd - now;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          console.log('✅ Subscription validation passed: Valid trial', {
            daysRemaining,
            trialEndDate
          });
          return next();
        } else {
          console.log('❌ Subscription validation failed: Trial expired', {
            daysRemaining,
            trialEndDate
          });
          
          // Update subscription status to expired (keep status as trial)
          try {
            await tenant.update({ 
              subscription_status: 'expired'
            });
            
            // Also update the subscription status to expired
            const SubscriptionRepository = require('../repositories/subscriptionRepository');
            const activeSubscription = await SubscriptionRepository.getActiveByTenantId(tenant.id);
            if (activeSubscription) {
              await SubscriptionRepository.update(activeSubscription.id, { status: 'expired' });
            }
            
            await tenant.reload(); // Refresh the instance
            console.log('✅ Updated subscription status to expired:', tenant.id);
          } catch (error) {
            console.error('❌ Failed to update subscription status:', error.message);
          }
          
          // Trial expired - require payment
          const secureData = {
            user_id: user.id,
            tenant_id: user.tenant_id,
            role: user.role,
            tenant_name: tenant.business_name,
            subscription_status: 'expired',
            tenant_status: 'expired',
            days_remaining: daysRemaining,
            message: 'Trial telah berakhir, silakan lakukan pembayaran'
          };
          
          try {
            const encryptedData = require('../helpers/secureDataHelper').encryptSecureData(secureData);
            
            return res.status(402).send(ResponseHelper.errorResponse('Payment required', 402, {
              redirect_to: '/subscription-payment',
              encrypted_data: encryptedData
            }));
          } catch (encryptError) {
            console.error('❌ Error encrypting data:', encryptError.message);
            return res.status(500).send(ResponseHelper.errorResponse('Failed to encrypt data', 500));
          }
        }
      }
      
      // For other subscription statuses (cancelled, suspended, etc.)
      console.log('❌ Subscription validation failed: Invalid subscription status', {
        subscriptionStatus,
        tenantStatus
      });
      
      // Generate billing for trial expired tenant BEFORE 402 error
      console.log('🔍 Debug - tenantStatus:', tenantStatus, 'subscriptionStatus:', subscriptionStatus);
      console.log('🔍 Debug - condition check:', tenantStatus === 'trial' && subscriptionStatus === 'expired');
      
      if (tenantStatus === 'trial' && subscriptionStatus === 'expired') {
        try {
          console.log('🔍 Trial expired detected in middleware, generating billing...');
          const BillingExpirationService = require('../services/billingExpirationService');
          const { Subscription } = require('../models');
          
          const trialSubscription = await Subscription.findOne({
            where: { tenant_id: user.tenant_id, status: 'active' }
          });
          
          console.log('🔍 Trial subscription found:', trialSubscription ? trialSubscription.id : 'null');
          
          const billing = await BillingExpirationService.generateBillingForExpired(tenant, trialSubscription, user, 'trial');
          console.log('🔍 Billing generated:', billing ? billing.id : 'null');
        } catch (error) {
          console.error('❌ Error generating billing for trial expired in middleware:', error.message);
        }
      }
      
      const secureData = {
        user_id: user.id,
        tenant_id: user.tenant_id,
        role: user.role,
        tenant_name: tenant.business_name,
        subscription_status: subscriptionStatus,
        tenant_status: tenantStatus,
        days_remaining: 0,
        message: 'Subscription tidak aktif, silakan lakukan pembayaran'
      };
      
      try {
        const encryptedData = require('../helpers/secureDataHelper').encryptSecureData(secureData);
        
        return res.status(402).send(ResponseHelper.errorResponse('Payment required', 402, {
          redirect_to: '/subscription-payment',
          encrypted_data: encryptedData
        }));
      } catch (encryptError) {
        console.error('❌ Error encrypting data:', encryptError.message);
        return res.status(500).send(ResponseHelper.errorResponse('Failed to encrypt data', 500));
      }
    } catch (error) {
      console.error('❌ Subscription validation error:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
    }
  }

  static async requireSuperAdmin(req, res, next) {
    try {
      if (req.user.role !== 'superapp-superadmin') {
        return res.status(403).send(ResponseHelper.errorResponse('Access denied. Superadmin role required.', 403));
      }
      next();
    } catch (error) {
      console.error('❌ Superadmin validation error:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
    }
  }
}

module.exports = AuthMiddleware;