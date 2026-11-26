const WhatsAppTemplateService = require('../services/whatsappTemplateService');
const ResponseHelper = require('../helpers/responseHelper');

class WhatsAppTemplateController {
  /**
   * Get all templates
   * GET /whatsapp-templates
   */
  static async getAllTemplates(req, res) {
    try {
      const {
        category,
        is_active,
        search,
        page = 1,
        pageSize = 10,
        tenant_id: query_tenant_id,
        branch_id: query_branch_id
      } = req.query;

      const tenant_id = query_tenant_id || req.user?.tenant_id;
      const branch_id = query_branch_id || req.user?.branch_id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const filters = {
        tenant_id,
        branch_id,
        category,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        is_system: req.query.is_system === 'true' ? true : req.query.is_system === 'false' ? false : undefined,
        search,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };

      const result = await WhatsAppTemplateService.getAllTemplates(filters);

      return res.status(200).json(
        ResponseHelper.successResponse(result, 'Templates retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting templates:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Get system templates
   * GET /whatsapp-templates/system
   */
  static async getSystemTemplates(req, res) {
    try {
      const { category } = req.query;

      const templates = await WhatsAppTemplateService.getSystemTemplates(category);

      return res.status(200).json(
        ResponseHelper.successResponse(templates, 'System templates retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting system templates:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Get available templates (system + custom) for a category
   * GET /whatsapp-templates/available/:category
   */
  static async getAvailableTemplates(req, res) {
    try {
      const { category } = req.params;
      const tenant_id = req.user?.tenant_id;
      const branch_id = req.user?.branch_id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const templates = await WhatsAppTemplateService.getAvailableTemplates(
        category, 
        tenant_id, 
        branch_id
      );

      return res.status(200).json(
        ResponseHelper.successResponse(templates, 'Available templates retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting available templates:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Get template by ID
   * GET /whatsapp-templates/:id
   */
  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.user?.tenant_id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const template = await WhatsAppTemplateService.getTemplateById(id, tenant_id);

      if (!template) {
        return res.status(404).json(
          ResponseHelper.errorResponse('Template not found')
        );
      }

      return res.status(200).json(
        ResponseHelper.successResponse(template, 'Template retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting template:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Get default template for category
   * GET /whatsapp-templates/default/:category
   */
  static async getDefaultTemplate(req, res) {
    try {
      const { category } = req.params;
      const tenant_id = req.user?.tenant_id;
      const branch_id = req.user?.branch_id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const template = await WhatsAppTemplateService.getDefaultTemplate(
        category,
        tenant_id,
        branch_id
      );

      if (!template) {
        return res.status(404).json(
          ResponseHelper.errorResponse(`No default template found for category: ${category}`)
        );
      }

      return res.status(200).json(
        ResponseHelper.successResponse(template, 'Default template retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting default template:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Create new template
   * POST /whatsapp-templates
   */
  static async createTemplate(req, res) {
    try {
      const {
        name,
        category,
        title,
        description,
        template_content,
        variables = [],
        is_active = true,
        is_default = false,
        branch_id = null
      } = req.body;

      const tenant_id = req.user?.tenant_id;
      const created_by = req.user?.id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      // Validation
      if (!name || !category || !title || !template_content) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Name, category, title, and template_content are required')
        );
      }

      const templateData = {
        name,
        category,
        title,
        description,
        template_content,
        variables,
        is_active,
        is_default,
        tenant_id,
        branch_id,
        created_by
      };

      const template = await WhatsAppTemplateService.createTemplate(templateData);

      return res.status(201).json(
        ResponseHelper.successResponse(template, 'Template created successfully')
      );
    } catch (error) {
      console.error('Error creating template:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Update template
   * PUT /whatsapp-templates/:id
   */
  static async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        category,
        title,
        description,
        template_content,
        variables,
        is_active,
        is_default,
        branch_id
      } = req.body;

      const tenant_id = req.user?.tenant_id;
      const updated_by = req.user?.id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const templateData = {
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
      };

      const template = await WhatsAppTemplateService.updateTemplate(
        id,
        templateData,
        tenant_id
      );

      return res.status(200).json(
        ResponseHelper.successResponse(template, 'Template updated successfully')
      );
    } catch (error) {
      console.error('Error updating template:', error);
      if (error.message === 'Template not found or access denied') {
        return res.status(404).json(
          ResponseHelper.errorResponse(error.message)
        );
      }
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Delete template
   * DELETE /whatsapp-templates/:id
   */
  static async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.user?.tenant_id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const result = await WhatsAppTemplateService.deleteTemplate(id, tenant_id);

      return res.status(200).json(
        ResponseHelper.successResponse(result, 'Template deleted successfully')
      );
    } catch (error) {
      console.error('Error deleting template:', error);
      if (error.message === 'Template not found or access denied') {
        return res.status(404).json(
          ResponseHelper.errorResponse(error.message)
        );
      }
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Process template with variables
   * POST /whatsapp-templates/:id/process
   */
  static async processTemplate(req, res) {
    try {
      const { id } = req.params;
      const { variables = {} } = req.body;
      const tenant_id = req.user?.tenant_id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      const result = await WhatsAppTemplateService.processTemplate(
        id,
        variables,
        tenant_id
      );

      return res.status(200).json(
        ResponseHelper.successResponse(result, 'Template processed successfully')
      );
    } catch (error) {
      console.error('Error processing template:', error);
      if (error.message === 'Template not found') {
        return res.status(404).json(
          ResponseHelper.errorResponse(error.message)
        );
      }
      if (error.message === 'Template is not active') {
        return res.status(400).json(
          ResponseHelper.errorResponse(error.message)
        );
      }
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Get available variables for category
   * GET /whatsapp-templates/variables/:category
   */
  static async getAvailableVariables(req, res) {
    try {
      const { category } = req.params;
      const variables = WhatsAppTemplateService.getAvailableVariables(category);

      return res.status(200).json(
        ResponseHelper.successResponse(variables, 'Available variables retrieved successfully')
      );
    } catch (error) {
      console.error('Error getting available variables:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }

  /**
   * Duplicate template
   * POST /whatsapp-templates/:id/duplicate
   */
  static async duplicateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, title } = req.body;
      const tenant_id = req.user?.tenant_id;
      const created_by = req.user?.id;

      if (!tenant_id) {
        return res.status(400).json(
          ResponseHelper.errorResponse('Tenant ID is required')
        );
      }

      // Get original template
      const originalTemplate = await WhatsAppTemplateService.getTemplateById(id, tenant_id);
      if (!originalTemplate) {
        return res.status(404).json(
          ResponseHelper.errorResponse('Template not found')
        );
      }

      // Create duplicate
      const templateData = {
        name: name || `${originalTemplate.name} (Copy)`,
        category: originalTemplate.category,
        title: title || `${originalTemplate.title} (Copy)`,
        description: originalTemplate.description,
        template_content: originalTemplate.template_content,
        variables: originalTemplate.variables,
        is_active: true,
        is_default: false,
        tenant_id,
        branch_id: originalTemplate.branch_id,
        created_by
      };

      const template = await WhatsAppTemplateService.createTemplate(templateData);

      return res.status(201).json(
        ResponseHelper.successResponse(template, 'Template duplicated successfully')
      );
    } catch (error) {
      console.error('Error duplicating template:', error);
      return res.status(500).json(
        ResponseHelper.errorResponse(error.message)
      );
    }
  }
}

module.exports = WhatsAppTemplateController;
