const FollowupTemplateService = require('../services/followupTemplateService');
const { ResponseHelper } = require('../helpers');

class FollowupTemplateController {
    // =====================================================
    // TEMPLATE CRUD OPERATIONS
    // =====================================================

    /**
     * Get all followup templates
     * GET /followup-templates
     */
    static async getAllTemplates(req, res) {
        try {
            const {
                search,
                is_active,
                page = 1,
                limit = 10,
                branch_id
            } = req.query;

            const tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            const filters = {
                search,
                is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const result = await FollowupTemplateService.getAllFollowupTemplates(
                tenant_id,
                user_branch_id,
                filters
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Followup templates retrieved successfully'));
        } catch (error) {
            console.error('Error getting followup templates:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get followup template by ID
     * GET /followup-templates/:id
     */
    static async getTemplateById(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const template = await FollowupTemplateService.getFollowupTemplateById(
                parseInt(id),
                tenant_id
            );

            return res.status(200).send(ResponseHelper.successResponse(template, 'Followup template retrieved successfully'));
        } catch (error) {
            console.error('Error getting followup template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Create new followup template
     * POST /followup-templates
     */
    static async createTemplate(req, res) {
        try {
            const {
                name,
                title,
                description,
                template_content,
                variables,
                is_active = true,
                is_default = false,
                branch_id
            } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).send(ResponseHelper.errorResponse('Template name is required'));
            }

            if (!title || !title.trim()) {
                return res.status(400).send(ResponseHelper.errorResponse('Template title is required'));
            }

            if (!template_content || !template_content.trim()) {
                return res.status(400).send(ResponseHelper.errorResponse('Template content is required'));
            }

            const templateData = {
                name: name.trim(),
                title: title.trim(),
                description,
                template_content: template_content.trim(),
                variables,
                is_active,
                is_default,
                branch_id: branch_id || null
            };

            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;

            const template = await FollowupTemplateService.createFollowupTemplate(
                templateData,
                tenant_id,
                user_id
            );

            return res.status(201).send(ResponseHelper.successResponse(template, 'Followup template created successfully'));
        } catch (error) {
            console.error('Error creating followup template:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Update followup template
     * PUT /followup-templates/:id
     */
    static async updateTemplate(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                title,
                description,
                template_content,
                variables,
                is_active,
                is_default,
                branch_id
            } = req.body;

            const templateData = {};
            if (name !== undefined) templateData.name = name.trim();
            if (title !== undefined) templateData.title = title.trim();
            if (description !== undefined) templateData.description = description;
            if (template_content !== undefined) templateData.template_content = template_content.trim();
            if (variables !== undefined) templateData.variables = variables;
            if (is_active !== undefined) templateData.is_active = is_active;
            if (is_default !== undefined) templateData.is_default = is_default;
            if (branch_id !== undefined) templateData.branch_id = branch_id;

            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;

            const template = await FollowupTemplateService.updateFollowupTemplate(
                parseInt(id),
                templateData,
                tenant_id,
                user_id
            );

            return res.status(200).send(ResponseHelper.successResponse(template, 'Followup template updated successfully'));
        } catch (error) {
            console.error('Error updating followup template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Delete followup template
     * DELETE /followup-templates/:id
     */
    static async deleteTemplate(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;

            const result = await FollowupTemplateService.deleteFollowupTemplate(
                parseInt(id),
                tenant_id
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Followup template deleted successfully'));
        } catch (error) {
            console.error('Error deleting followup template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // TEMPLATE TESTING & PREVIEW
    // =====================================================

    /**
     * Preview template with sample data
     * POST /followup-templates/:id/preview
     */
    static async previewTemplate(req, res) {
        try {
            const { id } = req.params;
            const { sample_data = {} } = req.body;

            const tenant_id = req.user.tenant_id;

            const preview = await FollowupTemplateService.previewTemplate(
                parseInt(id),
                tenant_id,
                sample_data
            );

            return res.status(200).send(ResponseHelper.successResponse(preview, 'Template preview generated successfully'));
        } catch (error) {
            console.error('Error previewing template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Duplicate template
     * POST /followup-templates/:id/duplicate
     */
    static async duplicateTemplate(req, res) {
        try {
            const { id } = req.params;
            const { new_name } = req.body;

            if (!new_name || !new_name.trim()) {
                return res.status(400).send(ResponseHelper.errorResponse('New template name is required'));
            }

            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;

            const template = await FollowupTemplateService.duplicateTemplate(
                parseInt(id),
                new_name.trim(),
                tenant_id,
                user_id
            );

            return res.status(201).send(ResponseHelper.successResponse(template, 'Template duplicated successfully'));
        } catch (error) {
            console.error('Error duplicating template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // UTILITY ENDPOINTS
    // =====================================================

    /**
     * Get available variables for templates
     * GET /followup-templates/variables
     */
    static async getAvailableVariables(req, res) {
        try {
            const variables = FollowupTemplateService.getAvailableVariables();

            return res.status(200).send(ResponseHelper.successResponse({
                variables: variables,
                total: variables.length,
                categories: {
                    required: variables.filter(v => v.required).length,
                    optional: variables.filter(v => !v.required).length
                }
            }, 'Available variables retrieved successfully'));
        } catch (error) {
            console.error('Error getting available variables:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get template statistics
     * GET /followup-templates/statistics
     */
    static async getTemplateStatistics(req, res) {
        try {
            const { branch_id } = req.query;
            const tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            const statistics = await FollowupTemplateService.getTemplateStatistics(
                tenant_id,
                user_branch_id
            );

            return res.status(200).send(ResponseHelper.successResponse(statistics, 'Template statistics retrieved successfully'));
        } catch (error) {
            console.error('Error getting template statistics:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Bulk operations on templates
     * POST /followup-templates/bulk
     */
    static async bulkOperations(req, res) {
        try {
            const { action, template_ids, data = {} } = req.body;

            if (!action || !template_ids || !Array.isArray(template_ids)) {
                return res.status(400).send(ResponseHelper.errorResponse('Action and template_ids are required'));
            }

            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;
            const results = [];

            for (const templateId of template_ids) {
                try {
                    let result;
                    
                    switch (action) {
                        case 'activate':
                            result = await FollowupTemplateService.updateFollowupTemplate(
                                templateId,
                                { is_active: true },
                                tenant_id,
                                user_id
                            );
                            break;
                            
                        case 'deactivate':
                            result = await FollowupTemplateService.updateFollowupTemplate(
                                templateId,
                                { is_active: false },
                                tenant_id,
                                user_id
                            );
                            break;
                            
                        case 'delete':
                            result = await FollowupTemplateService.deleteFollowupTemplate(
                                templateId,
                                tenant_id
                            );
                            break;
                            
                        default:
                            throw new Error(`Unknown action: ${action}`);
                    }
                    
                    results.push({
                        template_id: templateId,
                        success: true,
                        result: result
                    });
                    
                } catch (error) {
                    results.push({
                        template_id: templateId,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failedCount = results.length - successCount;

            return res.status(200).send(ResponseHelper.successResponse({
                action: action,
                results: results,
                summary: {
                    total: results.length,
                    success: successCount,
                    failed: failedCount
                }
            }, `Bulk ${action} completed: ${successCount}/${results.length} successful`));

        } catch (error) {
            console.error('Error in bulk operations:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Export templates
     * GET /followup-templates/export
     */
    static async exportTemplates(req, res) {
        try {
            const { format = 'json' } = req.query;
            const tenant_id = req.user.tenant_id;

            const result = await FollowupTemplateService.getAllFollowupTemplates(
                tenant_id,
                null,
                { page: 1, limit: 1000 } // Get all templates
            );

            const exportData = {
                exported_at: new Date().toISOString(),
                tenant_id: tenant_id,
                total_templates: result.templates.length,
                templates: result.templates.map(template => ({
                    name: template.name,
                    title: template.title,
                    description: template.description,
                    template_content: template.template_content,
                    variables: template.variables,
                    is_active: template.is_active,
                    is_default: template.is_default,
                    branch_id: template.branch_id
                }))
            };

            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="followup-templates.json"');
                return res.status(200).send(exportData);
            } else {
                return res.status(400).send(ResponseHelper.errorResponse('Unsupported export format'));
            }

        } catch (error) {
            console.error('Error exporting templates:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = FollowupTemplateController;
