const { Op } = require('sequelize');
const { Campaign, CampaignCustomer, Customer, WhatsAppTemplate, Tenant, User, Order } = require('../models');
const WACampaignHelper = require('../helpers/waCampaignHelper');
const sequelize = require('../config/database');

class CampaignService {
    /**
     * Create new campaign
     */
    static async createCampaign(campaignData) {
        try {
            // Check campaign limit (max 1 per tenant)
            const existingCampaigns = await Campaign.count({
                where: { 
                    tenant_id: campaignData.tenant_id,
                    deletedAt: null 
                }
            });
            
            if (existingCampaigns >= 1) {
                throw new Error('Maximum 1 campaign allowed per tenant');
            }
            
            const campaign = await Campaign.create(campaignData);
            
            // Load campaign with relations
            const campaignWithRelations = await Campaign.findOne({
                where: { id: campaign.id },
                include: [
                    { model: Tenant, as: 'tenant' },
                    { model: User, as: 'creator' },
                    { model: WhatsAppTemplate, as: 'template' }
                ]
            });

            return campaignWithRelations;
        } catch (error) {
            console.error('❌ Error creating campaign:', error);
            throw error;
        }
    }

    /**
     * Create default campaign for new tenant
     */
    static async createDefaultCampaign(tenant_id, created_by) {
        try {
            const defaultCampaignData = {
                tenant_id,
                name: "Broadcast Campaign",
                message_content: "Halo! Selamat bergabung dengan layanan kami. Terima kasih telah mempercayai layanan kami. Kami siap melayani Anda dengan sepenuh hati!",
                target_audience: "follow_up_30",
                follow_up_days: 30,
                status: "draft",
                template_id: null,
                created_by,
                is_default: true,
                is_editable: true
            };
            
            const campaign = await Campaign.create(defaultCampaignData);
            
            // Get target customers count
            const customers = await this.getTargetCustomers(
                "follow_up_30", 
                tenant_id, 
                30
            );
            
            // Update total customers count
            await campaign.update({ total_customers: customers.length });
            
            console.log('✅ Default campaign created for tenant:', tenant_id);
            return campaign;
        } catch (error) {
            console.error('❌ Error creating default campaign:', error);
            throw error;
        }
    }

    /**
     * Get campaigns with pagination and filters
     */
    static async getCampaigns({ tenant_id, page, limit, status, search }) {
        try {
            const offset = (page - 1) * limit;
            
            const whereClause = {
                tenant_id,
                deletedAt: null
            };

            // Add status filter
            if (status) {
                whereClause.status = status;
            }

            // Add search filter
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { message_content: { [Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows } = await Campaign.findAndCountAll({
                where: whereClause,
                include: [
                    { model: Tenant, as: 'tenant' },
                    { model: User, as: 'creator' },
                    { model: WhatsAppTemplate, as: 'template' }
                ],
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });

            return {
                campaigns: rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit
                }
            };
        } catch (error) {
            console.error('❌ Error getting campaigns:', error);
            throw error;
        }
    }

    /**
     * Get campaign by ID
     */
    static async getCampaignById(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null },
                include: [
                    { model: Tenant, as: 'tenant' },
                    { model: User, as: 'creator' },
                    { model: WhatsAppTemplate, as: 'template' }
                ]
            });

            return campaign;
        } catch (error) {
            console.error('❌ Error getting campaign by ID:', error);
            throw error;
        }
    }

    /**
     * Update campaign
     */
    static async updateCampaign(id, updateData, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            // Don't allow updating if campaign is running
            if (campaign.status === 'running') {
                throw new Error('Cannot update campaign while it is running');
            }

            await campaign.update(updateData);

            // Return updated campaign with relations
            return await Campaign.findOne({
                where: { id },
                include: [
                    { model: Tenant, as: 'tenant' },
                    { model: User, as: 'creator' },
                    { model: WhatsAppTemplate, as: 'template' }
                ]
            });
        } catch (error) {
            console.error('❌ Error updating campaign:', error);
            throw error;
        }
    }

    /**
     * Delete campaign
     */
    static async deleteCampaign(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            // Don't allow deleting if campaign is running
            if (campaign.status === 'running') {
                throw new Error('Cannot delete campaign while it is running');
            }

            await campaign.destroy();
            return true;
        } catch (error) {
            console.error('❌ Error deleting campaign:', error);
            throw error;
        }
    }

    /**
     * Start campaign execution (with 14-day cooldown check)
     */
    static async startCampaign(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            // Check cooldown period (14 days)
            const now = new Date();
            if (campaign.cooldown_until && new Date(campaign.cooldown_until) > now) {
                const daysLeft = Math.ceil((new Date(campaign.cooldown_until) - now) / (1000 * 60 * 60 * 24));
                throw new Error(`Campaign masih dalam cooldown. Bisa start lagi dalam ${daysLeft} hari`);
            }

            // Check if campaign is in draft status
            if (campaign.status !== 'draft') {
                throw new Error('Campaign harus dalam status draft untuk bisa di-start');
            }

            // Get target customers
            const customers = await this.getTargetCustomers(campaign.target_audience, tenant_id, campaign.follow_up_days);
            
            if (customers.length === 0) {
                throw new Error('No customers found for the selected target audience');
            }

            // Clear previous campaign data (reset)
            await CampaignCustomer.destroy({
                where: { campaign_id: campaign.id }
            });

            // Insert customers into campaign_customers table
            const campaignCustomers = customers.map(customer => ({
                campaign_id: campaign.id,
                customer_id: customer.id,
                customer_phone: customer.phone
            }));

            await CampaignCustomer.bulkCreate(campaignCustomers);

            // Update campaign with customer count and timestamps
            await campaign.update({
                total_customers: customers.length,
                status: 'running',
                started_at: now,
                last_started_at: now,
                sent_count: 0,
                failed_count: 0,
                cooldown_until: null
            });

            // Process template if exists
            let messageContent = campaign.message_content;
            if (campaign.template_id) {
                const template = await WhatsAppTemplate.findByPk(campaign.template_id);
                if (template) {
                    messageContent = template.content;
                }
            }

            // Create campaign data with processed message
            const campaignData = {
                ...campaign.toJSON(),
                message_content: messageContent
            };

            // Note: Background sending will be handled by cron job
            // Cron job will process customers every 10 seconds

            return {
                campaign,
                total_customers: customers.length,
                message: 'Campaign started successfully. Background processing will begin shortly.'
            };
        } catch (error) {
            console.error('❌ Error starting campaign:', error);
            throw error;
        }
    }

    /**
     * Pause campaign
     */
    static async pauseCampaign(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            if (campaign.status !== 'running') {
                throw new Error('Campaign is not running');
            }

            await campaign.update({ status: 'paused' });

            return campaign;
        } catch (error) {
            console.error('❌ Error pausing campaign:', error);
            throw error;
        }
    }

    /**
     * Get campaign progress (with cooldown info)
     */
    static async getCampaignProgress(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            // Get customer counts by status
            const customerStats = await CampaignCustomer.findAll({
                where: { campaign_id: id },
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status']
            });

            const stats = {
                pending: 0,
                sent: 0,
                failed: 0,
                skipped: 0
            };

            customerStats.forEach(stat => {
                stats[stat.status] = parseInt(stat.dataValues.count);
            });

            const total = campaign.total_customers;
            const sent = stats.sent;
            const failed = stats.failed;
            const pending = stats.pending;
            const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

            // Calculate estimated completion time (assuming 50 messages per hour)
            const rateLimit = 50; // messages per hour
            const estimatedHours = Math.ceil(pending / rateLimit);

            // Calculate cooldown info
            let cooldownInfo = null;
            if (campaign.cooldown_until) {
                const now = new Date();
                const cooldownUntil = new Date(campaign.cooldown_until);
                const daysLeft = Math.ceil((cooldownUntil - now) / (1000 * 60 * 60 * 24));
                
                if (cooldownUntil > now) {
                    cooldownInfo = {
                        daysLeft,
                        canStart: false,
                        cooldownUntil: campaign.cooldown_until
                    };
                } else {
                    cooldownInfo = {
                        daysLeft: 0,
                        canStart: true,
                        cooldownUntil: null
                    };
                }
            }

            return {
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    status: campaign.status,
                    started_at: campaign.started_at,
                    completed_at: campaign.completed_at,
                    last_started_at: campaign.last_started_at,
                    cooldown_until: campaign.cooldown_until
                },
                progress: {
                    total,
                    sent,
                    failed,
                    pending,
                    progress,
                    estimatedHours
                },
                cooldownInfo,
                stats
            };
        } catch (error) {
            console.error('❌ Error getting campaign progress:', error);
            throw error;
        }
    }

    /**
     * Get campaign customers
     */
    static async getCampaignCustomers(id, tenant_id, { page, limit, status }) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            const offset = (page - 1) * limit;
            
            const whereClause = { campaign_id: id };
            if (status) {
                whereClause.status = status;
            }

            const { count, rows } = await CampaignCustomer.findAndCountAll({
                where: whereClause,
                include: [
                    { model: Customer, as: 'customer' }
                ],
                order: [['createdAt', 'ASC']],
                limit,
                offset
            });

            return {
                customers: rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit
                }
            };
        } catch (error) {
            console.error('❌ Error getting campaign customers:', error);
            throw error;
        }
    }

    /**
     * Resume paused campaign
     */
    static async resumeCampaign(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            if (campaign.status !== 'paused') {
                throw new Error('Campaign is not paused');
            }

            // Get pending customers
            const pendingCustomers = await CampaignCustomer.findAll({
                where: {
                    campaign_id: id,
                    status: 'pending'
                },
                include: [
                    { model: Customer, as: 'customer' }
                ]
            });

            if (pendingCustomers.length === 0) {
                throw new Error('No pending customers to resume');
            }

            // Update campaign status
            await campaign.update({
                status: 'running'
            });

            // Get customer data for processing
            const customers = pendingCustomers.map(cc => ({
                id: cc.customer.id,
                name: cc.customer.name,
                phone: cc.customer.phone,
                email: cc.customer.email
            }));

            // Process template if exists
            let messageContent = campaign.message_content;
            if (campaign.template_id) {
                const template = await WhatsAppTemplate.findByPk(campaign.template_id);
                if (template) {
                    messageContent = template.content;
                }
            }

            // Create campaign data with processed message
            const campaignData = {
                ...campaign.toJSON(),
                message_content: messageContent
            };

            // Resume background sending process
            await this.processCampaignMessages(campaignData, customers);

            return {
                campaign,
                pending_customers: customers.length,
                message: 'Campaign resumed successfully'
            };
        } catch (error) {
            console.error('❌ Error resuming campaign:', error);
            throw error;
        }
    }

    /**
     * Get target customers based on follow-up days from campaign start date
     */
    static async getTargetCustomers(targetAudience, tenant_id, follow_up_days) {
        try {
            const whereClause = {
                tenant_id,
                deletedAt: null
            };

            switch (targetAudience) {
                case 'follow_up_15':
                    // Customers who haven't ordered in last 15 days from campaign start
                    whereClause.last_order_date = {
                        [Op.lte]: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                    };
                    break;
                
                case 'follow_up_30':
                    // Customers who haven't ordered in last 30 days from campaign start
                    whereClause.last_order_date = {
                        [Op.lte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    };
                    break;
                
                case 'follow_up_60':
                    // Customers who haven't ordered in last 60 days from campaign start
                    whereClause.last_order_date = {
                        [Op.lte]: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
                    };
                    break;
                
                case 'all':
                default:
                    // All customers (no filter)
                    break;
            }

            const customers = await Customer.findAll({
                where: whereClause,
                attributes: ['id', 'name', 'phone', 'email', 'last_order_date'],
                order: [['last_order_date', 'ASC']] // Oldest first
            });

            return customers;
        } catch (error) {
            console.error('❌ Error getting target customers:', error);
            throw error;
        }
    }

    /**
     * Process campaign batch for cron job (1 customer per campaign per cron run)
     */
    static async processCampaignBatch() {
        try {
            console.log('🔄 Processing campaign batch...');
            
            // Get all running campaigns from all tenants
            const runningCampaigns = await Campaign.findAll({
                where: { 
                    status: 'running',
                    deletedAt: null 
                },
                include: [
                    { model: Tenant, as: 'tenant' },
                    { model: WhatsAppTemplate, as: 'template' }
                ]
            });
            
            if (runningCampaigns.length === 0) {
                console.log('ℹ️ No running campaigns found');
                return { processed: 0, message: 'No running campaigns' };
            }
            
            let processedCount = 0;
            let errorCount = 0;
            
            // Process each campaign (1 customer per campaign per cron run)
            for (const campaign of runningCampaigns) {
                try {
                    await this.processSingleCampaign(campaign);
                    processedCount++;
                } catch (error) {
                    console.error(`❌ Error processing campaign ${campaign.id}:`, error);
                    errorCount++;
                }
            }
            
            console.log(`✅ Campaign batch processed: ${processedCount} successful, ${errorCount} errors`);
            return { 
                processed: processedCount, 
                errors: errorCount,
                message: `Processed ${processedCount} campaigns` 
            };
            
        } catch (error) {
            console.error('❌ Error processing campaign batch:', error);
            throw error;
        }
    }

    /**
     * Process single campaign (1 customer per cron run)
     */
    static async processSingleCampaign(campaign) {
        try {
            // Get next pending customer for this campaign
            const nextCustomer = await CampaignCustomer.findOne({
                where: {
                    campaign_id: campaign.id,
                    status: 'pending'
                },
                include: [
                    { model: Customer, as: 'customer' }
                ],
                order: [['createdAt', 'ASC']]
            });
            
            if (!nextCustomer) {
                // No more pending customers, check if campaign is complete
                await this.checkCampaignCompletion(campaign.id);
                return;
            }
            
            // Process template if exists
            let messageContent = campaign.message_content;
            if (campaign.template_id) {
                const template = await WhatsAppTemplate.findByPk(campaign.template_id);
                if (template) {
                    messageContent = template.content;
                }
            }
            
            // Send message using WhatsApp integration
            await this.sendCampaignMessage(campaign, nextCustomer, messageContent);
            
        } catch (error) {
            console.error(`❌ Error processing single campaign ${campaign.id}:`, error);
            throw error;
        }
    }

  /**
   * Send campaign message to customer
   */
  static async sendCampaignMessage(campaign, campaignCustomer, messageContent) {
    try {
      // Get tenant campaign WA session
      const waSession = await WaSession.findOne({
        where: {
          tenant_id: campaign.tenant_id,
          session_type: 'tenant_campaign',
          status: 'READY'
        }
      });
      
      if (!waSession) {
        throw new Error('No active campaign WA session found');
      }
      
      console.log(`📤 Sending message to customer ${campaignCustomer.customer_id} for campaign ${campaign.id} using session ${waSession.session_id}`);
      
      // Import waCampaignHelper
      const waCampaignHelper = require('../helpers/waCampaignHelper');
      
      // Send message through WA Gateway
      const result = await waCampaignHelper.sendMessage(
        waSession.session_id, 
        campaignCustomer.customer_phone, 
        messageContent
      );
      
      if (result.success) {
        // Update status to sent
        await campaignCustomer.update({
          status: 'sent',
          sent_at: new Date(),
          retry_count: 0
        });
        
        // Update campaign sent count
        await campaign.increment('sent_count');
        
        // Update session last activity
        await waSession.update({ last_activity: new Date() });
        
        console.log(`✅ Message sent to customer ${campaignCustomer.customer_id} for campaign ${campaign.id}`);
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
      
    } catch (error) {
      console.error(`❌ Failed to send message to customer ${campaignCustomer.customer_id}:`, error);
      
      // Increment retry count
      const newRetryCount = campaignCustomer.retry_count + 1;
      
      if (newRetryCount >= 3) {
        // Skip customer after 3 retries
        await campaignCustomer.update({
          status: 'skipped',
          error_message: error.message,
          retry_count: newRetryCount
        });
        
        // Update campaign failed count
        await campaign.increment('failed_count');
        
        console.log(`⏭️ Skipped customer ${campaignCustomer.customer_id} after ${newRetryCount} retries`);
      } else {
        // Keep as pending for retry
        await campaignCustomer.update({
          retry_count: newRetryCount,
          error_message: error.message
        });
        
        console.log(`🔄 Customer ${campaignCustomer.customer_id} will be retried (${newRetryCount}/3)`);
      }
    }
  }

    /**
     * Check campaign completion and set cooldown
     */
    static async checkCampaignCompletion(campaignId) {
        try {
            const campaign = await Campaign.findByPk(campaignId);
            if (!campaign) return;
            
            const pendingCount = await CampaignCustomer.count({
                where: {
                    campaign_id: campaignId,
                    status: 'pending'
                }
            });
            
            if (pendingCount === 0) {
                // Campaign completed
                const now = new Date();
                const cooldownUntil = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
                
                await campaign.update({
                    status: 'completed',
                    completed_at: now,
                    cooldown_until: cooldownUntil
                });
                
                console.log(`✅ Campaign ${campaignId} completed. Next start available in 14 days`);
            }
        } catch (error) {
            console.error(`❌ Error checking campaign completion ${campaignId}:`, error);
        }
    }

    /**
     * Process campaign messages with WhatsApp integration (Legacy method - kept for compatibility)
     */
    static async processCampaignMessages(campaign, customers) {
        const transaction = await sequelize.transaction();
        
        try {
            console.log(`🚀 Processing campaign messages for: ${campaign.name}`);
            
            // Get available WhatsApp session
            const sessionResult = await WACampaignHelper.getAvailableSessions();
            if (!sessionResult.success || !sessionResult.data.sessions || sessionResult.data.sessions.length === 0) {
                throw new Error('No WhatsApp sessions available');
            }

            // Use first available session
            const session = sessionResult.data.sessions[0];
            if (session.status !== 'READY') {
                throw new Error(`WhatsApp session ${session.id} is not ready (status: ${session.status})`);
            }

            console.log(`📱 Using WhatsApp session: ${session.id}`);

            // Process template if exists
            let messageContent = campaign.message_content;
            if (campaign.template_id) {
                const template = await WhatsAppTemplate.findByPk(campaign.template_id);
                if (template) {
                    messageContent = template.content;
                }
            }

            // Create campaign data with processed message
            const campaignData = {
                ...campaign.toJSON(),
                message_content: messageContent
            };

            // Process campaign with WA helper
            const result = await WACampaignHelper.processCampaign(campaignData, customers, session.id);
            
            if (result.success) {
            // Update campaign statistics with cooldown
            const now = new Date();
            const cooldownUntil = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
            
            await campaign.update({
                sent_count: result.data.success,
                failed_count: result.data.failed,
                status: 'completed',
                completed_at: now,
                cooldown_until: cooldownUntil
            }, { transaction });

                // Update individual customer records
                for (const customerResult of result.data.results) {
                    await CampaignCustomer.update(
                        {
                            status: customerResult.success ? 'sent' : 'failed',
                            sent_at: customerResult.success ? new Date() : null,
                            error_message: customerResult.success ? null : customerResult.error
                        },
                        {
                            where: {
                                campaign_id: campaign.id,
                                customer_id: customerResult.customer_id
                            },
                            transaction
                        }
                    );
                }

                await transaction.commit();
                console.log(`✅ Campaign completed: ${result.data.success} sent, ${result.data.failed} failed`);
            } else {
                // Mark campaign as error with cooldown
                const now = new Date();
                const cooldownUntil = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
                
                await campaign.update({
                    status: 'error',
                    error_message: result.message,
                    completed_at: now,
                    cooldown_until: cooldownUntil
                }, { transaction });
                
                await transaction.commit();
                console.error(`❌ Campaign failed: ${result.message}`);
            }

        } catch (error) {
            console.error('❌ Error processing campaign messages:', error);
            
            try {
                // Mark campaign as error with cooldown
                const now = new Date();
                const cooldownUntil = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
                
                await campaign.update({
                    status: 'error',
                    error_message: error.message,
                    completed_at: now,
                    cooldown_until: cooldownUntil
                }, { transaction });
                
                await transaction.commit();
            } catch (updateError) {
                console.error('❌ Error updating campaign status:', updateError);
                await transaction.rollback();
            }
        }
    }

    /**
     * Reset campaign (after cooldown period)
     */
    static async resetCampaign(id, tenant_id) {
        try {
            const campaign = await Campaign.findOne({
                where: { id, tenant_id, deletedAt: null }
            });

            if (!campaign) {
                return null;
            }

            // Check if cooldown period has passed
            const now = new Date();
            if (campaign.cooldown_until && new Date(campaign.cooldown_until) > now) {
                const daysLeft = Math.ceil((new Date(campaign.cooldown_until) - now) / (1000 * 60 * 60 * 24));
                throw new Error(`Campaign masih dalam cooldown. Bisa reset lagi dalam ${daysLeft} hari`);
            }

            // Reset campaign to draft status
            await campaign.update({
                status: 'draft',
                started_at: null,
                completed_at: null,
                cooldown_until: null,
                sent_count: 0,
                failed_count: 0,
                total_customers: 0,
                error_message: null
            });

            // Clear all campaign customers
            await CampaignCustomer.destroy({
                where: { campaign_id: id }
            });

            return {
                campaign,
                message: 'Campaign reset successfully. Ready for new campaign'
            };
        } catch (error) {
            console.error('❌ Error resetting campaign:', error);
            throw error;
        }
    }

    /**
     * Get customer count statistics
     */
    static async getCustomerCount(tenant_id, target_audience = 'all') {
        try {
            let whereClause = {
                tenant_id: tenant_id,
                deletedAt: null
            };

            // Filter by target audience based on membership
            if (target_audience === 'member') {
                whereClause.current_membership_id = {
                    [Op.ne]: null
                };
            } else if (target_audience === 'non_member') {
                whereClause.current_membership_id = null;
            }
            // 'all' means no additional filter

            const totalCustomers = await Customer.count({ where: whereClause });

            // Get member count (customers with active membership)
            const memberCount = await Customer.count({
                where: {
                    tenant_id: tenant_id,
                    deletedAt: null,
                    current_membership_id: {
                        [Op.ne]: null
                    }
                }
            });

            // Get non-member count (customers without membership)
            const nonMemberCount = await Customer.count({
                where: {
                    tenant_id: tenant_id,
                    deletedAt: null,
                    current_membership_id: null
                }
            });

            return {
                total: totalCustomers,
                member: memberCount,
                non_member: nonMemberCount,
                target_audience: target_audience
            };
        } catch (error) {
            console.error('❌ Error getting customer count:', error);
            throw error;
        }
    }

    /**
     * Update customer last order date (for cron job)
     */
    static async updateLastOrderDate() {
        try {
            console.log('🔄 Updating customer last_order_date...');
            
            // Get all customers with current last_order_date
            const customers = await Customer.findAll({
                where: { deletedAt: null },
                attributes: ['id', 'tenant_id', 'last_order_date']
            });
            
            let updatedCount = 0;
            let unchangedCount = 0;
            let errorCount = 0;
            
            for (const customer of customers) {
                try {
                    // Get latest order date for this customer
                    const latestOrder = await Order.findOne({
                        where: { 
                            customer_id: customer.id,
                            deletedAt: null // Only non-deleted orders
                        },
                        order: [['createdAt', 'DESC']],
                        attributes: ['createdAt']
                    });
                    
                    const newLastOrderDate = latestOrder ? latestOrder.createdAt : null;
                    const oldLastOrderDate = customer.last_order_date;
                    
                    // Check if data actually changed
                    const isChanged = JSON.stringify(newLastOrderDate) !== JSON.stringify(oldLastOrderDate);
                    
                    // Update customer last_order_date
                    await customer.update({
                        last_order_date: newLastOrderDate
                    });
                    
                    if (isChanged) {
                        updatedCount++;
                    } else {
                        unchangedCount++;
                    }
                    
                } catch (customerError) {
                    console.error(`❌ Error updating customer ${customer.id}:`, customerError);
                    errorCount++;
                }
            }
            
            console.log(`✅ Updated: ${updatedCount}, Unchanged: ${unchangedCount}, Errors: ${errorCount}`);
            
            return {
                total_customers: customers.length,
                updated: updatedCount,
                unchanged: unchangedCount,
                errors: errorCount,
                success: true
            };
        } catch (error) {
            console.error('❌ Error updating last order date:', error);
            throw error;
        }
    }

    /**
     * Get customer count preview for targeting
     */
    static async getCustomerCountPreview(tenant_id, target_audience, follow_up_days) {
        try {
            const whereClause = {
                tenant_id,
                deletedAt: null
            };

            // Apply targeting logic based on follow-up days
            switch (target_audience) {
                case 'follow_up_15':
                    whereClause.last_order_date = {
                        [Op.lte]: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                    };
                    break;
                case 'follow_up_30':
                    whereClause.last_order_date = {
                        [Op.lte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    };
                    break;
                case 'follow_up_60':
                    whereClause.last_order_date = {
                        [Op.lte]: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
                    };
                    break;
                case 'all':
                default:
                    // No filter
                    break;
            }

            const count = await Customer.count({ where: whereClause });
            
            // Calculate estimated duration (4,320 messages per day max)
            const messagesPerDay = 4320;
            const estimatedDays = Math.ceil(count / messagesPerDay);
            const estimatedHours = Math.ceil((count * 10) / 3600); // 10 seconds per message
            
            return {
                target_audience,
                follow_up_days: parseInt(follow_up_days),
                customer_count: count,
                estimated_days: estimatedDays,
                estimated_hours: estimatedHours,
                messages_per_day: messagesPerDay,
                rate_limit: "1 message per 10 seconds"
            };
        } catch (error) {
            console.error('❌ Error getting customer count preview:', error);
            throw error;
        }
    }
}

module.exports = CampaignService;
