const InvoiceTemplateService = require('../services/invoiceTemplateService');
const { ResponseHelper } = require('../helpers');

class InvoiceTemplateController {
  /**
   * Get invoice templates untuk branch
   * GET /api/invoice-templates/branch/:branchId
   */
  static async getBranchTemplates(req, res) {
    try {
      const { branchId } = req.params;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(400).json(ResponseHelper.errorResponse('Tenant ID is required'));
      }

      const templates = await InvoiceTemplateService.getBranchInvoiceTemplates(tenantId, branchId);

      return res.status(200).json(ResponseHelper.successResponse({
        templates: templates,
        message: 'Invoice templates retrieved successfully'
      }));
    } catch (error) {
      console.error('❌ InvoiceTemplateController.getBranchTemplates - Error:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get template berdasarkan kategori dan branch
   * GET /api/invoice-templates/template/:branchId/:category
   */
  static async getTemplateByCategory(req, res) {
    try {
      const { branchId, category } = req.params;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        return res.status(400).json(ResponseHelper.errorResponse('Tenant ID is required'));
      }

      // Validasi kategori
      const validCategories = ['invoice_paid', 'invoice_dp', 'invoice_unpaid'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(ResponseHelper.errorResponse('Invalid category'));
      }

      const template = await InvoiceTemplateService.getTemplateByCategory(tenantId, branchId, category);

      if (!template) {
        return res.status(404).json(ResponseHelper.errorResponse('Template not found'));
      }

      return res.status(200).json(ResponseHelper.successResponse({
        template: template,
        message: 'Template retrieved successfully'
      }));
    } catch (error) {
      console.error('❌ InvoiceTemplateController.getTemplateByCategory - Error:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Create atau update template untuk branch
   * POST /api/invoice-templates/branch/:branchId
   */
  static async createOrUpdateTemplate(req, res) {
    try {
      const { branchId } = req.params;
      const { category, title, description, template_content, variables, is_active } = req.body;
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id;

      if (!tenantId) {
        return res.status(400).json(ResponseHelper.errorResponse('Tenant ID is required'));
      }

      if (!category || !title || !template_content) {
        return res.status(400).json(ResponseHelper.errorResponse('Category, title, and template_content are required'));
      }

      // Validasi kategori
      const validCategories = ['invoice_paid', 'invoice_dp', 'invoice_unpaid'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(ResponseHelper.errorResponse('Invalid category'));
      }

      const templateData = {
        title,
        description,
        template_content,
        variables: variables || [],
        is_active: is_active !== undefined ? is_active : true
      };

      const template = await InvoiceTemplateService.createOrUpdateBranchTemplate(
        tenantId, 
        branchId, 
        category, 
        templateData, 
        userId
      );

      return res.status(200).json(ResponseHelper.successResponse({
        template: template,
        message: 'Template saved successfully'
      }));
    } catch (error) {
      console.error('❌ InvoiceTemplateController.createOrUpdateTemplate - Error:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Preview template dengan variables
   * POST /api/invoice-templates/preview
   */
  static async previewTemplate(req, res) {
    try {
      const { template_content, variables } = req.body;

      if (!template_content) {
        return res.status(400).json(ResponseHelper.errorResponse('Template content is required'));
      }

      let processedContent = template_content;

      // Replace variables in template
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || '');
        }
      }

      return res.status(200).json(ResponseHelper.successResponse({
        processed_content: processedContent,
        message: 'Template preview generated successfully'
      }));
    } catch (error) {
      console.error('❌ InvoiceTemplateController.previewTemplate - Error:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Get available variables untuk invoice templates
   * GET /api/invoice-templates/variables
   */
  static async getAvailableVariables(req, res) {
    try {
      const variables = InvoiceTemplateService.getInvoiceVariables();

      return res.status(200).json(ResponseHelper.successResponse({
        variables: variables,
        message: 'Available variables retrieved successfully'
      }));
    } catch (error) {
      console.error('❌ InvoiceTemplateController.getAvailableVariables - Error:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }

  /**
   * Test template dengan sample data
   * POST /api/invoice-templates/test
   */
  static async testTemplate(req, res) {
    try {
      const { template_content, category } = req.body;

      if (!template_content || !category) {
        return res.status(400).json(ResponseHelper.errorResponse('Template content and category are required'));
      }

      // Sample data berdasarkan kategori
      let sampleVariables = {
        customer_name: 'John Doe',
        tenant_name: 'Katsikat Laundry',
        order_number: 'KAT250124001',
        total_amount: 'Rp 150.000',
        invoice_url: 'https://katsikat.id/invoice/abc123',
        greeting: 'Selamat pagi'
      };

      if (category === 'invoice_paid') {
        sampleVariables.total_payment = 'Rp 150.000';
      } else if (category === 'invoice_dp') {
        sampleVariables.paid_amount = 'Rp 75.000';
        sampleVariables.remaining_amount = 'Rp 75.000';
      }

      let processedContent = template_content;

      // Replace variables in template
      for (const [key, value] of Object.entries(sampleVariables)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || '');
      }

      return res.status(200).json(ResponseHelper.successResponse({
        processed_content: processedContent,
        sample_variables: sampleVariables,
        message: 'Template test completed successfully'
      }));
    } catch (error) {
      console.error('❌ InvoiceTemplateController.testTemplate - Error:', error);
      return res.status(500).json(ResponseHelper.errorResponse(error.message));
    }
  }
}

module.exports = InvoiceTemplateController;
