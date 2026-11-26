const { WhatsAppTemplate } = require('../models');
const { Op } = require('sequelize');

// Helper function untuk mendapatkan template hardcoded berdasarkan kategori
function getHardcodedTemplateContent(category) {
  const templates = {
    invoice_paid: {
      content: `{{greeting}} Kak {{customer_name}} 👋

Terima kasih sudah menggunakan layanan {{tenant_name}}! 🙏

Invoice #{{order_number}} sudah lunas sebesar {{total_payment}}.

Terima kasih! ✨`,
      variables: ['greeting', 'customer_name', 'tenant_name', 'order_number', 'total_payment']
    },
    
    invoice_dp: {
      content: `{{greeting}} Kak {{customer_name}} 👋

Terima kasih sudah menggunakan layanan {{tenant_name}}! 🙏

Invoice #{{order_number}} sudah dibayar sebesar {{paid_amount}} dari total {{total_amount}}.

Sisa pembayaran: {{remaining_amount}}

Terima kasih! ✨`,
      variables: ['greeting', 'customer_name', 'tenant_name', 'order_number', 'paid_amount', 'total_amount', 'remaining_amount']
    },
    
    invoice_unpaid: {
      content: `{{greeting}} Kak {{customer_name}} 👋

Terima kasih sudah menggunakan layanan {{tenant_name}}! 🙏

Berikut detail invoice untuk pesanan #{{order_number}}:

💵 Total Harga: {{total_amount}}

Mohon lakukan pembayaran jika belum dibayar:
💳 DP minimal 50% dari total tagihan

Kakak bisa cek detail lengkap pesanan melalui link berikut ya:
{{invoice_url}}

Kalau ada pertanyaan atau butuh bantuan, silakan hubungi kami.

Semoga hari Kakak menyenangkan!✨

Salam hangat,
*{{tenant_name}}*`,
      variables: ['greeting', 'customer_name', 'tenant_name', 'order_number', 'total_amount', 'invoice_url']
    }
  };
  
  return templates[category] || templates.invoice_unpaid;
}

class InvoiceTemplateService {
  /**
   * Get invoice template berdasarkan payment status dan branch
   */
  static async getInvoiceTemplate(tenantId, branchId, paymentStatus) {
    try {
      // Tentukan kategori berdasarkan payment status
      let category;
      if (paymentStatus === 'paid' || paymentStatus === 'lunas') {
        category = 'invoice_paid';
      } else if (paymentStatus === 'partial' || paymentStatus === 'dp') {
        category = 'invoice_dp';
      } else {
        category = 'invoice_unpaid';
      }

      // Query template dengan prioritas: branch-specific > tenant-wide > system
      const template = await WhatsAppTemplate.findOne({
        where: {
          category: category,
          is_active: true,
          [Op.or]: [
            // Branch-specific template
            {
              tenant_id: tenantId,
              branch_id: branchId,
              is_system: false
            },
            // Tenant-wide template
            {
              tenant_id: tenantId,
              branch_id: null,
              is_system: false
            },
            // System default template
            {
              is_system: true,
              branch_id: null
            }
          ]
        },
        order: [
          // Prioritas: branch-specific > tenant-wide > system
          ['branch_id', 'ASC'],
          ['is_system', 'ASC'],
          ['is_default', 'DESC'],
          ['created_at', 'ASC']
        ]
      });

      return template;
    } catch (error) {
      console.error('❌ InvoiceTemplateService.getInvoiceTemplate - Error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get template by category (untuk API endpoint)
   */
  static async getTemplateByCategory(tenantId, branchId, category) {
    try {
      // Query template dengan prioritas: branch-specific > tenant-wide > system
      const template = await WhatsAppTemplate.findOne({
        where: {
          category: category,
          is_active: true,
          [Op.or]: [
            // Branch-specific template
            {
              tenant_id: tenantId,
              branch_id: branchId,
              is_system: false
            },
            // Tenant-wide template
            {
              tenant_id: tenantId,
              branch_id: null,
              is_system: false
            },
            // System default template
            {
              is_system: true,
              branch_id: null
            }
          ]
        },
        order: [
          // Prioritas: branch-specific > tenant-wide > system
          ['branch_id', 'DESC'], // NULL values last, specific branch_id first
          ['is_system', 'ASC'], // false (custom) before true (system)
          ['is_default', 'DESC'], // true (default) before false
          ['created_at', 'ASC']
        ]
      });

      // Jika tidak ada template branch-specific, auto-generate dari system default
      if (template && template.branch_id !== branchId) {
        console.log(`🔄 Auto-generating template for branch ${branchId}, category ${category}`);
        
        // Cek dulu apakah sudah ada template branch-specific
        const existingBranchTemplate = await WhatsAppTemplate.findOne({
          where: {
            category: category,
            tenant_id: tenantId,
            branch_id: branchId,
            is_active: true
          }
        });

        if (existingBranchTemplate) {
          console.log(`✅ Found existing branch template ID: ${existingBranchTemplate.id}`);
          return existingBranchTemplate;
        }
        
        // Generate template baru berdasarkan format hardcoded yang sudah ada
        const hardcodedTemplate = getHardcodedTemplateContent(category);
        
        const newTemplate = await WhatsAppTemplate.create({
          name: `${category}_branch_${branchId}`,
          category: category,
          title: `Template ${category} - Branch ${branchId}`,
          description: `Template untuk ${category} branch ${branchId}`,
          template_content: hardcodedTemplate.content,
          variables: hardcodedTemplate.variables,
          is_active: true,
          is_default: false,
          is_system: false,
          tenant_id: tenantId,
          branch_id: branchId,
          created_by: 1, // System user
          updated_by: 1
        });

        console.log(`✅ Auto-generated template ID: ${newTemplate.id}`);
        return newTemplate;
      }

      return template;
    } catch (error) {
      console.error('❌ InvoiceTemplateService.getTemplateByCategory - Error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Process template dengan variables
   */
  static async processInvoiceTemplate(templateId, variables = {}) {
    try {
      const template = await WhatsAppTemplate.findByPk(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.is_active) {
        throw new Error('Template is not active');
      }

      let processedContent = template.template_content;

      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || '');
      }

      return {
        template: template,
        processed_content: processedContent,
        variables_used: variables
      };
    } catch (error) {
      console.error('❌ InvoiceTemplateService.processInvoiceTemplate - Error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get available variables untuk invoice templates
   */
  static getInvoiceVariables() {
    return [
      { key: 'customer_name', label: 'Nama Customer', type: 'text', required: true },
      { key: 'tenant_name', label: 'Nama Bisnis', type: 'text', required: true },
      { key: 'order_number', label: 'Nomor Order', type: 'text', required: true },
      { key: 'total_amount', label: 'Total Tagihan', type: 'currency', required: true },
      { key: 'paid_amount', label: 'Jumlah Dibayar', type: 'currency', required: false },
      { key: 'remaining_amount', label: 'Sisa Tagihan', type: 'currency', required: false },
      { key: 'total_payment', label: 'Total Pembayaran', type: 'currency', required: false },
      { key: 'invoice_url', label: 'Link Invoice', type: 'url', required: true },
      { key: 'greeting', label: 'Salam', type: 'text', required: false }
    ];
  }

  /**
   * Create atau update invoice template untuk branch
   */
  static async createOrUpdateBranchTemplate(tenantId, branchId, category, templateData, userId) {
    try {
      const [template, created] = await WhatsAppTemplate.findOrCreate({
        where: {
          tenant_id: tenantId,
          branch_id: branchId,
          category: category
        },
        defaults: {
          name: `${category}_branch_${branchId}`,
          title: templateData.title,
          description: templateData.description,
          template_content: templateData.template_content,
          variables: templateData.variables || [],
          is_active: true,
          is_default: false,
          is_system: false,
          created_by: userId
        }
      });

      if (!created) {
        // Update existing template
        await template.update({
          title: templateData.title,
          description: templateData.description,
          template_content: templateData.template_content,
          variables: templateData.variables || [],
          is_active: templateData.is_active !== undefined ? templateData.is_active : true,
          updated_by: userId
        });
      }

      return template;
    } catch (error) {
      console.error('❌ InvoiceTemplateService.createOrUpdateBranchTemplate - Error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get all invoice templates untuk branch
   */
  static async getBranchInvoiceTemplates(tenantId, branchId) {
    try {
      const templates = await WhatsAppTemplate.findAll({
        where: {
          tenant_id: tenantId,
          branch_id: branchId,
          category: {
            [Op.in]: ['invoice_paid', 'invoice_dp', 'invoice_unpaid']
          },
          is_active: true
        },
        order: [['category', 'ASC']]
      });

      return templates;
    } catch (error) {
      console.error('❌ InvoiceTemplateService.getBranchInvoiceTemplates - Error:', error);
      throw new Error(error.message);
    }
  }
}

module.exports = InvoiceTemplateService;
