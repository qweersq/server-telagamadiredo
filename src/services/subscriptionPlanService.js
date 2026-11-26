const { Subscription, SubscriptionPlan } = require('../models');

class SubscriptionPlanService {
    /**
     * Get current subscription for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Object} Current subscription
     */
    static async getCurrentSubscription(tenantId) {
        try {
            const subscription = await Subscription.findOne({
                where: {
                    tenant_id: tenantId,
                    status: 'active'
                },
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan'
                }],
                order: [['createdAt', 'DESC']]
            });

            if (!subscription) {
                throw new Error('Active subscription not found');
            }

            return subscription;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.getCurrentSubscription - Error:', error);
            throw error;
        }
    }

    /**
     * Get subscription plan details
     * @param {number} subscriptionId - Subscription ID
     * @returns {Object} Subscription with plan details
     */
    static async getSubscriptionPlan(subscriptionId) {
        try {
            const subscription = await Subscription.findByPk(subscriptionId, {
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan'
                }]
            });

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            return subscription;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.getSubscriptionPlan - Error:', error);
            throw error;
        }
    }

    /**
     * Update subscription plan
     * @param {number} subscriptionId - Subscription ID
     * @param {number} newPlanId - New plan ID
     * @returns {Object} Updated subscription
     */
    static async updateSubscriptionPlan(subscriptionId, newPlanId) {
        try {
            console.log('🔍 SubscriptionPlanService.updateSubscriptionPlan - Updating subscription:', { subscriptionId, newPlanId });

            // Get new plan details
            const newPlan = await SubscriptionPlan.findByPk(newPlanId);
            if (!newPlan) {
                throw new Error('New plan not found');
            }

            // Update subscription
            const updateData = {
                plan_id: newPlanId,
                price: newPlan.price,
                final_price: newPlan.price,
                updated_at: new Date()
            };

            const updatedSubscription = await Subscription.update(updateData, {
                where: { id: subscriptionId },
                returning: true
            });

            console.log('✅ SubscriptionPlanService.updateSubscriptionPlan - Subscription updated successfully');

            return {
                subscription_id: subscriptionId,
                new_plan_id: newPlanId,
                new_plan_name: newPlan.name,
                new_price: newPlan.price,
                status: 'updated'
            };

        } catch (error) {
            console.error('❌ SubscriptionPlanService.updateSubscriptionPlan - Error:', error);
            throw error;
        }
    }

    /**
     * Create new subscription
     * @param {number} tenantId - Tenant ID
     * @param {number} planId - Plan ID
     * @returns {Object} Created subscription
     */
    static async createNewSubscription(tenantId, planId) {
        try {
            console.log('🔍 SubscriptionPlanService.createNewSubscription - Creating new subscription:', { tenantId, planId });

            // Get plan details
            const plan = await SubscriptionPlan.findByPk(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            // Create new subscription
            const subscriptionData = {
                tenant_id: tenantId,
                plan_id: planId,
                status: 'active',
                start_date: new Date(),
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                auto_renew: true,
                price: plan.price,
                final_price: plan.price,
                payment_method: 'manual',
                created_at: new Date(),
                updated_at: new Date()
            };

            const newSubscription = await Subscription.create(subscriptionData);

            console.log('✅ SubscriptionPlanService.createNewSubscription - New subscription created successfully');

            return {
                subscription_id: newSubscription.id,
                plan_id: planId,
                plan_name: plan.name,
                price: plan.price,
                status: 'created'
            };

        } catch (error) {
            console.error('❌ SubscriptionPlanService.createNewSubscription - Error:', error);
            throw error;
        }
    }

    /**
     * Get plan details
     * @param {number} planId - Plan ID
     * @returns {Object} Plan details
     */
    static async getPlanDetails(planId) {
        try {
            const plan = await SubscriptionPlan.findByPk(planId);
            if (!plan) {
                throw new Error('Plan not found');
            }
            return plan;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.getPlanDetails - Error:', error);
            throw error;
        }
    }

    /**
     * Compare plans
     * @param {number} currentPlanId - Current plan ID
     * @param {number} newPlanId - New plan ID
     * @returns {Object} Plan comparison
     */
    static async comparePlans(currentPlanId, newPlanId) {
        try {
            const [currentPlan, newPlan] = await Promise.all([
                this.getPlanDetails(currentPlanId),
                this.getPlanDetails(newPlanId)
            ]);

            const priceDifference = parseFloat(newPlan.price) - parseFloat(currentPlan.price);

            return {
                current_plan: {
                    id: currentPlan.id,
                    name: currentPlan.name,
                    price: currentPlan.price
                },
                new_plan: {
                    id: newPlan.id,
                    name: newPlan.name,
                    price: newPlan.price
                },
                price_difference: priceDifference,
                action: priceDifference > 0 ? 'upgrade' : 'downgrade'
            };
        } catch (error) {
            console.error('❌ SubscriptionPlanService.comparePlans - Error:', error);
            throw error;
        }
    }

    /**
     * Handle subscription transition
     * @param {Object} oldSubscription - Old subscription
     * @param {Object} newPlan - New plan
     * @returns {Object} Transition result
     */
    static async handleSubscriptionTransition(oldSubscription, newPlan) {
        try {
            // End old subscription
            await Subscription.update(
                { 
                    status: 'expired',
                    end_date: new Date(),
                    updated_at: new Date()
                },
                { where: { id: oldSubscription.id } }
            );

            // Create new subscription
            const newSubscription = await this.createNewSubscription(oldSubscription.tenant_id, newPlan.id);

            return {
                old_subscription_id: oldSubscription.id,
                new_subscription_id: newSubscription.subscription_id,
                transition_date: new Date(),
                status: 'transitioned'
            };
        } catch (error) {
            console.error('❌ SubscriptionPlanService.handleSubscriptionTransition - Error:', error);
            throw error;
        }
    }

    /**
     * Get all active subscription plans
     * @returns {Array} Array of active subscription plans
     */
    static async getActivePlans() {
        try {
            console.log('🔍 SubscriptionPlanService.getActivePlans - Fetching active plans');
            
            const plans = await SubscriptionPlan.findAll({
                where: {
                    is_active: true
                },
                order: [['sort_order', 'ASC'], ['price', 'ASC']]
            });

            console.log(`✅ SubscriptionPlanService.getActivePlans - Found ${plans.length} active plans`);
            return plans;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.getActivePlans - Error:', error);
            throw error;
        }
    }

    /**
     * Get all subscription plans with search and filter
     * @param {string} search - Search term for name or description
     * @param {string} is_active - Filter by active status ('true' or 'false')
     * @returns {Array} Array of subscription plans
     */
    static async getAll(search = '', is_active = null) {
        try {
            console.log('🔍 SubscriptionPlanService.getAll - Params:', { search, is_active });
            
            const { Op } = require('sequelize');
            
            // Build where clause
            const whereClause = {};
            
            // Add search filter
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }
            
            // Add is_active filter
            if (is_active !== null) {
                whereClause.is_active = is_active === 'true';
            }
            
            const plans = await SubscriptionPlan.findAll({
                where: whereClause,
                order: [['sort_order', 'ASC'], ['price', 'ASC']]
            });

            console.log(`✅ SubscriptionPlanService.getAll - Found ${plans.length} plans`);
            return plans;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.getAll - Error:', error);
            throw error;
        }
    }

    /**
     * Get subscription plan by ID
     * @param {number} id - Plan ID
     * @returns {Object} Subscription plan details
     */
    static async getById(id) {
        try {
            console.log('🔍 SubscriptionPlanService.getById - Fetching plan:', id);
            
            const plan = await SubscriptionPlan.findByPk(id);
            
            if (!plan) {
                throw new Error('Subscription plan not found');
            }
            
            console.log('✅ SubscriptionPlanService.getById - Plan found:', plan.name);
            return plan;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.getById - Error:', error);
            throw error;
        }
    }

    /**
     * Update subscription plan
     * @param {number} id - Plan ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated subscription plan
     */
    static async update(id, updateData) {
        try {
            console.log('🔍 SubscriptionPlanService.update - Updating plan:', id, updateData);
            
            // Check if plan exists
            const existingPlan = await SubscriptionPlan.findByPk(id);
            if (!existingPlan) {
                throw new Error('Subscription plan not found');
            }
            
            // Update the plan
            await SubscriptionPlan.update(updateData, {
                where: { id: id }
            });
            
            // Get updated plan
            const updatedPlan = await SubscriptionPlan.findByPk(id);
            
            console.log('✅ SubscriptionPlanService.update - Plan updated:', updatedPlan.name);
            return updatedPlan;
        } catch (error) {
            console.error('❌ SubscriptionPlanService.update - Error:', error);
            throw error;
        }
    }
}

module.exports = SubscriptionPlanService;