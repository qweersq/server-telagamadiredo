const ResponseHelper = require('../helpers/responseHelper');
const { SubscriptionPlan, TenantPayment, Subscription, Tenant, User } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/payment-proofs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `payment-proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

class InactiveTenantsController {
  /**
   * Get all available subscription plans
   * GET /inactive-tenants/subscription-plans
   */
  static async getSubscriptionPlans(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.getSubscriptionPlans - Fetching subscription plans');
      
      const subscriptionPlans = await SubscriptionPlan.findAll({
        where: {
          is_active: true
        },
        attributes: [
          'id', 'name', 'description', 'price', 'duration_days',
          'max_branches', 'max_users', 'max_orders_per_month', 'features'
        ],
        order: [['sort_order', 'ASC'], ['price', 'ASC']]
      });
      
      console.log('✅ InactiveTenantsController.getSubscriptionPlans - Success:', subscriptionPlans.length);
      return res.status(200).send(ResponseHelper.successResponse(subscriptionPlans, 'Subscription plans retrieved successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.getSubscriptionPlans - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
  
  /**
   * Get billing status and pending billings for tenant
   * GET /inactive-tenants/billing-status
   */
  static async getBillingStatus(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.getBillingStatus - Tenant ID:', req.tenantId);
      
      // Get tenant info
      const tenant = await Tenant.findByPk(req.tenantId);
      if (!tenant) {
        return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
      }
      
      // Get pending billings (unpaid and pending status)
      const pendingBillings = await TenantPayment.findAll({
        where: {
          tenant_id: req.tenantId,
          status: {
            [Op.in]: ['unpaid', 'pending']
          }
        },
        include: [{
          model: SubscriptionPlan,
          as: 'subscription_plan',
          attributes: ['id', 'name', 'price', 'features']
        }],
        order: [['due_date', 'ASC']]
      });
      
      // Calculate total pending amount
      const totalPendingAmount = pendingBillings.reduce((sum, billing) => {
        return sum + parseFloat(billing.amount || 0);
      }, 0);
      
      // Get current subscription info
      const currentSubscription = await Subscription.findOne({
        where: {
          tenant_id: req.tenantId,
          status: {
            [Op.in]: ['active', 'trial', 'expired']
          }
        },
        include: [{
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['id', 'name', 'price', 'features']
        }],
        order: [['createdAt', 'DESC']],
        limit: 1
      });
      
      const response = {
        tenant: {
          id: tenant.id,
          business_name: tenant.business_name,
          status: tenant.status,
          subscription_status: tenant.subscription_status,
          trial_end_date: tenant.trial_end_date
        },
        current_subscription: currentSubscription,
        pending_billings: pendingBillings,
        stats: {
          total_pending_amount: totalPendingAmount,
          pending_count: pendingBillings.length,
          days_remaining: req.encryptedUser?.days_remaining || 0
        }
      };
      
      console.log('✅ InactiveTenantsController.getBillingStatus - Success:', {
        pendingCount: pendingBillings.length,
        totalAmount: totalPendingAmount
      });
      
      return res.status(200).send(ResponseHelper.successResponse(response, 'Billing status retrieved successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.getBillingStatus - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
  
  /**
   * Get billing history for tenant
   * GET /inactive-tenants/billing-history
   */
  static async getBillingHistory(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.getBillingHistory - Tenant ID:', req.tenantId);
      
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereClause = {
        tenant_id: req.tenantId
      };
      
      if (status) {
        whereClause.status = status;
      }
      
      // Get billing history with pagination
      const { count, rows: billings } = await TenantPayment.findAndCountAll({
        where: whereClause,
        include: [{
          model: SubscriptionPlan,
          as: 'subscription_plan',
          attributes: ['id', 'name', 'price', 'features']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // Calculate stats
      const stats = await TenantPayment.findAll({
        where: { tenant_id: req.tenantId },
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total_amount']
        ],
        group: ['status']
      });
      
      const response = {
        billings: billings,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit)
        },
        stats: stats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: parseInt(stat.dataValues.count),
            total_amount: parseFloat(stat.dataValues.total_amount || 0)
          };
          return acc;
        }, {})
      };
      
      console.log('✅ InactiveTenantsController.getBillingHistory - Success:', {
        totalBillings: count,
        currentPage: page
      });
      
      return res.status(200).send(ResponseHelper.successResponse(response, 'Billing history retrieved successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.getBillingHistory - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
  
  /**
   * Change subscription plan
   * POST /inactive-tenants/change-plan
   */
  static async changePlan(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.changePlan - Tenant ID:', req.tenantId);
      
      const { plan_id, notes } = req.body;
      
      if (!plan_id) {
        return res.status(400).send(ResponseHelper.errorResponse('Plan ID is required', 400));
      }
      
      // Get subscription plan
      const subscriptionPlan = await SubscriptionPlan.findByPk(plan_id);
      if (!subscriptionPlan || !subscriptionPlan.is_active) {
        return res.status(404).send(ResponseHelper.errorResponse('Subscription plan not found or inactive', 404));
      }
      
      // Get tenant
      const tenant = await Tenant.findByPk(req.tenantId);
      if (!tenant) {
        return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
      }
      
      // Check if there are any unpaid billings
      const existingUnpaidBilling = await TenantPayment.findOne({
        where: {
          tenant_id: req.tenantId,
          status: 'unpaid'
        },
        order: [['createdAt', 'DESC']]
      });
      
      let billing;
      
      if (existingUnpaidBilling) {
        // Update existing unpaid billing with new plan and clear Tripay info
        await existingUnpaidBilling.update({
          subscription_plan_id: plan_id,
          amount: subscriptionPlan.price,
          notes: `Plan changed to ${subscriptionPlan.name} - ${notes || ''}`.trim(),
          // Clear Tripay information when changing plan
          payment_method: null,
          payment_reference: null,
          payment_gateway: null,
          payment_url: null,
          expired_at: null,
          paid_at: null
        });
        
        billing = existingUnpaidBilling;
        console.log('✅ Updated existing unpaid billing with new plan and cleared Tripay info:', billing.id);
      } else {
        // Create new subscription
        const newSubscription = await Subscription.create({
          tenant_id: req.tenantId,
          plan_id: plan_id,
          start_date: new Date(),
          end_date: new Date(Date.now() + (subscriptionPlan.duration_days * 24 * 60 * 60 * 1000)),
          status: 'pending',
          price: subscriptionPlan.price,
          final_price: subscriptionPlan.price,
          notes: notes || `Plan change to ${subscriptionPlan.name}`
        });
        
        // Generate billing for new subscription
        const invoiceNumber = `INV-${req.tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        billing = await TenantPayment.create({
          tenant_id: req.tenantId,
          subscription_id: newSubscription.id,
          subscription_plan_id: plan_id,
          amount: subscriptionPlan.price,
          status: 'unpaid',
          due_date: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
          invoice_number: invoiceNumber,
          payment_method: 'manual_bank_transfer',
          billing_period: new Date().toISOString().slice(0, 7), // YYYY-MM
          notes: `Billing untuk ganti plan ke ${subscriptionPlan.name}`,
          is_manual: true,
          created_by: req.userId
        });
        
        console.log('✅ Created new subscription and billing:', {
          subscriptionId: newSubscription.id,
          billingId: billing.id
        });
      }
      
      console.log('✅ InactiveTenantsController.changePlan - Success:', {
        billingId: billing.id,
        planName: subscriptionPlan.name,
        action: existingUnpaidBilling ? 'updated_existing' : 'created_new'
      });
      
      return res.status(200).send(ResponseHelper.successResponse({
        billing: billing,
        plan: subscriptionPlan,
        action: existingUnpaidBilling ? 'updated_existing_billing' : 'created_new_subscription_and_billing'
      }, 'Subscription plan changed successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.changePlan - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
  
  /**
   * Generate unique payment code for billing
   * POST /inactive-tenants/generate-payment-code
   */
  static async generatePaymentCode(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.generatePaymentCode - Tenant ID:', req.tenantId);
      
      const { billing_id } = req.body;
      
      if (!billing_id) {
        return res.status(400).send(ResponseHelper.errorResponse('Billing ID is required', 400));
      }
      
      // Get billing with subscription plan
      const billing = await TenantPayment.findOne({
        where: {
          id: billing_id,
          tenant_id: req.tenantId,
          status: 'unpaid'
        },
        include: [{
          model: SubscriptionPlan,
          as: 'subscription_plan'
        }]
      });
      
      if (!billing) {
        return res.status(404).send(ResponseHelper.errorResponse('Billing not found or already paid', 404));
      }
      
      // Generate unique payment code (101-499, no zeros)
      const generateUniquePaymentCode = () => {
        const min = 101;
        const max = 499;
        
        // Generate random number between 101-499
        let code = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Ensure no zeros in the code
        while (code.toString().includes('0')) {
          code = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        return code.toString();
      };
      
      // Get original amount from subscription plan (always use base price from plan)
      const originalAmount = parseFloat(billing.subscription_plan.price);
      
      // Generate payment code that will be the last 3 digits of final amount
      const paymentCode = generateUniquePaymentCode();
      
      // Calculate final amount: original amount + payment code
      const finalAmount = originalAmount + parseInt(paymentCode);
      
      // Update billing with payment code and final amount
      await billing.update({
        payment_code: paymentCode,
        amount: finalAmount.toString()
      });
      
      console.log('✅ InactiveTenantsController.generatePaymentCode - Success:', {
        billingId: billing.id,
        originalAmount: originalAmount,
        paymentCode: paymentCode,
        finalAmount: finalAmount
      });
      
      return res.status(200).send(ResponseHelper.successResponse({
        billing_id: billing.id,
        original_amount: originalAmount.toFixed(2),
        payment_code: paymentCode,
        final_amount: finalAmount.toFixed(2),
        formatted_amount: `(${finalAmount.toLocaleString('id-ID')})`,
        base_amount: originalAmount.toFixed(2)
      }, 'Payment code generated successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.generatePaymentCode - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }

  /**
   * Submit payment proof
   * POST /inactive-tenants/submit-payment
   */
  static async submitPayment(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.submitPayment - Tenant ID:', req.tenantId);
      
      const { billing_id, bank_name, account_number, account_holder, amount, notes } = req.body;
      
      if (!billing_id) {
        return res.status(400).send(ResponseHelper.errorResponse('Billing ID is required', 400));
      }
      
      // Get billing
      const billing = await TenantPayment.findOne({
        where: {
          id: billing_id,
          tenant_id: req.tenantId,
          status: 'unpaid'
        }
      });
      
      if (!billing) {
        return res.status(404).send(ResponseHelper.errorResponse('Billing not found or already paid', 404));
      }
      
      // Update billing with payment info
      await billing.update({
        status: 'pending',
        payment_method: 'manual_bank_transfer',
        bank_name: bank_name,
        account_number: account_number,
        account_holder: account_holder,
        payment_notes: notes,
        paid_at: new Date()
      });
      
      console.log('✅ InactiveTenantsController.submitPayment - Success:', {
        billingId: billing.id,
        status: 'pending'
      });
      
      return res.status(200).send(ResponseHelper.successResponse({
        billing: billing,
        message: 'Payment proof submitted successfully. Please wait for admin confirmation.'
      }, 'Payment submitted successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.submitPayment - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
  
  /**
   * Check payment status
   * GET /inactive-tenants/payment-status/:billing_id
   */
  static async checkPaymentStatus(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.checkPaymentStatus - Billing ID:', req.params.billing_id);
      
      const billing = await TenantPayment.findOne({
        where: {
          id: req.params.billing_id,
          tenant_id: req.tenantId
        },
        include: [{
          model: SubscriptionPlan,
          as: 'subscription_plan',
          attributes: ['id', 'name', 'price', 'features']
        }]
      });
      
      if (!billing) {
        return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
      }
      
      console.log('✅ InactiveTenantsController.checkPaymentStatus - Success:', {
        billingId: billing.id,
        status: billing.status
      });
      
      return res.status(200).send(ResponseHelper.successResponse(billing, 'Payment status retrieved successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.checkPaymentStatus - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
  
  /**
   * Get tenant status and subscription info
   * GET /inactive-tenants/status
   */
  static async getTenantStatus(req, res) {
    try {
      console.log('🔍 InactiveTenantsController.getTenantStatus - Tenant ID:', req.tenantId);
      
      // Get tenant info
      const tenant = await Tenant.findByPk(req.tenantId);
      if (!tenant) {
        return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
      }
      
      // Get current subscription
      const currentSubscription = await Subscription.findOne({
        where: {
          tenant_id: req.tenantId
        },
        include: [{
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['id', 'name', 'price', 'features', 'max_users', 'max_branches']
        }],
        order: [['createdAt', 'DESC']],
        limit: 1
      });
      
      // Get user info
      const user = await User.findByPk(req.userId);
      
      const response = {
        tenant: {
          id: tenant.id,
          business_name: tenant.business_name,
          owner_name: tenant.owner_name,
          email: tenant.email,
          phone: tenant.phone,
          status: tenant.status,
          subscription_status: tenant.subscription_status,
          trial_end_date: tenant.trial_end_date,
          created_at: tenant.createdAt
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        subscription: currentSubscription,
        encrypted_data: req.encryptedUser
      };
      
      console.log('✅ InactiveTenantsController.getTenantStatus - Success');
      
      return res.status(200).send(ResponseHelper.successResponse(response, 'Tenant status retrieved successfully'));
      
    } catch (error) {
      console.error('❌ InactiveTenantsController.getTenantStatus - Error:', error);
      return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
    }
  }
}

module.exports = { InactiveTenantsController, upload };
