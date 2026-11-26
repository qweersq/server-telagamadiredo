const FollowupSequenceService = require('../services/followupSequenceService');
const { ResponseHelper } = require('../helpers');

class FollowupSequenceController {
    // =====================================================
    // SEQUENCE MANAGEMENT
    // =====================================================

    /**
     * Get all followup sequences
     * GET /api/followup-sequences
     */
    static async getAllSequences(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                branch_id
            } = req.query;

            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            const result = await FollowupSequenceService.getAllSequences(
                user_tenant_id,
                user_branch_id,
                parseInt(page),
                parseInt(limit)
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Sequences retrieved successfully'));
        } catch (error) {
            console.error('Error getting sequences:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get sequence by ID
     * GET /api/followup-sequences/:id
     */
    static async getSequenceById(req, res) {
        try {
            const { id } = req.params;
            const user_tenant_id = req.user.tenant_id;

            const sequence = await FollowupSequenceService.getSequenceById(parseInt(id), user_tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(sequence, 'Sequence retrieved successfully'));
        } catch (error) {
            console.error('Error getting sequence:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Create new followup sequence
     * POST /api/followup-sequences
     */
    static async createSequence(req, res) {
        try {
            const {
                name,
                description,
                is_active = true,
                is_default = false,
                branch_id
            } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).send(ResponseHelper.errorResponse('Sequence name is required'));
            }

            const sequenceData = {
                name: name.trim(),
                description,
                is_active,
                is_default,
                branch_id: branch_id || null
            };

            const user_tenant_id = req.user.tenant_id;
            const user_id = req.user.id;

            const sequence = await FollowupSequenceService.createSequence(sequenceData, user_tenant_id, user_id);

            return res.status(201).send(ResponseHelper.successResponse(sequence, 'Sequence created successfully'));
        } catch (error) {
            console.error('Error creating sequence:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Update followup sequence
     * PUT /api/followup-sequences/:id
     */
    static async updateSequence(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                is_active,
                is_default,
                branch_id
            } = req.body;

            const sequenceData = {};
            if (name !== undefined) sequenceData.name = name.trim();
            if (description !== undefined) sequenceData.description = description;
            if (is_active !== undefined) sequenceData.is_active = is_active;
            if (is_default !== undefined) sequenceData.is_default = is_default;
            if (branch_id !== undefined) sequenceData.branch_id = branch_id;

            const user_tenant_id = req.user.tenant_id;
            const user_id = req.user.id;

            const sequence = await FollowupSequenceService.updateSequence(
                parseInt(id),
                sequenceData,
                user_tenant_id,
                user_id
            );

            return res.status(200).send(ResponseHelper.successResponse(sequence, 'Sequence updated successfully'));
        } catch (error) {
            console.error('Error updating sequence:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Delete followup sequence
     * DELETE /api/followup-sequences/:id
     */
    static async deleteSequence(req, res) {
        try {
            const { id } = req.params;
            const user_tenant_id = req.user.tenant_id;

            const result = await FollowupSequenceService.deleteSequence(parseInt(id), user_tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Sequence deleted successfully'));
        } catch (error) {
            console.error('Error deleting sequence:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // SEQUENCE TEMPLATE MANAGEMENT
    // =====================================================

    /**
     * Get templates for a sequence
     * GET /api/followup-sequences/:id/templates
     */
    static async getSequenceTemplates(req, res) {
        try {
            const { id } = req.params;
            const user_tenant_id = req.user.tenant_id;

            const templates = await FollowupSequenceService.getSequenceTemplates(parseInt(id), user_tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(templates, 'Sequence templates retrieved successfully'));
        } catch (error) {
            console.error('Error getting sequence templates:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Add template to sequence
     * POST /api/followup-sequences/:id/templates
     */
    static async createSequenceTemplate(req, res) {
        try {
            const { id } = req.params;
            const {
                step_number,
                delay_days,
                template_id,
                is_active = true,
                send_time = '09:00:00',
                conditions = {}
            } = req.body;

            // Validation
            if (!step_number || !delay_days || !template_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Step number, delay days, and template ID are required'));
            }

            if (step_number < 1) {
                return res.status(400).send(ResponseHelper.errorResponse('Step number must be greater than 0'));
            }

            if (delay_days < 1) {
                return res.status(400).send(ResponseHelper.errorResponse('Delay days must be greater than 0'));
            }

            const templateData = {
                step_number: parseInt(step_number),
                delay_days: parseInt(delay_days),
                template_id: parseInt(template_id),
                is_active,
                send_time,
                conditions
            };

            const user_tenant_id = req.user.tenant_id;

            const sequenceTemplate = await FollowupSequenceService.createSequenceTemplate(
                parseInt(id),
                templateData,
                user_tenant_id
            );

            return res.status(201).send(ResponseHelper.successResponse(sequenceTemplate, 'Template added to sequence successfully'));
        } catch (error) {
            console.error('Error creating sequence template:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Update sequence template
     * PUT /api/followup-sequence-templates/:id
     */
    static async updateSequenceTemplate(req, res) {
        try {
            const { id } = req.params;
            const {
                step_number,
                delay_days,
                template_id,
                is_active,
                send_time,
                conditions
            } = req.body;

            const templateData = {};
            if (step_number !== undefined) templateData.step_number = parseInt(step_number);
            if (delay_days !== undefined) templateData.delay_days = parseInt(delay_days);
            if (template_id !== undefined) templateData.template_id = parseInt(template_id);
            if (is_active !== undefined) templateData.is_active = is_active;
            if (send_time !== undefined) templateData.send_time = send_time;
            if (conditions !== undefined) templateData.conditions = conditions;

            const user_tenant_id = req.user.tenant_id;

            const sequenceTemplate = await FollowupSequenceService.updateSequenceTemplate(
                parseInt(id),
                templateData,
                user_tenant_id
            );

            return res.status(200).send(ResponseHelper.successResponse(sequenceTemplate, 'Sequence template updated successfully'));
        } catch (error) {
            console.error('Error updating sequence template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Delete sequence template
     * DELETE /api/followup-sequence-templates/:id
     */
    static async deleteSequenceTemplate(req, res) {
        try {
            const { id } = req.params;
            const user_tenant_id = req.user.tenant_id;

            const result = await FollowupSequenceService.deleteSequenceTemplate(parseInt(id), user_tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Sequence template deleted successfully'));
        } catch (error) {
            console.error('Error deleting sequence template:', error);
            const statusCode = error.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // CUSTOMER SEQUENCE MANAGEMENT
    // =====================================================

    /**
     * Add customers to sequence
     * POST /api/followup-sequences/:id/customers
     */
    static async addCustomersToSequence(req, res) {
        try {
            const { id } = req.params;
            const { customer_ids } = req.body;

            // Validation
            if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Customer IDs array is required'));
            }

            const user_tenant_id = req.user.tenant_id;

            const result = await FollowupSequenceService.addCustomersToSequence(
                parseInt(id),
                customer_ids.map(id => parseInt(id)),
                user_tenant_id
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Customers added to sequence'));
        } catch (error) {
            console.error('Error adding customers to sequence:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get customers ready for followup
     * GET /api/followup-sequences/ready-customers
     */
    static async getCustomersReadyForFollowup(req, res) {
        try {
            const { branch_id } = req.query;
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            const customers = await FollowupSequenceService.getCustomersReadyForFollowup(
                user_tenant_id,
                user_branch_id
            );

            return res.status(200).send(ResponseHelper.successResponse({
                customers: customers,
                total: customers.length,
                ready_for_followup: customers.length
            }, 'Customers ready for followup retrieved successfully'));
        } catch (error) {
            console.error('Error getting customers ready for followup:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Execute followup for ready customers
     * POST /api/followup-sequences/execute
     */
    static async executeFollowup(req, res) {
        try {
            const { branch_id, limit = 50 } = req.body;
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            console.log(`🚀 Executing followup for tenant ${user_tenant_id}, branch ${user_branch_id}, limit ${limit}`);

            const result = await FollowupSequenceService.executeFollowupForCustomers(
                user_tenant_id,
                user_branch_id,
                parseInt(limit)
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Followup execution completed'));
        } catch (error) {
            console.error('Error executing followup:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // TESTING & PREVIEW
    // =====================================================

    /**
     * Test followup template
     * POST /api/followup-sequences/test-template
     */
    static async testTemplate(req, res) {
        try {
            const { template_id, customer_id } = req.body;

            // Validation
            if (!template_id || !customer_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Template ID and Customer ID are required'));
            }

            const user_tenant_id = req.user.tenant_id;

            const result = await FollowupSequenceService.testFollowupTemplate(
                parseInt(template_id),
                parseInt(customer_id),
                user_tenant_id
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Template test completed successfully'));
        } catch (error) {
            console.error('Error testing template:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Preview sequence for customer
     * POST /api/followup-sequences/:id/preview
     */
    static async previewSequence(req, res) {
        try {
            const { id } = req.params;
            const { customer_id } = req.body;

            if (!customer_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Customer ID is required'));
            }

            const user_tenant_id = req.user.tenant_id;

            // Get sequence with templates
            const sequence = await FollowupSequenceService.getSequenceById(parseInt(id), user_tenant_id);
            
            // Get customer data (mock for now)
            const mockCustomer = {
                id: customer_id,
                name: 'John Doe',
                phone: '081234567890',
                email: 'john@example.com'
            };

            // Process each template in sequence
            const previews = [];
            let baseDate = new Date();

            for (const templateStep of sequence.templates) {
                const sendDate = new Date(baseDate);
                sendDate.setDate(sendDate.getDate() + templateStep.delay_days);

                const templateVariables = {
                    customer_name: mockCustomer.name,
                    business_name: 'Katsikat Laundry',
                    branch_name: 'Main Branch'
                };

                const MockWhatsAppService = require('../services/mockWhatsAppService');
                const processedTemplate = MockWhatsAppService.processTemplate(
                    templateStep.template.template_content,
                    templateVariables
                );

                previews.push({
                    step: templateStep.step_number,
                    delay_days: templateStep.delay_days,
                    send_date: sendDate,
                    send_time: templateStep.send_time,
                    template_name: templateStep.template.name,
                    template_title: templateStep.template.title,
                    processed_content: processedTemplate.processed_content,
                    variables_used: templateVariables
                });

                baseDate = sendDate;
            }

            const result = {
                sequence: {
                    id: sequence.id,
                    name: sequence.name,
                    description: sequence.description
                },
                customer: mockCustomer,
                previews: previews,
                total_steps: previews.length,
                estimated_duration_days: previews[previews.length - 1]?.delay_days || 0
            };

            return res.status(200).send(ResponseHelper.successResponse(result, 'Sequence preview generated successfully'));
        } catch (error) {
            console.error('Error previewing sequence:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // ANALYTICS & REPORTING
    // =====================================================

    /**
     * Get followup statistics
     * GET /api/followup-sequences/statistics
     */
    static async getStatistics(req, res) {
        try {
            const {
                branch_id,
                start_date,
                end_date
            } = req.query;

            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            const dateRange = {};
            if (start_date) dateRange.start = new Date(start_date);
            if (end_date) dateRange.end = new Date(end_date);

            const statistics = await FollowupSequenceService.getFollowupStatistics(
                user_tenant_id,
                user_branch_id,
                dateRange
            );

            return res.status(200).send(ResponseHelper.successResponse(statistics, 'Statistics retrieved successfully'));
        } catch (error) {
            console.error('Error getting statistics:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get monthly followup report
     * GET /api/followup-sequences/monthly-report
     */
    static async getMonthlyReport(req, res) {
        try {
            const {
                year = new Date().getFullYear(),
                month = new Date().getMonth() + 1,
                branch_id
            } = req.query;

            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            // Calculate date range for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const statistics = await FollowupSequenceService.getFollowupStatistics(
                user_tenant_id,
                user_branch_id,
                { start: startDate, end: endDate }
            );

            // Add mock conversion tracking
            const MockWhatsAppService = require('../services/mockWhatsAppService');
            const mockStats = MockWhatsAppService.generateMockStatistics({ start: startDate, end: endDate });

            const report = {
                period: {
                    year: parseInt(year),
                    month: parseInt(month),
                    month_name: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
                    start_date: startDate,
                    end_date: endDate
                },
                statistics: statistics,
                mock_data: mockStats,
                summary: {
                    total_customers_followed_up: statistics.total_customers_in_sequence,
                    total_messages_sent: statistics.total_messages_sent,
                    response_rate: statistics.response_rate + '%',
                    conversion_rate: statistics.conversion_rate + '%',
                    estimated_orders_from_followup: Math.floor(statistics.total_conversions * 1.2) // Mock calculation
                },
                generated_at: new Date().toISOString()
            };

            return res.status(200).send(ResponseHelper.successResponse(report, 'Monthly report generated successfully'));
        } catch (error) {
            console.error('Error generating monthly report:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // BROADCAST ENDPOINTS
    // =====================================================

    /**
     * Send broadcast message
     * POST /followup-sequences/broadcast
     */
    static async sendBroadcast(req, res) {
        try {
            const {
                template_id,
                message_content,
                recipient_filter = 'all',
                branch_id,
                max_recipients
            } = req.body;

            // Validation
            if (!message_content || !message_content.trim()) {
                return res.status(400).send(ResponseHelper.errorResponse('Message content is required'));
            }

            const broadcastData = {
                template_id,
                message_content: message_content.trim(),
                recipient_filter,
                branch_id: branch_id || req.user.branch_id,
                max_recipients
            };

            const tenant_id = req.user.tenant_id;
            const user_id = req.user.id;

            const result = await FollowupSequenceService.sendBroadcast(broadcastData, tenant_id, user_id);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Broadcast queued successfully'));
        } catch (error) {
            console.error('Error sending broadcast:', error);
            const statusCode = error.message.includes('limit exceeded') ? 429 : 500;
            return res.status(statusCode).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get broadcast history
     * GET /followup-sequences/broadcast/history
     */
    static async getBroadcastHistory(req, res) {
        try {
            const { page = 1, limit = 10, branch_id } = req.query;
            const tenant_id = req.user.tenant_id;
            const user_branch_id = branch_id || req.user.branch_id;

            const result = await FollowupSequenceService.getBroadcastHistory(
                tenant_id,
                user_branch_id,
                parseInt(page),
                parseInt(limit)
            );

            return res.status(200).send(ResponseHelper.successResponse(result, 'Broadcast history retrieved successfully'));
        } catch (error) {
            console.error('Error getting broadcast history:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // =====================================================
    // LIMITS & QUOTA ENDPOINTS
    // =====================================================

    /**
     * Get tenant limits status
     * GET /followup-sequences/limits/status
     */
    static async getTenantLimitsStatus(req, res) {
        try {
            const tenant_id = req.user.tenant_id;

            const limitsStatus = await FollowupSequenceService.getTenantLimitsStatus(tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(limitsStatus, 'Tenant limits status retrieved successfully'));
        } catch (error) {
            console.error('Error getting tenant limits status:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get message queue status
     * GET /followup-sequences/queue
     */
    static async getMessageQueue(req, res) {
        try {
            const { status = 'pending', limit = 50 } = req.query;
            const tenant_id = req.user.tenant_id;

            const queue = await FollowupSequenceService.getMessageQueue(
                tenant_id,
                status,
                parseInt(limit)
            );

            return res.status(200).send(ResponseHelper.successResponse(queue, 'Message queue retrieved successfully'));
        } catch (error) {
            console.error('Error getting message queue:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = FollowupSequenceController;
