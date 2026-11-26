const { FollowupUsageLimit, TenantLimitsConfig, MessageQueue } = require('../models');
const { Op } = require('sequelize');

class RateLimiterService {
    
    // =====================================================
    // LIMIT CHECKING METHODS
    // =====================================================

    /**
     * Check if tenant can create new sequence
     */
    static async canCreateSequence(tenant_id) {
        try {
            const config = await this.getTenantLimitsConfig(tenant_id);
            const currentSequences = await this.getCurrentUsage(tenant_id, 'sequences_active');
            
            return {
                allowed: currentSequences < config.max_sequences,
                current: currentSequences,
                limit: config.max_sequences,
                remaining: Math.max(0, config.max_sequences - currentSequences)
            };
        } catch (error) {
            throw new Error(`Failed to check sequence limit: ${error.message}`);
        }
    }

    /**
     * Check if tenant can send broadcast this month
     */
    static async canSendBroadcast(tenant_id, recipientCount = 0) {
        try {
            const config = await this.getTenantLimitsConfig(tenant_id);
            const currentBroadcasts = await this.getCurrentUsage(tenant_id, 'broadcasts_monthly');
            
            // Check monthly broadcast limit
            const monthlyCheck = {
                allowed: currentBroadcasts < config.max_broadcasts_monthly,
                current: currentBroadcasts,
                limit: config.max_broadcasts_monthly,
                remaining: Math.max(0, config.max_broadcasts_monthly - currentBroadcasts)
            };

            // Check recipient limit per broadcast
            const recipientCheck = {
                allowed: recipientCount <= config.max_recipients_per_broadcast,
                current: recipientCount,
                limit: config.max_recipients_per_broadcast,
                remaining: Math.max(0, config.max_recipients_per_broadcast - recipientCount)
            };

            return {
                monthly: monthlyCheck,
                recipients: recipientCheck,
                canSend: monthlyCheck.allowed && recipientCheck.allowed
            };
        } catch (error) {
            throw new Error(`Failed to check broadcast limit: ${error.message}`);
        }
    }

    /**
     * Check if tenant can send message (daily/hourly limits)
     */
    static async canSendMessage(tenant_id) {
        try {
            const config = await this.getTenantLimitsConfig(tenant_id);
            
            // Check daily limit
            const dailyUsage = await this.getCurrentUsage(tenant_id, 'messages_daily');
            const dailyCheck = {
                allowed: dailyUsage < config.max_messages_daily,
                current: dailyUsage,
                limit: config.max_messages_daily,
                remaining: Math.max(0, config.max_messages_daily - dailyUsage)
            };

            // Check hourly limit
            const hourlyUsage = await this.getCurrentUsage(tenant_id, 'messages_hourly');
            const hourlyCheck = {
                allowed: hourlyUsage < config.max_messages_hourly,
                current: hourlyUsage,
                limit: config.max_messages_hourly,
                remaining: Math.max(0, config.max_messages_hourly - hourlyUsage)
            };

            return {
                daily: dailyCheck,
                hourly: hourlyCheck,
                canSend: dailyCheck.allowed && hourlyCheck.allowed,
                delaySeconds: config.message_delay_seconds
            };
        } catch (error) {
            throw new Error(`Failed to check message limit: ${error.message}`);
        }
    }

    /**
     * Check if sequence can have more templates
     */
    static async canAddTemplate(tenant_id, sequenceId, currentTemplateCount) {
        try {
            const config = await this.getTenantLimitsConfig(tenant_id);
            
            return {
                allowed: currentTemplateCount < config.max_templates_per_sequence,
                current: currentTemplateCount,
                limit: config.max_templates_per_sequence,
                remaining: Math.max(0, config.max_templates_per_sequence - currentTemplateCount)
            };
        } catch (error) {
            throw new Error(`Failed to check template limit: ${error.message}`);
        }
    }

    // =====================================================
    // USAGE TRACKING METHODS
    // =====================================================

    /**
     * Increment usage counter
     */
    static async incrementUsage(tenant_id, limitType, increment = 1) {
        try {
            const now = new Date();
            let resetDate, resetHour;

            // Set reset periods based on limit type
            switch (limitType) {
                case 'sequences_active':
                    resetDate = now.toISOString().split('T')[0]; // Today
                    break;
                case 'broadcasts_monthly':
                    resetDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; // First of month
                    break;
                case 'messages_daily':
                    resetDate = now.toISOString().split('T')[0]; // Today
                    break;
                case 'messages_hourly':
                    resetDate = now.toISOString().split('T')[0]; // Today
                    resetHour = now.getHours(); // Current hour
                    break;
            }

            // Get or create usage record
            const [usageRecord] = await FollowupUsageLimit.findOrCreate({
                where: {
                    tenant_id: tenant_id,
                    limit_type: limitType
                },
                defaults: {
                    current_usage: 0,
                    max_allowed: await this.getDefaultLimit(limitType),
                    reset_date: resetDate,
                    reset_hour: resetHour
                }
            });

            // Check if reset is needed
            const needsReset = this.needsReset(usageRecord, limitType, now);
            if (needsReset) {
                await usageRecord.update({
                    current_usage: increment,
                    reset_date: resetDate,
                    reset_hour: resetHour,
                    last_reset_at: now
                });
            } else {
                await usageRecord.increment('current_usage', { by: increment });
            }

            return usageRecord.reload();
        } catch (error) {
            throw new Error(`Failed to increment usage: ${error.message}`);
        }
    }

    /**
     * Get current usage for a limit type
     */
    static async getCurrentUsage(tenant_id, limitType) {
        try {
            const now = new Date();
            
            const usageRecord = await FollowupUsageLimit.findOne({
                where: {
                    tenant_id: tenant_id,
                    limit_type: limitType
                }
            });

            if (!usageRecord) {
                return 0;
            }

            // Check if reset is needed
            const needsReset = this.needsReset(usageRecord, limitType, now);
            if (needsReset) {
                await this.resetUsage(tenant_id, limitType);
                return 0;
            }

            return usageRecord.current_usage;
        } catch (error) {
            throw new Error(`Failed to get current usage: ${error.message}`);
        }
    }

    /**
     * Reset usage counter
     */
    static async resetUsage(tenant_id, limitType) {
        try {
            const now = new Date();
            let resetDate, resetHour;

            switch (limitType) {
                case 'messages_daily':
                    resetDate = now.toISOString().split('T')[0];
                    break;
                case 'messages_hourly':
                    resetDate = now.toISOString().split('T')[0];
                    resetHour = now.getHours();
                    break;
                case 'broadcasts_monthly':
                    resetDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                    break;
            }

            await FollowupUsageLimit.update({
                current_usage: 0,
                reset_date: resetDate,
                reset_hour: resetHour,
                last_reset_at: now
            }, {
                where: {
                    tenant_id: tenant_id,
                    limit_type: limitType
                }
            });

            return true;
        } catch (error) {
            throw new Error(`Failed to reset usage: ${error.message}`);
        }
    }

    // =====================================================
    // MESSAGE QUEUE MANAGEMENT
    // =====================================================

    /**
     * Add message to queue with rate limiting
     */
    static async queueMessage(messageData) {
        try {
            const { tenant_id } = messageData;
            
            // Check if can send message
            const messageCheck = await this.canSendMessage(tenant_id);
            if (!messageCheck.canSend) {
                throw new Error(`Rate limit exceeded: Daily (${messageCheck.daily.current}/${messageCheck.daily.limit}), Hourly (${messageCheck.hourly.current}/${messageCheck.hourly.limit})`);
            }

            // Calculate scheduled time with delay
            const now = new Date();
            const delayMs = messageCheck.delaySeconds * 1000;
            const scheduledAt = new Date(now.getTime() + delayMs);

            // Create message in queue
            const queueMessage = await MessageQueue.create({
                ...messageData,
                scheduled_at: scheduledAt,
                status: 'pending'
            });

            // Increment usage counters
            await this.incrementUsage(tenant_id, 'messages_daily');
            await this.incrementUsage(tenant_id, 'messages_hourly');

            return queueMessage;
        } catch (error) {
            throw new Error(`Failed to queue message: ${error.message}`);
        }
    }

    /**
     * Get next messages ready to send
     */
    static async getReadyMessages(limit = 10) {
        try {
            const now = new Date();
            
            return await MessageQueue.findAll({
                where: {
                    status: 'pending',
                    scheduled_at: {
                        [Op.lte]: now
                    }
                },
                order: [
                    ['priority', 'ASC'],
                    ['scheduled_at', 'ASC']
                ],
                limit: limit,
                include: [
                    {
                        model: require('../models').Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone', 'email']
                    },
                    {
                        model: require('../models').WhatsAppTemplate,
                        as: 'template',
                        attributes: ['id', 'name', 'template_content', 'variables']
                    }
                ]
            });
        } catch (error) {
            throw new Error(`Failed to get ready messages: ${error.message}`);
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get tenant limits configuration
     */
    static async getTenantLimitsConfig(tenant_id) {
        try {
            let config = await TenantLimitsConfig.findOne({
                where: { tenant_id: tenant_id }
            });

            if (!config) {
                // Create default config
                config = await TenantLimitsConfig.create({
                    tenant_id: tenant_id,
                    plan_type: 'basic'
                });
            }

            return config;
        } catch (error) {
            throw new Error(`Failed to get tenant limits config: ${error.message}`);
        }
    }

    /**
     * Check if usage needs reset
     */
    static needsReset(usageRecord, limitType, currentTime) {
        const now = new Date(currentTime);
        
        switch (limitType) {
            case 'messages_daily':
            case 'broadcasts_monthly':
                const resetDate = new Date(usageRecord.reset_date);
                return now.toDateString() !== resetDate.toDateString();
                
            case 'messages_hourly':
                const recordHour = usageRecord.reset_hour;
                return now.getHours() !== recordHour;
                
            default:
                return false;
        }
    }

    /**
     * Get default limit for limit type
     */
    static async getDefaultLimit(limitType) {
        const defaults = {
            'sequences_active': 1,
            'broadcasts_monthly': 2,
            'messages_daily': 50,
            'messages_hourly': 8,
            'templates_per_sequence': 4
        };
        
        return defaults[limitType] || 0;
    }

    /**
     * Get all limits status for tenant
     */
    static async getTenantLimitsStatus(tenant_id) {
        try {
            const config = await this.getTenantLimitsConfig(tenant_id);
            
            const [
                sequenceCheck,
                broadcastCheck,
                messageCheck
            ] = await Promise.all([
                this.canCreateSequence(tenant_id),
                this.canSendBroadcast(tenant_id, 0),
                this.canSendMessage(tenant_id)
            ]);

            return {
                tenant_id: tenant_id,
                plan_type: config.plan_type,
                sequences: sequenceCheck,
                broadcasts: broadcastCheck.monthly,
                messages: {
                    daily: messageCheck.daily,
                    hourly: messageCheck.hourly
                },
                limits: {
                    max_sequences: config.max_sequences,
                    max_broadcasts_monthly: config.max_broadcasts_monthly,
                    max_recipients_per_broadcast: config.max_recipients_per_broadcast,
                    max_messages_daily: config.max_messages_daily,
                    max_messages_hourly: config.max_messages_hourly,
                    max_templates_per_sequence: config.max_templates_per_sequence,
                    message_delay_seconds: config.message_delay_seconds
                }
            };
        } catch (error) {
            throw new Error(`Failed to get tenant limits status: ${error.message}`);
        }
    }
}

module.exports = RateLimiterService;
