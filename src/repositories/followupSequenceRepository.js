const { 
    FollowupSequence, 
    FollowupSequenceTemplate, 
    CustomerFollowupSequence,
    WhatsAppTemplate,
    Customer,
    Order,
    Tenant,
    Branch,
    User,
    Op 
} = require('../models');

class FollowupSequenceRepository {
    // =====================================================
    // FOLLOWUP SEQUENCE MANAGEMENT
    // =====================================================

    static async getAllSequences(tenant_id, branch_id = null, page = 1, limit = 10) {
        const whereClause = { tenant_id };
        
        if (branch_id) {
            whereClause[Op.or] = [
                { branch_id: branch_id },
                { branch_id: null }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await FollowupSequence.findAndCountAll({
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
                },
                {
                    model: FollowupSequenceTemplate,
                    as: 'templates',
                    include: [
                        {
                            model: WhatsAppTemplate,
                            as: 'template',
                            attributes: ['id', 'name', 'title', 'template_content']
                        }
                    ],
                    order: [['step_number', 'ASC']]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: limit,
            offset: offset
        });

        return {
            sequences: rows,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        };
    }

    static async getSequenceById(id, tenant_id) {
        return await FollowupSequence.findOne({
            where: { id, tenant_id },
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
                    model: FollowupSequenceTemplate,
                    as: 'templates',
                    include: [
                        {
                            model: WhatsAppTemplate,
                            as: 'template',
                            attributes: ['id', 'name', 'title', 'template_content', 'variables']
                        }
                    ],
                    order: [['step_number', 'ASC']]
                }
            ]
        });
    }

    static async createSequence(sequenceData) {
        return await FollowupSequence.create(sequenceData);
    }

    static async updateSequence(id, sequenceData, tenant_id) {
        const [affectedRows] = await FollowupSequence.update(
            sequenceData,
            {
                where: { id, tenant_id }
            }
        );
        
        if (affectedRows === 0) {
            throw new Error('Sequence not found or access denied');
        }

        return await this.getSequenceById(id, tenant_id);
    }

    static async deleteSequence(id, tenant_id) {
        const deletedRows = await FollowupSequence.destroy({
            where: { id, tenant_id }
        });

        if (deletedRows === 0) {
            throw new Error('Sequence not found or access denied');
        }

        return { success: true, message: 'Sequence deleted successfully' };
    }

    // =====================================================
    // SEQUENCE TEMPLATE MANAGEMENT
    // =====================================================

    static async getSequenceTemplates(sequence_id, tenant_id) {
        // Verify sequence belongs to tenant
        const sequence = await FollowupSequence.findOne({
            where: { id: sequence_id, tenant_id }
        });

        if (!sequence) {
            throw new Error('Sequence not found or access denied');
        }

        return await FollowupSequenceTemplate.findAll({
            where: { sequence_id },
            include: [
                {
                    model: WhatsAppTemplate,
                    as: 'template',
                    attributes: ['id', 'name', 'title', 'template_content', 'variables']
                }
            ],
            order: [['step_number', 'ASC']]
        });
    }

    static async createSequenceTemplate(templateData) {
        return await FollowupSequenceTemplate.create(templateData);
    }

    static async updateSequenceTemplate(id, templateData, tenant_id) {
        // Verify template belongs to tenant's sequence
        const template = await FollowupSequenceTemplate.findOne({
            where: { id },
            include: [
                {
                    model: FollowupSequence,
                    as: 'sequence',
                    where: { tenant_id }
                }
            ]
        });

        if (!template) {
            throw new Error('Template not found or access denied');
        }

        const [affectedRows] = await FollowupSequenceTemplate.update(
            templateData,
            { where: { id } }
        );

        if (affectedRows === 0) {
            throw new Error('Failed to update template');
        }

        return await FollowupSequenceTemplate.findByPk(id, {
            include: [
                {
                    model: WhatsAppTemplate,
                    as: 'template',
                    attributes: ['id', 'name', 'title', 'template_content']
                }
            ]
        });
    }

    static async deleteSequenceTemplate(id, tenant_id) {
        // Verify template belongs to tenant's sequence
        const template = await FollowupSequenceTemplate.findOne({
            where: { id },
            include: [
                {
                    model: FollowupSequence,
                    as: 'sequence',
                    where: { tenant_id }
                }
            ]
        });

        if (!template) {
            throw new Error('Template not found or access denied');
        }

        const deletedRows = await FollowupSequenceTemplate.destroy({
            where: { id }
        });

        return { success: true, message: 'Template deleted successfully' };
    }

    // =====================================================
    // CUSTOMER FOLLOWUP SEQUENCE MANAGEMENT
    // =====================================================

    static async getCustomersInSequence(sequence_id, tenant_id, page = 1, limit = 10, filters = {}) {
        const whereClause = { sequence_id };
        
        if (filters.is_active !== undefined) {
            whereClause.is_active = filters.is_active;
        }
        
        if (filters.is_paused !== undefined) {
            whereClause.is_paused = filters.is_paused;
        }

        if (filters.current_step !== undefined) {
            whereClause.current_step = filters.current_step;
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await CustomerFollowupSequence.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    where: { tenant_id },
                    attributes: ['id', 'name', 'phone', 'email']
                },
                {
                    model: FollowupSequence,
                    as: 'sequence',
                    attributes: ['id', 'name', 'description']
                },
                {
                    model: Order,
                    as: 'converted_order',
                    attributes: ['id', 'entry_date', 'quantity'],
                    required: false
                }
            ],
            order: [['next_send_at', 'ASC']],
            limit: limit,
            offset: offset
        });

        return {
            customers: rows,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        };
    }

    static async addCustomerToSequence(customerSequenceData) {
        return await CustomerFollowupSequence.create(customerSequenceData);
    }

    static async updateCustomerSequence(customer_id, sequence_id, updateData) {
        const [affectedRows] = await CustomerFollowupSequence.update(
            updateData,
            {
                where: { customer_id, sequence_id }
            }
        );

        if (affectedRows === 0) {
            throw new Error('Customer sequence not found');
        }

        return await CustomerFollowupSequence.findOne({
            where: { customer_id, sequence_id },
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone', 'email']
                }
            ]
        });
    }

    static async removeCustomerFromSequence(customer_id, sequence_id) {
        const deletedRows = await CustomerFollowupSequence.destroy({
            where: { customer_id, sequence_id }
        });

        if (deletedRows === 0) {
            throw new Error('Customer sequence not found');
        }

        return { success: true, message: 'Customer removed from sequence' };
    }

    // =====================================================
    // FOLLOWUP EXECUTION QUERIES
    // =====================================================

    static async getCustomersReadyForFollowup(tenant_id, branch_id = null) {
        try {
            const sequelize = require('../config/database');
            
            // Build WHERE conditions
            let branchCondition = '';
            if (branch_id) {
                branchCondition = `AND c.branch_id = ${branch_id}`;
            }
            
            // Use raw SQL query for better control
            const query = `
                SELECT 
                    cfs.id,
                    cfs.customer_id,
                    cfs.sequence_id,
                    cfs.current_step,
                    cfs.next_send_at,
                    cfs.last_sent_at,
                    cfs.total_sent,
                    c.id as customer_id,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email,
                    fs.id as sequence_id,
                    fs.name as sequence_name,
                    fs.description as sequence_description
                FROM customer_followup_sequences cfs
                INNER JOIN customers c ON cfs.customer_id = c.id
                INNER JOIN followup_sequences fs ON cfs.sequence_id = fs.id
                WHERE cfs.next_send_at <= NOW()
                    AND cfs.is_active = 1
                    AND cfs.is_paused = 0
                    AND c.tenant_id = ${tenant_id}
                    AND c.deletedAt IS NULL
                    AND fs.is_active = 1
                    ${branchCondition}
                ORDER BY cfs.next_send_at ASC
            `;
            
            const results = await sequelize.query(query, {
                type: sequelize.QueryTypes.SELECT
            });
            
            console.log(`🔍 Raw SQL found ${results.length} customers ready for followup (tenant: ${tenant_id}, branch: ${branch_id})`);
            
            // Transform results to match expected format
            const transformedResults = results.map(row => ({
                id: row.id,
                customer_id: row.customer_id,
                sequence_id: row.sequence_id,
                current_step: row.current_step,
                next_send_at: row.next_send_at,
                last_sent_at: row.last_sent_at,
                total_sent: row.total_sent,
                customer: {
                    id: row.customer_id,
                    name: row.customer_name,
                    phone: row.customer_phone,
                    email: row.customer_email,
                    tenant_id: tenant_id,
                    branch_id: branch_id
                },
                sequence: {
                    id: row.sequence_id,
                    name: row.sequence_name,
                    description: row.sequence_description,
                    templates: [] // Will be populated if needed
                }
            }));
            
            return transformedResults;
            
        } catch (error) {
            console.error('Error in getCustomersReadyForFollowup:', error);
            return [];
        }
    }

    static async getCustomersForNewSequence(tenant_id, branch_id = null, daysSinceLastOrder = 7) {
        const sequelize = require('../config/database');
        
        const branchCondition = branch_id ? `AND c.branch_id = ${branch_id}` : '';
        
        const query = `
            SELECT 
                c.id,
                c.name,
                c.phone,
                c.email,
                c.tenant_id,
                c.branch_id,
                MAX(o.entry_date) as last_order_date,
                DATEDIFF(NOW(), MAX(o.entry_date)) as days_since_last_order
            FROM customers c
            INNER JOIN orders o ON c.id = o.customer_id AND o.deletedAt IS NULL
            LEFT JOIN customer_followup_sequences cfs ON c.id = cfs.customer_id AND cfs.is_active = 1
            WHERE c.tenant_id = ${tenant_id}
                ${branchCondition}
                AND c.deletedAt IS NULL
                AND cfs.id IS NULL
                AND DATEDIFF(NOW(), o.entry_date) >= ${daysSinceLastOrder}
            GROUP BY c.id
            HAVING days_since_last_order >= ${daysSinceLastOrder}
            ORDER BY days_since_last_order DESC
        `;

        const customers = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT
        });

        return customers;
    }

    // =====================================================
    // ANALYTICS & REPORTING
    // =====================================================

    static async getFollowupStatistics(tenant_id, branch_id = null, dateRange = {}) {
        try {
            const sequelize = require('../config/database');
            
            // Build WHERE conditions for customer
            let customerCondition = `c.tenant_id = ${tenant_id}`;
            if (branch_id) {
                customerCondition += ` AND c.branch_id = ${branch_id}`;
            }
            
            // Build WHERE conditions for date range
            let dateCondition = '';
            if (dateRange.start && dateRange.end) {
                const startDate = dateRange.start.toISOString().split('T')[0];
                const endDate = dateRange.end.toISOString().split('T')[0];
                dateCondition = `AND cfs.created_at BETWEEN '${startDate}' AND '${endDate}'`;
            }
            
            // Query for statistics
            const statisticsQuery = `
                SELECT 
                    COUNT(DISTINCT cfs.id) as total_customers_in_sequence,
                    COALESCE(SUM(cfs.total_sent), 0) as total_messages_sent,
                    COALESCE(SUM(cfs.total_responded), 0) as total_responses,
                    COUNT(DISTINCT CASE WHEN cfs.converted_order_id IS NOT NULL THEN cfs.id END) as total_conversions
                FROM customer_followup_sequences cfs
                INNER JOIN customers c ON cfs.customer_id = c.id
                WHERE ${customerCondition}
                    AND cfs.is_active = 1
                    AND c.deletedAt IS NULL
                    ${dateCondition}
            `;
            
            const results = await sequelize.query(statisticsQuery, {
                type: sequelize.QueryTypes.SELECT
            });
            
            const stats = results[0] || {
                total_customers_in_sequence: 0,
                total_messages_sent: 0,
                total_responses: 0,
                total_conversions: 0
            };
            
            // Calculate rates
            const responseRate = stats.total_messages_sent > 0 ? 
                ((stats.total_responses / stats.total_messages_sent) * 100).toFixed(2) : '0.00';
            
            const conversionRate = stats.total_customers_in_sequence > 0 ? 
                ((stats.total_conversions / stats.total_customers_in_sequence) * 100).toFixed(2) : '0.00';
            
            return {
                total_customers_in_sequence: parseInt(stats.total_customers_in_sequence) || 0,
                total_messages_sent: parseInt(stats.total_messages_sent) || 0,
                total_responses: parseInt(stats.total_responses) || 0,
                total_conversions: parseInt(stats.total_conversions) || 0,
                response_rate: responseRate,
                conversion_rate: conversionRate
            };
            
        } catch (error) {
            console.error('Error in getFollowupStatistics:', error);
            // Return default values if query fails
            return {
                total_customers_in_sequence: 0,
                total_messages_sent: 0,
                total_responses: 0,
                total_conversions: 0,
                response_rate: '0.00',
                conversion_rate: '0.00'
            };
        }
    }
}

module.exports = FollowupSequenceRepository;
