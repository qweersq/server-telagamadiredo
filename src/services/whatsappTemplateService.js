const { WhatsAppTemplate, Tenant, Branch, User } = require('../models');
const { Op } = require('sequelize');

class WhatsAppTemplateService {
  /**
   * Get all templates with filters
   */
  static async getAllTemplates(filters = {}) {
    const {
      tenant_id,
      branch_id,
      category,
      is_active = true,
      is_system,
      search,
      page = 1,
      pageSize = 10
    } = filters;

    const whereClause = {};

    // Filter by tenant
    if (tenant_id) {
      whereClause.tenant_id = tenant_id;
    }

    // Filter by branch (null means for all branches)
    if (branch_id !== undefined) {
      whereClause[Op.or] = [
        { branch_id: branch_id },
        { branch_id: null }
      ];
    }

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by active status
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    // Filter by system status
    if (is_system !== undefined) {
      whereClause.is_system = is_system;
    }

    // Search by name or title
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * pageSize;

    const { count, rows } = await WhatsAppTemplate.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name', 'owner_name']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: offset
    });

    return {
      templates: rows,
      pagination: {
        total: count,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(count / pageSize)
      }
    };
  }

  /**
   * Get system templates by category
   */
  static async getSystemTemplates(category = null) {
    const whereClause = {
      is_system: true,
      is_active: true
    };

    if (category) {
      whereClause.category = category;
    }

    return await WhatsAppTemplate.findAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name', 'owner_name']
        }
      ],
      order: [['category', 'ASC'], ['created_at', 'ASC']]
    });
  }

  /**
   * Get available templates (system + custom) for a category
   */
  static async getAvailableTemplates(category, tenant_id, branch_id = null) {
    const whereClause = {
      [Op.or]: [
        { is_system: true }, // System templates
        { 
          tenant_id: tenant_id,
          is_system: false,
          is_active: true
        } // Custom templates for this tenant
      ],
      category: category
    };

    // Filter by branch for custom templates
    if (branch_id !== undefined) {
      whereClause[Op.or][1][Op.or] = [
        { branch_id: branch_id },
        { branch_id: null }
      ];
    }

    return await WhatsAppTemplate.findAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name', 'owner_name']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address']
        }
      ],
      order: [
        ['is_system', 'DESC'], // System templates first
        ['is_default', 'DESC'], // Default templates first
        ['created_at', 'ASC']
      ]
    });
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(id, tenant_id) {
    return await WhatsAppTemplate.findOne({
      where: {
        id: id,
        tenant_id: tenant_id
      },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name', 'owner_name']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'address']
        }
      ]
    });
  }

  /**
   * Get default template for category
   */
  static async getDefaultTemplate(category, tenant_id, branch_id = null) {
    const whereClause = {
      category: category,
      is_default: true,
      is_active: true,
      tenant_id: tenant_id
    };

    // Try to find branch-specific default first
    if (branch_id) {
      whereClause.branch_id = branch_id;
      let template = await WhatsAppTemplate.findOne({
        where: whereClause,
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'business_name', 'owner_name']
          }
        ]
      });

      if (template) return template;
    }

    // Fallback to tenant-wide default
    whereClause.branch_id = null;
    return await WhatsAppTemplate.findOne({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'business_name', 'owner_name']
        }
      ]
    });
  }

  /**
   * Create new template
   */
  static async createTemplate(templateData) {
    const {
      name,
      category,
      title,
      description,
      template_content,
      variables = [],
      is_active = true,
      is_default = false,
      is_system = false,
      tenant_id,
      branch_id = null,
      created_by
    } = templateData;

    // System templates cannot be created by users
    if (is_system) {
      throw new Error('System templates cannot be created by users');
    }

    // If this is set as default, unset other defaults for same category
    if (is_default) {
      await WhatsAppTemplate.update(
        { is_default: false },
        {
          where: {
            category: category,
            tenant_id: tenant_id,
            branch_id: branch_id,
            is_system: false // Only affect custom templates
          }
        }
      );
    }

    return await WhatsAppTemplate.create({
      name,
      category,
      title,
      description,
      template_content,
      variables,
      is_active,
      is_default,
      is_system: false, // Always false for user-created templates
      tenant_id,
      branch_id,
      created_by
    });
  }

  /**
   * Update template
   */
  static async updateTemplate(id, templateData, tenant_id) {
    const {
      name,
      category,
      title,
      description,
      template_content,
      variables,
      is_active,
      is_default,
      branch_id,
      updated_by
    } = templateData;

    // Check if template exists and is not system template
    const existingTemplate = await WhatsAppTemplate.findOne({
      where: {
        id: id,
        tenant_id: tenant_id
      }
    });

    if (!existingTemplate) {
      throw new Error('Template not found');
    }

    // System templates cannot be updated by users
    if (existingTemplate.is_system) {
      throw new Error('System templates cannot be updated');
    }

    // If this is set as default, unset other defaults for same category
    if (is_default) {
      await WhatsAppTemplate.update(
        { is_default: false },
        {
          where: {
            category: category,
            tenant_id: tenant_id,
            branch_id: branch_id,
            id: { [Op.ne]: id },
            is_system: false // Only affect custom templates
          }
        }
      );
    }

    const [affectedRows] = await WhatsAppTemplate.update(
      {
        name,
        category,
        title,
        description,
        template_content,
        variables,
        is_active,
        is_default,
        branch_id,
        updated_by
      },
      {
        where: {
          id: id,
          tenant_id: tenant_id,
          is_system: false // Only update custom templates
        }
      }
    );

    if (affectedRows === 0) {
      throw new Error('Template not found or access denied');
    }

    return await this.getTemplateById(id, tenant_id);
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id, tenant_id) {
    // Check if template exists and is not system template
    const existingTemplate = await WhatsAppTemplate.findOne({
      where: {
        id: id,
        tenant_id: tenant_id
      }
    });

    if (!existingTemplate) {
      throw new Error('Template not found');
    }

    // System templates cannot be deleted
    if (existingTemplate.is_system) {
      throw new Error('System templates cannot be deleted');
    }

    const deletedRows = await WhatsAppTemplate.destroy({
      where: {
        id: id,
        tenant_id: tenant_id,
        is_system: false // Only delete custom templates
      }
    });

    if (deletedRows === 0) {
      throw new Error('Template not found or access denied');
    }

    return { success: true, message: 'Template deleted successfully' };
  }

  /**
   * Process template with variables
   */
  static async processTemplate(templateId, variables = {}, tenant_id) {
    const template = await this.getTemplateById(templateId, tenant_id);
    
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
  }

  /**
   * Get available variables for category
   */
  static getAvailableVariables(category) {
    const commonVariables = [
      { key: 'customer_name', label: 'Nama Customer', type: 'text' },
      { key: 'customer_phone', label: 'Nomor HP Customer', type: 'phone' },
      { key: 'order_number', label: 'Nomor Order', type: 'text' },
      { key: 'tenant_name', label: 'Nama Tenant', type: 'text' },
      { key: 'branch_name', label: 'Nama Cabang', type: 'text' },
      { key: 'branch_address', label: 'Alamat Cabang', type: 'text' },
      { key: 'current_date', label: 'Tanggal Saat Ini', type: 'date' },
      { key: 'current_time', label: 'Waktu Saat Ini', type: 'time' },
      { key: 'greeting', label: 'Salam (Pagi/Siang/Sore/Malam)', type: 'text' }
    ];

    const categorySpecificVariables = {
      invoice: [
        { key: 'total_amount', label: 'Total Tagihan', type: 'currency' },
        { key: 'total_paid', label: 'Total Dibayar', type: 'currency' },
        { key: 'remaining_amount', label: 'Sisa Tagihan', type: 'currency' },
        { key: 'payment_status', label: 'Status Pembayaran', type: 'text' },
        { key: 'invoice_url', label: 'Link Invoice', type: 'url' }
      ],
      item_done: [
        { key: 'item_name', label: 'Nama Item', type: 'text' },
        { key: 'treatment_name', label: 'Nama Treatment', type: 'text' }
      ],
      delivery: [
        { key: 'delivery_type', label: 'Jenis Pengiriman', type: 'text' },
        { key: 'driver_name', label: 'Nama Driver', type: 'text' },
        { key: 'estimated_time', label: 'Estimasi Waktu', type: 'text' }
      ],
      pickup: [
        { key: 'pickup_date', label: 'Tanggal Pickup', type: 'date' },
        { key: 'pickup_time', label: 'Waktu Pickup', type: 'time' }
      ]
    };

    return [
      ...commonVariables,
      ...(categorySpecificVariables[category] || [])
    ];
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(templateId, newName, newTitle, tenant_id, created_by) {
    const originalTemplate = await WhatsAppTemplate.findOne({
      where: {
        id: templateId,
        tenant_id: tenant_id
      }
    });

    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    const duplicatedTemplate = await WhatsAppTemplate.create({
      name: newName,
      title: newTitle,
      category: originalTemplate.category,
      description: originalTemplate.description,
      template_content: originalTemplate.template_content,
      variables: originalTemplate.variables,
      is_active: false, // Duplicated templates start as inactive
      is_default: false, // Duplicated templates are not default
      tenant_id: tenant_id,
      branch_id: originalTemplate.branch_id,
      created_by: created_by
    });

    return duplicatedTemplate;
  }
}

module.exports = WhatsAppTemplateService;
