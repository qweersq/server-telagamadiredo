const FollowupSequenceRepository = require('../repositories/followupSequenceRepository');
const MockWhatsAppService = require('./mockWhatsAppService');
const RateLimiterService = require('./rateLimiterService');
const { WhatsAppTemplate, Customer, Tenant, Branch } = require('../models');

class FollowupSequenceService {
    // =====================================================
    // SEQUENCE MANAGEMENT
    // =====================================================

    static async getAllSequences(tenant_id, branch_id = null, page = 1, limit = 10) {
        try {
            const result = await FollowupSequenceRepository.getAllSequences(tenant_id, branch_id, page, limit);
            
            return {
                sequences: result.sequences,
                pagination: {
                    currentPage: result.currentPage,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: result.currentPage < result.totalPages,
                    hasPrevPage: result.currentPage > 1
                }
            };
        } catch (error) {
            throw new Error(`Failed to get sequences: ${error.message}`);
        }
    }

    static async getSequenceById(id, tenant_id) {
        try {
            const sequence = await FollowupSequenceRepository.getSequenceById(id, tenant_id);
            
            if (!sequence) {
                throw new Error('Sequence not found');
            }
            
            return sequence;
        } catch (error) {
            throw new Error(`Failed to get sequence: ${error.message}`);
        }
    }

    static async createSequence(sequenceData, tenant_id, user_id) {
        try {
            // Check if tenant can create new sequence
            const sequenceCheck = await RateLimiterService.canCreateSequence(tenant_id);
            if (!sequenceCheck.allowed) {
                throw new Error(`Sequence limit exceeded. Maximum ${sequenceCheck.limit} sequences allowed. Current: ${sequenceCheck.current}`);
            }

            // Validate required fields
            if (!sequenceData.name || !sequenceData.name.trim()) {
                throw new Error('Sequence name is required');
            }

            // Check template count limit if templates provided
            if (sequenceData.templates && Array.isArray(sequenceData.templates)) {
                const templateCheck = await RateLimiterService.canAddTemplate(tenant_id, null, sequenceData.templates.length);
                if (!templateCheck.allowed) {
                    throw new Error(`Template limit exceeded. Maximum ${templateCheck.limit} templates per sequence. Requested: ${sequenceData.templates.length}`);
                }
            }

            // Add tenant and user context
            const dataToCreate = {
                ...sequenceData,
                tenant_id: tenant_id,
                created_by: user_id,
                updated_by: user_id
            };

            // If this is set as default, unset other defaults
            if (sequenceData.is_default) {
                await this.unsetDefaultSequences(tenant_id, sequenceData.branch_id);
            }

            const sequence = await FollowupSequenceRepository.createSequence(dataToCreate);
            
            // Increment sequence usage counter
            await RateLimiterService.incrementUsage(tenant_id, 'sequences_active');
            
            return await this.getSequenceById(sequence.id, tenant_id);
        } catch (error) {
            throw new Error(`Failed to create sequence: ${error.message}`);
        }
    }

    static async updateSequence(id, sequenceData, tenant_id, user_id) {
        try {
            // Add user context
            const dataToUpdate = {
                ...sequenceData,
                updated_by: user_id
            };

            // If this is set as default, unset other defaults
            if (sequenceData.is_default) {
                await this.unsetDefaultSequences(tenant_id, sequenceData.branch_id, id);
            }

            return await FollowupSequenceRepository.updateSequence(id, dataToUpdate, tenant_id);
        } catch (error) {
            throw new Error(`Failed to update sequence: ${error.message}`);
        }
    }

    static async deleteSequence(id, tenant_id) {
        try {
            // Check if sequence has active customers
            const customersInSequence = await FollowupSequenceRepository.getCustomersInSequence(id, tenant_id, 1, 1, { is_active: true });
            
            if (customersInSequence.totalItems > 0) {
                throw new Error(`Cannot delete sequence with ${customersInSequence.totalItems} active customers. Please remove customers first.`);
            }

            return await FollowupSequenceRepository.deleteSequence(id, tenant_id);
        } catch (error) {
            throw new Error(`Failed to delete sequence: ${error.message}`);
        }
    }

    static async unsetDefaultSequences(tenant_id, branch_id, excludeId = null) {
        // This would need to be implemented in repository
        // For now, we'll assume it's handled in the repository layer
        console.log(`Unsetting default sequences for tenant ${tenant_id}, branch ${branch_id}, exclude ${excludeId}`);
    }

    // =====================================================
    // SEQUENCE TEMPLATE MANAGEMENT
    // =====================================================

    static async getSequenceTemplates(sequence_id, tenant_id) {
        try {
            return await FollowupSequenceRepository.getSequenceTemplates(sequence_id, tenant_id);
        } catch (error) {
            throw new Error(`Failed to get sequence templates: ${error.message}`);
        }
    }

    static async createSequenceTemplate(sequence_id, templateData, tenant_id) {
        try {
            // Validate sequence exists and belongs to tenant
            const sequence = await this.getSequenceById(sequence_id, tenant_id);
            
            // Validate required fields
            if (!templateData.step_number || !templateData.delay_days || !templateData.template_id) {
                throw new Error('Step number, delay days, and template ID are required');
            }

            // Validate template exists
            const template = await WhatsAppTemplate.findOne({
                where: { 
                    id: templateData.template_id,
                    tenant_id: tenant_id
                }
            });

            if (!template) {
                throw new Error('Template not found or access denied');
            }

            const dataToCreate = {
                ...templateData,
                sequence_id: sequence_id
            };

            return await FollowupSequenceRepository.createSequenceTemplate(dataToCreate);
        } catch (error) {
            throw new Error(`Failed to create sequence template: ${error.message}`);
        }
    }

    static async updateSequenceTemplate(id, templateData, tenant_id) {
        try {
            return await FollowupSequenceRepository.updateSequenceTemplate(id, templateData, tenant_id);
        } catch (error) {
            throw new Error(`Failed to update sequence template: ${error.message}`);
        }
    }

    static async deleteSequenceTemplate(id, tenant_id) {
        try {
            return await FollowupSequenceRepository.deleteSequenceTemplate(id, tenant_id);
        } catch (error) {
            throw new Error(`Failed to delete sequence template: ${error.message}`);
        }
    }

    // =====================================================
    // CUSTOMER SEQUENCE MANAGEMENT
    // =====================================================

    static async addCustomersToSequence(sequence_id, customer_ids, tenant_id) {
        try {
            const sequence = await this.getSequenceById(sequence_id, tenant_id);
            const results = [];
            
            for (const customer_id of customer_ids) {
                try {
                    // Verify customer belongs to tenant
                    const customer = await Customer.findOne({
                        where: { id: customer_id, tenant_id: tenant_id }
                    });

                    if (!customer) {
                        results.push({
                            customer_id,
                            success: false,
                            message: 'Customer not found or access denied'
                        });
                        continue;
                    }

                    // Get customer's last order date
                    const lastOrderDate = await this.getCustomerLastOrderDate(customer_id);
                    
                    // Calculate next send date (first template delay)
                    const firstTemplate = sequence.templates.find(t => t.step_number === 1);
                    const nextSendAt = this.calculateNextSendDate(lastOrderDate, firstTemplate?.delay_days || 7);

                    const customerSequenceData = {
                        customer_id: customer_id,
                        sequence_id: sequence_id,
                        current_step: 0,
                        last_order_date: lastOrderDate,
                        next_send_at: nextSendAt,
                        is_active: true,
                        is_paused: false
                    };

                    const customerSequence = await FollowupSequenceRepository.addCustomerToSequence(customerSequenceData);
                    
                    results.push({
                        customer_id,
                        success: true,
                        message: 'Customer added to sequence successfully',
                        next_send_at: nextSendAt
                    });

                } catch (error) {
                    results.push({
                        customer_id,
                        success: false,
                        message: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            
            return {
                success: true,
                message: `Added ${successCount}/${customer_ids.length} customers to sequence`,
                results: results,
                summary: {
                    total: customer_ids.length,
                    success: successCount,
                    failed: customer_ids.length - successCount
                }
            };

        } catch (error) {
            throw new Error(`Failed to add customers to sequence: ${error.message}`);
        }
    }

    static async getCustomersReadyForFollowup(tenant_id, branch_id = null) {
        try {
            return await FollowupSequenceRepository.getCustomersReadyForFollowup(tenant_id, branch_id);
        } catch (error) {
            throw new Error(`Failed to get customers ready for followup: ${error.message}`);
        }
    }

    static async executeFollowupForCustomers(tenant_id, branch_id = null, limit = 50) {
        try {
            const customersReady = await this.getCustomersReadyForFollowup(tenant_id, branch_id);
            
            if (customersReady.length === 0) {
                return {
                    success: true,
                    message: 'No customers ready for followup',
                    results: [],
                    summary: { total: 0, success: 0, failed: 0 }
                };
            }

            // Limit the number of customers to process
            const customersToProcess = customersReady.slice(0, limit);
            const results = [];

            for (const customerSequence of customersToProcess) {
                try {
                    const result = await this.sendFollowupToCustomer(customerSequence);
                    results.push(result);
                } catch (error) {
                    results.push({
                        customer_id: customerSequence.customer_id,
                        customer_name: customerSequence.customer?.name || 'Unknown',
                        success: false,
                        message: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;

            return {
                success: true,
                message: `Processed ${results.length} customers, ${successCount} successful`,
                results: results,
                summary: {
                    total: results.length,
                    success: successCount,
                    failed: results.length - successCount
                }
            };

        } catch (error) {
            throw new Error(`Failed to execute followup: ${error.message}`);
        }
    }

    static async sendFollowupToCustomer(customerSequence) {
        try {
            const { customer, sequence } = customerSequence;
            const currentStep = customerSequence.current_step + 1;
            
            // Find the template for current step
            const templateStep = sequence.templates.find(t => t.step_number === currentStep);
            
            if (!templateStep) {
                // No more templates, mark as completed
                await FollowupSequenceRepository.updateCustomerSequence(
                    customer.id,
                    sequence.id,
                    {
                        is_active: false,
                        completed_at: new Date()
                    }
                );

                return {
                    customer_id: customer.id,
                    customer_name: customer.name,
                    success: true,
                    message: 'Followup sequence completed',
                    step: currentStep,
                    completed: true
                };
            }

            // Process template with customer data
            const templateVariables = {
                customer_name: customer.name,
                business_name: 'Katsikat Laundry', // This should come from tenant data
                branch_name: 'Main Branch' // This should come from branch data
            };

            const processedTemplate = MockWhatsAppService.processTemplate(
                templateStep.template.template_content,
                templateVariables
            );

            // Send WhatsApp message (mock)
            const waResult = await MockWhatsAppService.sendFollowupMessage(
                customer.phone,
                processedTemplate.processed_content,
                { customer_id: customer.id, customer_name: customer.name }
            );

            // Calculate next send date
            const nextTemplate = sequence.templates.find(t => t.step_number === currentStep + 1);
            const nextSendAt = nextTemplate ? 
                this.calculateNextSendDate(new Date(), nextTemplate.delay_days) : 
                null;

            // Update customer sequence
            const updateData = {
                current_step: currentStep,
                last_sent_at: new Date(),
                next_send_at: nextSendAt,
                total_sent: customerSequence.total_sent + 1
            };

            if (waResult.success) {
                // If this was the last step, mark as completed
                if (!nextTemplate) {
                    updateData.is_active = false;
                    updateData.completed_at = new Date();
                }
            }

            await FollowupSequenceRepository.updateCustomerSequence(
                customer.id,
                sequence.id,
                updateData
            );

            return {
                customer_id: customer.id,
                customer_name: customer.name,
                phone: customer.phone,
                success: waResult.success,
                message: waResult.message,
                step: currentStep,
                template_name: templateStep.template.name,
                next_send_at: nextSendAt,
                completed: !nextTemplate,
                wa_response: waResult
            };

        } catch (error) {
            throw new Error(`Failed to send followup to customer: ${error.message}`);
        }
    }

    // =====================================================
    // BROADCAST METHODS
    // =====================================================

    static async sendBroadcast(broadcastData, tenant_id, user_id) {
        try {
            const {
                template_id,
                message_content,
                recipient_filter = 'all', // 'all', 'active', 'dormant'
                branch_id = null,
                max_recipients = null
            } = broadcastData;

            // Get customers based on filter
            let customers = [];
            if (recipient_filter === 'all') {
                customers = await Customer.findAll({
                    where: {
                        tenant_id: tenant_id,
                        ...(branch_id ? { branch_id: branch_id } : {}),
                        deletedAt: null
                    },
                    attributes: ['id', 'name', 'phone', 'email'],
                    order: [['createdAt', 'DESC']]
                });
            }

            // Apply max recipients limit from tenant config or parameter
            const config = await RateLimiterService.getTenantLimitsConfig(tenant_id);
            const effectiveMaxRecipients = max_recipients || config.max_recipients_per_broadcast;
            
            if (customers.length > effectiveMaxRecipients) {
                // Randomly sample customers to fit within limit
                const shuffled = customers.sort(() => 0.5 - Math.random());
                customers = shuffled.slice(0, effectiveMaxRecipients);
            }

            // Check broadcast limits
            const broadcastCheck = await RateLimiterService.canSendBroadcast(tenant_id, customers.length);
            if (!broadcastCheck.canSend) {
                throw new Error(`Broadcast limit exceeded. Monthly: ${broadcastCheck.monthly.current}/${broadcastCheck.monthly.limit}, Recipients: ${customers.length}/${broadcastCheck.recipients.limit}`);
            }

            // Create broadcast record
            const broadcastRecord = await require('../models').sequelize.query(`
                INSERT INTO broadcast_history (
                    tenant_id, branch_id, broadcast_type, broadcast_date, broadcast_time,
                    total_recipients, message_content, template_id, status, created_by
                ) VALUES (
                    ${tenant_id}, ${branch_id || 'NULL'}, 'custom', CURDATE(), CURTIME(),
                    ${customers.length}, ${require('../models').sequelize.escape(message_content)}, 
                    ${template_id || 'NULL'}, 'pending', ${user_id}
                )
            `, {
                type: require('../models').sequelize.QueryTypes.INSERT
            });

            const broadcastId = broadcastRecord[0];

            // Queue messages with rate limiting
            const queueResults = [];
            for (const customer of customers) {
                try {
                    const messageData = {
                        tenant_id: tenant_id,
                        customer_id: customer.id,
                        message_type: 'broadcast',
                        template_id: template_id,
                        broadcast_id: broadcastId,
                        message_content: message_content,
                        variables: {
                            customer_name: customer.name,
                            customer_phone: customer.phone,
                            customer_email: customer.email
                        },
                        priority: 7 // Lower priority for broadcasts
                    };

                    const queuedMessage = await RateLimiterService.queueMessage(messageData);
                    queueResults.push({ customer_id: customer.id, success: true, queue_id: queuedMessage.id });
                } catch (error) {
                    queueResults.push({ customer_id: customer.id, success: false, error: error.message });
                }
            }

            // Update broadcast record
            const successCount = queueResults.filter(r => r.success).length;
            const failedCount = queueResults.length - successCount;

            await require('../models').sequelize.query(`
                UPDATE broadcast_history 
                SET success_count = ${successCount}, failed_count = ${failedCount}, 
                    status = 'processing', started_at = NOW()
                WHERE id = ${broadcastId}
            `);

            // Increment usage counters
            await RateLimiterService.incrementUsage(tenant_id, 'broadcasts_monthly');

            return {
                broadcast_id: broadcastId,
                total_recipients: customers.length,
                queued_successfully: successCount,
                failed_to_queue: failedCount,
                queue_results: queueResults,
                estimated_completion: new Date(Date.now() + (customers.length * 10 * 1000)) // 10 seconds per message
            };

        } catch (error) {
            throw new Error(`Failed to send broadcast: ${error.message}`);
        }
    }

    static async getBroadcastHistory(tenant_id, branch_id = null, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            let whereClause = `WHERE tenant_id = ${tenant_id}`;
            
            if (branch_id) {
                whereClause += ` AND branch_id = ${branch_id}`;
            }

            const countQuery = `
                SELECT COUNT(*) as total 
                FROM broadcast_history 
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    id, broadcast_type, broadcast_date, broadcast_time,
                    total_recipients, success_count, failed_count, pending_count,
                    status, started_at, completed_at, created_by
                FROM broadcast_history 
                ${whereClause}
                ORDER BY broadcast_date DESC, broadcast_time DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const [countResult, dataResult] = await Promise.all([
                require('../models').sequelize.query(countQuery, { type: require('../models').sequelize.QueryTypes.SELECT }),
                require('../models').sequelize.query(dataQuery, { type: require('../models').sequelize.QueryTypes.SELECT })
            ]);

            const total = countResult[0].total;

            return {
                broadcasts: dataResult,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            throw new Error(`Failed to get broadcast history: ${error.message}`);
        }
    }

    // =====================================================
    // LIMITS & QUOTA METHODS  
    // =====================================================

    static async getTenantLimitsStatus(tenant_id) {
        try {
            return await RateLimiterService.getTenantLimitsStatus(tenant_id);
        } catch (error) {
            throw new Error(`Failed to get tenant limits status: ${error.message}`);
        }
    }

    static async getMessageQueue(tenant_id, status = 'pending', limit = 50) {
        try {
            const messages = await RateLimiterService.getReadyMessages(limit);
            
            // Filter by tenant if specified
            const tenantMessages = messages.filter(msg => msg.tenant_id === tenant_id);
            
            return {
                messages: tenantMessages,
                total: tenantMessages.length,
                status: status
            };
        } catch (error) {
            throw new Error(`Failed to get message queue: ${error.message}`);
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    static async getCustomerLastOrderDate(customer_id) {
        // This should query the orders table to get the last order date
        // For now, we'll return a mock date
        const mockDate = new Date();
        mockDate.setDate(mockDate.getDate() - Math.floor(Math.random() * 30) - 7); // 7-37 days ago
        return mockDate;
    }

    static calculateNextSendDate(baseDate, delayDays) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + delayDays);
        
        // Set to 9 AM by default
        nextDate.setHours(9, 0, 0, 0);
        
        return nextDate;
    }

    static async getFollowupStatistics(tenant_id, branch_id = null, dateRange = {}) {
        try {
            return await FollowupSequenceRepository.getFollowupStatistics(tenant_id, branch_id, dateRange);
        } catch (error) {
            throw new Error(`Failed to get followup statistics: ${error.message}`);
        }
    }

    static async testFollowupTemplate(template_id, customer_id, tenant_id) {
        try {
            // Get template
            const template = await WhatsAppTemplate.findOne({
                where: { id: template_id, tenant_id: tenant_id }
            });

            if (!template) {
                throw new Error('Template not found');
            }

            // Get customer
            const customer = await Customer.findOne({
                where: { id: customer_id, tenant_id: tenant_id }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Process template
            const templateVariables = {
                customer_name: customer.name,
                business_name: 'Katsikat Laundry',
                branch_name: 'Main Branch'
            };

            const processedTemplate = MockWhatsAppService.processTemplate(
                template.template_content,
                templateVariables
            );

            // Mock send (don't actually send)
            const mockResult = {
                success: true,
                message: 'Test message processed successfully',
                processed_content: processedTemplate.processed_content,
                variables_used: templateVariables,
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone
                },
                template: {
                    id: template.id,
                    name: template.name,
                    title: template.title
                },
                is_test: true
            };

            return mockResult;

        } catch (error) {
            throw new Error(`Failed to test template: ${error.message}`);
        }
    }
}

module.exports = FollowupSequenceService;
