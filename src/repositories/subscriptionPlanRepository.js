const { SubscriptionPlan, Subscription, Op, sequelize } = require('../models');

class SubscriptionPlanRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await SubscriptionPlan.create(data, { transaction });
            
            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return result;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    };

    static async getAll(search, is_active) {
        try {
            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            if (is_active !== undefined) {
                whereClause.is_active = is_active === 'true' || is_active === true;
            }

            const result = await SubscriptionPlan.findAll({
                where: whereClause,
                order: [['sort_order', 'ASC'], ['name', 'ASC']],
                include: [
                    {
                        association: 'subscriptions',
                        attributes: ['id', 'status', 'start_date', 'end_date'],
                        limit: 5 // Limit to avoid memory issues
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAvailablePlans() {
        try {
            const result = await SubscriptionPlan.findAll({
                where: {
                    is_active: true
                },
                order: [['sort_order', 'ASC'], ['name', 'ASC']],
                attributes: [
                    'id', 'name', 'description', 'price', 'duration_days',
                    'max_branches', 'max_users', 'max_orders_per_month', 'features'
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await SubscriptionPlan.findByPk(id, {
                include: [
                    {
                        association: 'subscriptions',
                        attributes: ['id', 'status', 'start_date', 'end_date', 'tenant_id'],
                        limit: 10 // Limit to avoid memory issues
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByPrice(price) {
        try {
            // Convert price to string for comparison (database stores as DECIMAL/STRING)
            const priceStr = typeof price === 'string' ? price : parseFloat(price).toFixed(2);
            
            console.log('🔍 SubscriptionPlanRepository.getByPrice - Searching for plan with price:', priceStr);
            
            const result = await SubscriptionPlan.findOne({
                where: { 
                    price: priceStr,
                    is_active: true
                },
                order: [['sort_order', 'ASC']]
            });

            console.log('🔍 SubscriptionPlanRepository.getByPrice - Result:', result ? {
                id: result.id,
                name: result.name,
                price: result.price
            } : 'Not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await SubscriptionPlan.update(data, {
                where: { id },
                transaction
            });

            if (result[0] === 0) throw new Error('Subscription plan not found');

            await transaction.commit();

            return await this.getById(id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            // Check if plan has active subscriptions
            const activeSubscriptions = await Subscription.count({
                where: {
                    plan_id: id,
                    status: 'active'
                },
                transaction
            });

            if (activeSubscriptions > 0) {
                throw new Error('Cannot delete subscription plan with active subscriptions');
            }

            const result = await SubscriptionPlan.destroy({
                where: { id },
                transaction
            });

            if (result === 0) throw new Error('Subscription plan not found');

            await transaction.commit();

            return { message: 'Subscription plan deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getActivePlans() {
        try {
            const result = await SubscriptionPlan.findAll({
                where: { is_active: true },
                order: [['sort_order', 'ASC'], ['name', 'ASC']],
                attributes: ['id', 'name', 'description', 'price', 'duration_days', 'max_branches', 'max_users', 'max_orders_per_month', 'features']
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async toggleStatus(id, is_active) {
        const transaction = await sequelize.transaction();
        try {
            const result = await SubscriptionPlan.update(
                { is_active },
                {
                    where: { id },
                    transaction
                }
            );

            if (result[0] === 0) throw new Error('Subscription plan not found');

            await transaction.commit();

            return await this.getById(id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getPlanStats(id) {
        try {
            // Verify plan exists
            const plan = await SubscriptionPlan.findByPk(id);
            if (!plan) throw new Error('Subscription plan not found');

            const [
                totalSubscriptions,
                activeSubscriptions,
                expiredSubscriptions,
                cancelledSubscriptions,
                totalRevenue,
                activeRevenue
            ] = await Promise.all([
                // Total subscriptions count
                Subscription.count({ where: { plan_id: id } }),
                
                // Active subscriptions count
                Subscription.count({ 
                    where: { 
                        plan_id: id,
                        status: 'active'
                    }
                }),
                
                // Expired subscriptions count
                Subscription.count({ 
                    where: { 
                        plan_id: id,
                        status: 'expired'
                    }
                }),
                
                // Cancelled subscriptions count
                Subscription.count({ 
                    where: { 
                        plan_id: id,
                        status: 'cancelled'
                    }
                }),
                
                // Total revenue from all subscriptions
                Subscription.sum('final_price', { 
                    where: { 
                        plan_id: id,
                        status: ['active', 'expired']
                    }
                }),
                
                // Revenue from active subscriptions only
                Subscription.sum('final_price', { 
                    where: { 
                        plan_id: id,
                        status: 'active'
                    }
                })
            ]);

            const stats = {
                plan: {
                    id: plan.id,
                    name: plan.name,
                    price: plan.price,
                    duration_days: plan.duration_days
                },
                subscriptions: {
                    total: totalSubscriptions,
                    active: activeSubscriptions,
                    expired: expiredSubscriptions,
                    cancelled: cancelledSubscriptions
                },
                revenue: {
                    total: totalRevenue || 0,
                    active: activeRevenue || 0,
                    expired: (totalRevenue || 0) - (activeRevenue || 0)
                },
                utilization: {
                    active_percentage: totalSubscriptions > 0 ? ((activeSubscriptions / totalSubscriptions) * 100).toFixed(1) : 0,
                    revenue_per_subscription: totalSubscriptions > 0 ? ((totalRevenue || 0) / totalSubscriptions).toFixed(2) : 0
                }
            };

            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };
}

module.exports = SubscriptionPlanRepository;
