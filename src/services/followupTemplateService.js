const { WhatsAppTemplate, Tenant, Branch, User } = require('../models');
const { Op } = require('sequelize');

class FollowupTemplateService {
    // =====================================================
    // TEMPLATE CRUD OPERATIONS
    // =====================================================

    static async getAllFollowupTemplates(tenant_id, branch_id = null, filters = {}) {
        try {
            const {
                search,
                is_active,
                page = 1,
                limit = 10
            } = filters;

            const whereClause = {
                category: 'followup',
                tenant_id: tenant_id
            };

            // Filter by branch (null means for all branches)
            if (branch_id !== undefined) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { branch_id: null }
                ];
            }

            // Filter by active status
            if (is_active !== undefined) {
                whereClause.is_active = is_active;
            }

            // Search by name or title
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { title: { [Op.like]: `%${search}%` } }
                ];
            }

            const offset = (page - 1) * limit;

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
                limit: limit,
                offset: offset
            });

            return {
                templates: rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(count / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Failed to get followup templates: ${error.message}`);
        }
    }

    static async getFollowupTemplateById(id, tenant_id) {
        try {
            const template = await WhatsAppTemplate.findOne({
                where: {
                    id: id,
                    category: 'followup',
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
                    },
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });

            if (!template) {
                throw new Error('Follow-up template not found');
            }

            return template;
        } catch (error) {
            throw new Error(`Failed to get followup template: ${error.message}`);
        }
    }

    static async createFollowupTemplate(templateData, tenant_id, user_id) {
        try {
            // Validate required fields
            const requiredFields = ['name', 'title', 'template_content'];
            for (const field of requiredFields) {
                if (!templateData[field] || !templateData[field].trim()) {
                    throw new Error(`${field} is required`);
                }
            }

            // Check if template name already exists for this tenant
            const existingTemplate = await WhatsAppTemplate.findOne({
                where: {
                    name: templateData.name,
                    category: 'followup',
                    tenant_id: tenant_id
                }
            });

            if (existingTemplate) {
                throw new Error('Template name already exists for this tenant');
            }

            // Default variables for follow-up templates
            const defaultVariables = [
                'customer_name',
                'business_name', 
                'branch_name',
                'days_since_last_order',
                'last_order_date',
                'total_orders'
            ];

            const dataToCreate = {
                name: templateData.name.trim(),
                category: 'followup',
                title: templateData.title.trim(),
                description: templateData.description || null,
                template_content: templateData.template_content.trim(),
                variables: templateData.variables || defaultVariables,
                is_active: templateData.is_active !== undefined ? templateData.is_active : true,
                is_default: templateData.is_default || false,
                is_system: false, // User templates are never system templates
                tenant_id: tenant_id,
                branch_id: templateData.branch_id || null,
                created_by: user_id,
                updated_by: user_id
            };

            // If this is set as default, unset other defaults
            if (dataToCreate.is_default) {
                await this.unsetDefaultTemplates(tenant_id, templateData.branch_id);
            }

            const template = await WhatsAppTemplate.create(dataToCreate);
            
            return await this.getFollowupTemplateById(template.id, tenant_id);
        } catch (error) {
            throw new Error(`Failed to create followup template: ${error.message}`);
        }
    }

    static async updateFollowupTemplate(id, templateData, tenant_id, user_id) {
        try {
            // Check if template exists and belongs to tenant
            const existingTemplate = await WhatsAppTemplate.findOne({
                where: {
                    id: id,
                    category: 'followup',
                    tenant_id: tenant_id
                }
            });

            if (!existingTemplate) {
                throw new Error('Follow-up template not found or access denied');
            }

            // System templates cannot be updated by users
            if (existingTemplate.is_system) {
                throw new Error('System templates cannot be updated');
            }

            // Check name uniqueness if name is being changed
            if (templateData.name && templateData.name !== existingTemplate.name) {
                const duplicateName = await WhatsAppTemplate.findOne({
                    where: {
                        name: templateData.name,
                        category: 'followup',
                        tenant_id: tenant_id,
                        id: { [Op.ne]: id }
                    }
                });

                if (duplicateName) {
                    throw new Error('Template name already exists for this tenant');
                }
            }

            const updateData = {
                updated_by: user_id
            };

            // Only update provided fields
            if (templateData.name !== undefined) updateData.name = templateData.name.trim();
            if (templateData.title !== undefined) updateData.title = templateData.title.trim();
            if (templateData.description !== undefined) updateData.description = templateData.description;
            if (templateData.template_content !== undefined) updateData.template_content = templateData.template_content.trim();
            if (templateData.variables !== undefined) updateData.variables = templateData.variables;
            if (templateData.is_active !== undefined) updateData.is_active = templateData.is_active;
            if (templateData.is_default !== undefined) updateData.is_default = templateData.is_default;
            if (templateData.branch_id !== undefined) updateData.branch_id = templateData.branch_id;

            // If this is set as default, unset other defaults
            if (updateData.is_default) {
                await this.unsetDefaultTemplates(tenant_id, updateData.branch_id, id);
            }

            const [affectedRows] = await WhatsAppTemplate.update(
                updateData,
                {
                    where: {
                        id: id,
                        category: 'followup',
                        tenant_id: tenant_id
                    }
                }
            );

            if (affectedRows === 0) {
                throw new Error('No changes were made to the template');
            }

            return await this.getFollowupTemplateById(id, tenant_id);
        } catch (error) {
            throw new Error(`Failed to update followup template: ${error.message}`);
        }
    }

    static async deleteFollowupTemplate(id, tenant_id) {
        try {
            // Check if template exists and belongs to tenant
            const existingTemplate = await WhatsAppTemplate.findOne({
                where: {
                    id: id,
                    category: 'followup',
                    tenant_id: tenant_id
                }
            });

            if (!existingTemplate) {
                throw new Error('Follow-up template not found or access denied');
            }

            // System templates cannot be deleted
            if (existingTemplate.is_system) {
                throw new Error('System templates cannot be deleted');
            }

            // Check if template is being used in any active sequences
            const sequelize = require('../config/database');
            const usageCheck = await sequelize.query(`
                SELECT COUNT(*) as usage_count
                FROM followup_sequence_templates fst
                INNER JOIN followup_sequences fs ON fst.sequence_id = fs.id
                WHERE fst.template_id = ${id}
                    AND fst.is_active = 1
                    AND fs.is_active = 1
                    AND fs.tenant_id = ${tenant_id}
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            if (usageCheck[0].usage_count > 0) {
                throw new Error('Cannot delete template that is being used in active sequences');
            }

            const deletedRows = await WhatsAppTemplate.destroy({
                where: {
                    id: id,
                    category: 'followup',
                    tenant_id: tenant_id,
                    is_system: false
                }
            });

            if (deletedRows === 0) {
                throw new Error('Template not found or cannot be deleted');
            }

            return { success: true, message: 'Follow-up template deleted successfully' };
        } catch (error) {
            throw new Error(`Failed to delete followup template: ${error.message}`);
        }
    }

    // =====================================================
    // TEMPLATE TESTING & PREVIEW
    // =====================================================

    static async previewTemplate(id, tenant_id, sampleData = {}) {
        try {
            const template = await this.getFollowupTemplateById(id, tenant_id);

            // Default sample data for preview
            const defaultSampleData = {
                customer_name: 'John Doe',
                business_name: 'Katsikat Laundry',
                branch_name: 'Main Branch',
                days_since_last_order: '15',
                last_order_date: '2025-09-14',
                total_orders: '3',
                promo_code: 'WELCOME20',
                customer_tier: 'Gold'
            };

            const previewData = { ...defaultSampleData, ...sampleData };

            // Process template with sample data
            let processedContent = template.template_content;
            
            // Replace variables in template
            for (const [key, value] of Object.entries(previewData)) {
                const placeholder = `{${key}}`;
                processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || '');
            }

            return {
                template: {
                    id: template.id,
                    name: template.name,
                    title: template.title,
                    original_content: template.template_content,
                    variables: template.variables
                },
                preview: {
                    processed_content: processedContent,
                    sample_data_used: previewData,
                    character_count: processedContent.length,
                    estimated_message_count: Math.ceil(processedContent.length / 160) // SMS standard
                }
            };
        } catch (error) {
            throw new Error(`Failed to preview template: ${error.message}`);
        }
    }

    static async duplicateTemplate(id, newName, tenant_id, user_id) {
        try {
            const originalTemplate = await this.getFollowupTemplateById(id, tenant_id);

            // Check if new name already exists
            const existingTemplate = await WhatsAppTemplate.findOne({
                where: {
                    name: newName,
                    category: 'followup',
                    tenant_id: tenant_id
                }
            });

            if (existingTemplate) {
                throw new Error('Template name already exists for this tenant');
            }

            const duplicateData = {
                name: newName,
                title: `${originalTemplate.title} (Copy)`,
                description: originalTemplate.description,
                template_content: originalTemplate.template_content,
                variables: originalTemplate.variables,
                is_active: false, // Start as inactive
                is_default: false, // Never default
                branch_id: originalTemplate.branch_id
            };

            return await this.createFollowupTemplate(duplicateData, tenant_id, user_id);
        } catch (error) {
            throw new Error(`Failed to duplicate template: ${error.message}`);
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    static async unsetDefaultTemplates(tenant_id, branch_id, excludeId = null) {
        try {
            const whereClause = {
                category: 'followup',
                tenant_id: tenant_id,
                branch_id: branch_id,
                is_system: false
            };

            if (excludeId) {
                whereClause.id = { [Op.ne]: excludeId };
            }

            await WhatsAppTemplate.update(
                { is_default: false },
                { where: whereClause }
            );
        } catch (error) {
            console.error('Error unsetting default templates:', error);
        }
    }

    static getAvailableVariables() {
        return [
            { key: 'customer_name', label: 'Nama Customer', type: 'text', required: true },
            { key: 'business_name', label: 'Nama Bisnis', type: 'text', required: true },
            { key: 'branch_name', label: 'Nama Cabang', type: 'text', required: true },
            { key: 'days_since_last_order', label: 'Hari Sejak Order Terakhir', type: 'number', required: false },
            { key: 'last_order_date', label: 'Tanggal Order Terakhir', type: 'date', required: false },
            { key: 'total_orders', label: 'Total Order Customer', type: 'number', required: false },
            { key: 'customer_phone', label: 'Nomor HP Customer', type: 'phone', required: false },
            { key: 'promo_code', label: 'Kode Promo', type: 'text', required: false },
            { key: 'customer_tier', label: 'Tier Customer', type: 'text', required: false },
            { key: 'branch_phone', label: 'Nomor Telepon Cabang', type: 'phone', required: false },
            { key: 'branch_address', label: 'Alamat Cabang', type: 'text', required: false },
            { key: 'current_date', label: 'Tanggal Saat Ini', type: 'date', required: false },
            { key: 'current_time', label: 'Waktu Saat Ini', type: 'time', required: false }
        ];
    }

    static async getTemplateStatistics(tenant_id, branch_id = null) {
        try {
            const whereClause = {
                category: 'followup',
                tenant_id: tenant_id
            };

            if (branch_id) {
                whereClause[Op.or] = [
                    { branch_id: branch_id },
                    { branch_id: null }
                ];
            }

            const totalTemplates = await WhatsAppTemplate.count({
                where: whereClause
            });

            const activeTemplates = await WhatsAppTemplate.count({
                where: { ...whereClause, is_active: true }
            });

            const defaultTemplate = await WhatsAppTemplate.findOne({
                where: { ...whereClause, is_default: true },
                attributes: ['id', 'name', 'title']
            });

            return {
                total_templates: totalTemplates,
                active_templates: activeTemplates,
                inactive_templates: totalTemplates - activeTemplates,
                default_template: defaultTemplate,
                activation_rate: totalTemplates > 0 ? ((activeTemplates / totalTemplates) * 100).toFixed(2) : 0
            };
        } catch (error) {
            throw new Error(`Failed to get template statistics: ${error.message}`);
        }
    }
}

module.exports = FollowupTemplateService;
