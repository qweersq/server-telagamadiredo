const SubscriptionRepository = require('../repositories/subscriptionRepository');
const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
const TenantRepository = require('../repositories/tenantRepository');
const PlanHelper = require('../helpers/planHelper');
const moment = require('moment');

class SubscriptionService {
    static async create(data) {
        try {
            // Validate required fields
            if (!data.tenant_id || !data.plan_id || !data.start_date) {
                throw new Error('Required fields: tenant_id, plan_id, start_date');
            }

            // Validate tenant exists
            const tenant = await TenantRepository.getById(data.tenant_id);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Validate plan exists
            const plan = await SubscriptionPlanRepository.getById(data.plan_id);
            if (!plan) {
                throw new Error('Subscription plan not found');
            }

            // ✅ NEW: Check if NotaFree plan
            const isNotaFree = PlanHelper.isFreePlan(plan);

            // Validate dates
            const startDate = moment(data.start_date);
            let endDate = null;
            
            if (!isNotaFree) {
                // For paid plans, end_date is required
                if (!data.end_date) {
                    throw new Error('end_date is required for paid plans');
                }
                endDate = moment(data.end_date);
                
                if (!startDate.isValid() || !endDate.isValid()) {
                    throw new Error('Invalid date format');
                }

                if (endDate.isBefore(startDate)) {
                    throw new Error('End date must be after start date');
                }
            } else {
                // For NotaFree, end_date should be NULL
                if (data.end_date !== null && data.end_date !== undefined) {
                    console.log('⚠️ SubscriptionService.create - NotaFree plan should have end_date = NULL, ignoring provided end_date');
                }
            }

            // Check if tenant already has active subscription
            const existingSubscription = await SubscriptionRepository.getActiveByTenant(data.tenant_id);
            if (existingSubscription) {
                throw new Error('Tenant already has an active subscription');
            }

            // Set default values
            const subscriptionData = {
                tenant_id: data.tenant_id,
                plan_id: data.plan_id,
                status: data.status || (isNotaFree ? 'active' : 'pending'),
                start_date: startDate.toDate(),
                end_date: isNotaFree ? null : endDate.toDate(), // ✅ NULL for NotaFree
                auto_renew: isNotaFree ? false : (data.auto_renew !== undefined ? data.auto_renew : true), // ✅ No auto-renew for NotaFree
                price: data.price || plan.price || 0,
                discount_amount: data.discount_amount || 0,
                final_price: data.final_price || (data.price || plan.price || 0) - (data.discount_amount || 0),
                payment_method: isNotaFree ? 'free' : (data.payment_method || null),
                notes: data.notes || (isNotaFree ? 'NotaFree plan - gratis selamanya' : null)
            };

            const result = await SubscriptionRepository.create(subscriptionData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAll(search, tenant_id, plan_id, status) {
        try {
            const result = await SubscriptionRepository.getAll(search, tenant_id, plan_id, status);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await SubscriptionRepository.getById(id);
            if (!result) throw new Error('Subscription not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(id, data) {
        try {
            // Validate subscription exists
            const existingSubscription = await SubscriptionRepository.getById(id);
            if (!existingSubscription) throw new Error('Subscription not found');

            // Validate plan if provided
            if (data.plan_id) {
                const plan = await SubscriptionPlanRepository.getById(data.plan_id);
                if (!plan) throw new Error('Subscription plan not found');
            }

            // ✅ NEW: Check if NotaFree plan
            const plan = existingSubscription.plan_id ? await SubscriptionPlanRepository.getById(existingSubscription.plan_id) : null;
            const isNotaFree = plan && PlanHelper.isFreePlan(plan);

            // Validate dates if provided
            if (data.start_date || data.end_date) {
                const startDate = data.start_date ? moment(data.start_date) : moment(existingSubscription.start_date);
                
                // For NotaFree, end_date should remain NULL
                if (isNotaFree && data.end_date !== null && data.end_date !== undefined) {
                    console.log('⚠️ SubscriptionService.update - NotaFree plan should have end_date = NULL, ignoring provided end_date');
                    data.end_date = null;
                }
                
                if (!isNotaFree && data.end_date) {
                    const endDate = moment(data.end_date);
                    if (endDate.isBefore(startDate)) {
                        throw new Error('End date must be after start date');
                    }
                }
            }

            // Prepare update data
            const updateData = {};
            if (data.plan_id !== undefined) updateData.plan_id = data.plan_id;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.start_date !== undefined) updateData.start_date = moment(data.start_date).toDate();
            // ✅ NEW: Handle end_date for NotaFree
            if (data.end_date !== undefined) {
                if (isNotaFree) {
                    updateData.end_date = null; // Force NULL for NotaFree
                } else {
                    updateData.end_date = moment(data.end_date).toDate();
                }
            }
            if (data.auto_renew !== undefined) {
                // ✅ NEW: Force auto_renew = false for NotaFree
                updateData.auto_renew = isNotaFree ? false : data.auto_renew;
            }
            if (data.price !== undefined) updateData.price = data.price;
            if (data.discount_amount !== undefined) updateData.discount_amount = data.discount_amount;
            if (data.final_price !== undefined) updateData.final_price = data.final_price;
            if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
            if (data.notes !== undefined) updateData.notes = data.notes;

            const result = await SubscriptionRepository.update(id, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        try {
            const result = await SubscriptionRepository.delete(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByTenant(tenant_id) {
        try {
            const result = await SubscriptionRepository.getByTenant(tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getPendingPaymentByTenant(tenant_id) {
        try {
            const result = await SubscriptionRepository.getPendingPaymentByTenant(tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getActiveSubscriptions() {
        try {
            const result = await SubscriptionRepository.getActiveSubscriptions();
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getExpiredSubscriptions() {
        try {
            const result = await SubscriptionRepository.getExpiredSubscriptions();
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateStatus(id, status) {
        try {
            const validStatuses = ['pending', 'active', 'expired', 'cancelled', 'suspended'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid subscription status');
            }

            const result = await SubscriptionRepository.updateStatus(id, status);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async renewSubscription(id, days = 30) {
        try {
            const subscription = await SubscriptionRepository.getById(id);
            if (!subscription) throw new Error('Subscription not found');

            // ✅ NEW: Check if NotaFree plan - cannot renew
            const plan = subscription.plan_id ? await SubscriptionPlanRepository.getById(subscription.plan_id) : null;
            if (plan && PlanHelper.isFreePlan(plan)) {
                throw new Error('NotaFree plan cannot be renewed (gratis selamanya)');
            }

            if (subscription.status !== 'active') {
                throw new Error('Only active subscriptions can be renewed');
            }

            if (!subscription.end_date) {
                throw new Error('Cannot renew subscription without end_date');
            }

            const newEndDate = moment(subscription.end_date).add(days, 'days').toDate();
            
            const result = await SubscriptionRepository.update(id, {
                end_date: newEndDate,
                status: 'active'
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async cancelSubscription(id, reason = '') {
        try {
            const subscription = await SubscriptionRepository.getById(id);
            if (!subscription) throw new Error('Subscription not found');

            if (subscription.status === 'cancelled') {
                throw new Error('Subscription is already cancelled');
            }

            const result = await SubscriptionRepository.update(id, {
                status: 'cancelled',
                notes: subscription.notes ? `${subscription.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getSubscriptionStats(id) {
        try {
            const result = await SubscriptionRepository.getSubscriptionStats(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async createOrUpdateSubscription(data) {
        try {
            console.log('🔍 SubscriptionService.createOrUpdateSubscription - Data:', data);
            
            const { tenant_id, plan_id, amount, payment_method, notes } = data;
            
            // Get plan to check if NotaFree
            const plan = plan_id ? await SubscriptionPlanRepository.getById(plan_id) : await SubscriptionPlanRepository.getById(1);
            const isNotaFree = plan && PlanHelper.isFreePlan(plan);
            
            // Check if tenant already has an active subscription
            const existingSubscription = await SubscriptionRepository.getActiveByTenantId(tenant_id);
            
            if (existingSubscription) {
                // Update existing subscription
                const updateData = {
                    status: 'active',
                    end_date: isNotaFree ? null : moment().add(30, 'days').toDate(), // ✅ NULL for NotaFree, extend by 30 days for paid
                    auto_renew: isNotaFree ? false : true, // ✅ No auto-renew for NotaFree
                    payment_method: isNotaFree ? 'free' : payment_method,
                    notes: notes || (isNotaFree ? 'NotaFree plan - gratis selamanya' : 'Subscription extended after payment approval')
                };
                
                const updatedSubscription = await SubscriptionRepository.update(existingSubscription.id, updateData);
                console.log('✅ SubscriptionService.createOrUpdateSubscription - Updated existing subscription:', updatedSubscription.id);
                
                return updatedSubscription;
            } else {
                // Create new subscription
                const subscriptionData = {
                    tenant_id: tenant_id,
                    plan_id: plan_id || 1, // Default to plan 1
                    status: 'active',
                    start_date: new Date(),
                    end_date: isNotaFree ? null : moment().add(30, 'days').toDate(), // ✅ NULL for NotaFree, 30 days for paid
                    auto_renew: isNotaFree ? false : true, // ✅ No auto-renew for NotaFree
                    price: amount || 0,
                    discount_amount: 0,
                    final_price: amount || 0,
                    payment_method: isNotaFree ? 'free' : payment_method,
                    notes: notes || (isNotaFree ? 'NotaFree plan - gratis selamanya' : 'New subscription created after payment approval')
                };
                
                const newSubscription = await SubscriptionRepository.create(subscriptionData);
                console.log('✅ SubscriptionService.createOrUpdateSubscription - Created new subscription:', newSubscription.id);
                
                return newSubscription;
            }
        } catch (error) {
            console.error('❌ SubscriptionService.createOrUpdateSubscription - Error:', error);
            throw new Error(error.message);
        }
    };
}

module.exports = SubscriptionService;
