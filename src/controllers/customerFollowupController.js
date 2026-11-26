const CustomerFollowupService = require('../services/customerFollowupService');
const ResponseHelper = require('../helpers/responseHelper');
const waGatewayHelper = require('../helpers/waGatewayHelper');
const { Customer, Branch, Tenant } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

class CustomerFollowupController {
  static async create(req, res) {
    try {
      const followupData = {
        customer_id: req.body.customer_id,
        tenant_id: req.user.tenant_id,
        branch_id: req.user.branch_id,
        message_content: req.body.message_content,
        created_by: req.user.id
      };

      const result = await CustomerFollowupService.create(followupData);
      return res.status(201).send(ResponseHelper.successResponse(result, 'Follow up berhasil disimpan'));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async getHistory(req, res) {
    try {
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const customer_id = req.query.customer_id;
      const month = req.query.month; // Format: 2024-01
      const include_statistics = req.query.include_statistics === 'true';

      const result = await CustomerFollowupService.getHistory(
        user_tenant_id, 
        user_branch_id, 
        user_role, 
        page, 
        limit, 
        customer_id,
        month,
        include_statistics
      );
      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async getFollowedUpCustomers(req, res) {
    try {
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;

      const days = parseInt(req.query.days) || 14;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await CustomerFollowupService.getFollowedUpCustomers(user_tenant_id, user_branch_id, user_role, days, page, limit);
      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async getStatistics(req, res) {
    try {
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_role = req.user.role;
      const month = req.query.month; // Format: 2024-01

      const result = await CustomerFollowupService.getStatistics(
        user_tenant_id, 
        user_branch_id, 
        user_role, 
        month
      );
      return res.status(200).send(ResponseHelper.successResponse(result));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async markAsSent(req, res) {
    try {
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = req.user.branch_id;
      const user_id = req.user.id;

      const { customer_id, message_content, template_id } = req.body;

      if (!customer_id || !message_content) {
        return res.status(400).send(ResponseHelper.errorResponse('customer_id and message_content are required', 400));
      }

      const result = await CustomerFollowupService.markAsSent({
        customer_id,
        message_content,
        template_id,
        tenant_id: user_tenant_id,
        branch_id: user_branch_id,
        created_by: user_id
      });

      return res.status(200).send(ResponseHelper.successResponse(result, 'Message marked as sent successfully'));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  }

  static async sendFollowupMessages(req, res) {
    try {
      // Handle both JSON and FormData
      let customer_ids, message_template, branch_id;
      
      if (req.body.customer_ids) {
        // FormData - customer_ids is JSON string
        customer_ids = JSON.parse(req.body.customer_ids);
        message_template = req.body.message_template;
        branch_id = req.body.branch_id;
      } else {
        // JSON
        customer_ids = req.body.customer_ids;
        message_template = req.body.message_template;
        branch_id = req.body.branch_id;
      }
      
      const user_tenant_id = req.user.tenant_id;
      const user_branch_id = branch_id || req.user.branch_id;
      const user_id = req.user.id;

      if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
        return res.status(400).send(ResponseHelper.errorResponse('customer_ids is required and must be an array', 400));
      }

      if (!message_template || !message_template.trim()) {
        return res.status(400).send(ResponseHelper.errorResponse('message_template is required', 400));
      }

      // Get branch and tenant info
      const branch = await Branch.findOne({
        where: { id: user_branch_id }
      });

      const tenant = await Tenant.findOne({
        where: { id: user_tenant_id }
      });

      if (!branch || !tenant) {
        return res.status(404).send(ResponseHelper.errorResponse('Branch or tenant not found', 404));
      }

      // Ensure WhatsApp session is active
      const sessionResult = await waGatewayHelper.ensureWhatsAppSession(user_branch_id, user_tenant_id);
      if (!sessionResult.success) {
        return res.status(500).send(ResponseHelper.errorResponse(sessionResult.message, 500));
      }

      const sessionId = sessionResult.sessionId;
      
      // Process single customer (frontend handles the loop)
      const customer_id = customer_ids[0]; // Take first customer only
      
      try {
        // Get customer data with days_since_last_order
        const sequelize = require('../config/database');
        const customerQuery = `
          SELECT 
            c.id,
            c.name,
            c.phone,
            c.email,
            c.address,
            c.gmaps,
            c.tenant_id,
            c.branch_id,
            c.createdAt,
            c.updatedAt,
            c.deletedAt,
            DATEDIFF(NOW(), MAX(od.createdAt)) as days_since_last_order
          FROM customers c
          LEFT JOIN orders o ON c.id = o.customer_id AND o.deletedAt IS NULL
          LEFT JOIN order_details od ON o.id = od.order_id AND od.deletedAt IS NULL AND od.status IN ('done', 'selesai')
          WHERE c.id = ${customer_id}
            AND c.tenant_id = ${user_tenant_id}
            AND c.branch_id = ${user_branch_id}
            AND c.deletedAt IS NULL
          GROUP BY c.id
        `;
        
        const customerResult = await sequelize.query(customerQuery, {
          type: sequelize.QueryTypes.SELECT
        });
        
        const customer = customerResult[0];

        if (!customer) {
          return res.status(404).send(ResponseHelper.errorResponse('Customer not found', 404));
        }

        // Personalize message
        const personalizedMessage = message_template
          .replace(/{customer_name}/g, customer.name)
          .replace(/{business_name}/g, tenant.business_name || 'Katsikat Laundry')
          .replace(/{branch_name}/g, branch.name)
          .replace(/{tenant_name}/g, tenant.business_name || 'Katsikat Laundry')
          .replace(/{days_since_last_order}/g, customer.days_since_last_order || '0');

        // Format phone number
        const phone = waGatewayHelper.cleanPhoneNumber(customer.phone);

        // Send WhatsApp message
        console.log(`📱 Sending follow-up to ${customer.name} (${phone})`);
        
        let waResult;
        if (req.file) {
          // Send message with file
          const fileUrl = `/public/images/followup/${req.file.filename}`;
          console.log(`📎 Sending message with file: ${req.file.filename}`);
          waResult = await waGatewayHelper.sendFollowupMessageWithFile(phone, personalizedMessage, fileUrl, sessionId);
        } else {
          // Send text message only
          waResult = await waGatewayHelper.sendFollowupMessage(phone, personalizedMessage, sessionId);
        }
        
        // Save follow-up record
        const followupData = {
          customer_id: customer.id,
          tenant_id: user_tenant_id,
          branch_id: user_branch_id,
          message_content: personalizedMessage,
          status: waResult.success ? 'sent' : 'failed',
          created_by: user_id
        };

        await CustomerFollowupService.create(followupData);

        const result = {
          customer_id: customer.id,
          customer_name: customer.name,
          phone: phone,
          success: waResult.success,
          message: waResult.message,
          wa_response: waResult
        };

            if (waResult.success) {
              console.log(`✅ Follow-up sent successfully to ${customer.name}`);
            } else {
              console.error(`❌ Failed to send follow-up to ${customer.name}: ${waResult.message}`);
            }

        return res.status(200).send(ResponseHelper.successResponse({
          summary: {
            total: 1,
            success: waResult.success ? 1 : 0,
            failed: waResult.success ? 0 : 1
          },
          results: [result],
          session_id: sessionId
        }, 'Follow-up message processed'));

        } catch (error) {
          console.error(`❌ Error processing customer ${customer_id}:`, error);
          console.error(`❌ Error details:`, error.stack);
          return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }

    } catch (error) {
      console.error('❌ Error in sendFollowupMessages:', error);
      return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
    }
  }
}

module.exports = CustomerFollowupController;
