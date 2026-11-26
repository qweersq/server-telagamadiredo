const TenantRepository = require('../repositories/tenantRepository');
const UserRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { sequelize, TenantPayment } = require('../models');

class TenantService {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            // Validate required fields
            if (!data.business_name || !data.owner_name || !data.email || !data.phone || !data.address) {
                throw new Error('Required fields: business_name, owner_name, email, phone, address');
            }

            // Check if email already exists in tenants
            const existingTenant = await TenantRepository.getByEmail(data.email);
            if (existingTenant) {
                throw new Error('Email already exists in tenants');
            }

            // Check if email already exists in users
            const existingUser = await UserRepository.getByEmail(data.email);
            if (existingUser) {
                throw new Error('Email already exists in users');
            }

            // Set default values for tenant
            const tenantData = {
                business_name: data.business_name,
                owner_name: data.owner_name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                city: data.city || null,
                status: 'active',
                subscription_status: 'active',
                trial_end_date: moment().add(7, 'days').toDate(), // 7 days trial
                settings: data.settings || {}
            };

            // Create tenant
            const tenant = await TenantRepository.create(tenantData, transaction);

            // Create owner user with superadmin role
            const defaultPassword = data.password || 'NAMA_BISNIS_GRINDULU_123';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const ownerUserData = {
                name: data.owner_name, // Must match tenant.owner_name
                email: data.email, // Must match tenant.email
                password: hashedPassword,
                role: 'superadmin',
                status: 'active',
                tenant_id: tenant.id, // Link to the created tenant
                phone: data.phone,
                address: data.address
            };

            const ownerUser = await UserRepository.create(ownerUserData, transaction);

            await transaction.commit();

            // Return tenant with owner user info
            return {
                tenant: tenant,
                owner_user: {
                    id: ownerUser.id,
                    name: ownerUser.name,
                    email: ownerUser.email,
                    role: ownerUser.role,
                    tenant_id: ownerUser.tenant_id
                },
                message: 'Tenant and owner user created successfully'
            };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getAll(search, status, subscription_status, tenant_id, page = 1, limit = 10, offset = 0, tab = null) {
        try {
            const result = await TenantRepository.getAllWithPagination(search, status, subscription_status, tenant_id, page, limit, offset, tab);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id) {
        try {
            const result = await TenantRepository.getByIdOptimized(id);
            if (!result) throw new Error('Tenant not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(id, data) {
        try {
            // Validate tenant exists
            const existingTenant = await TenantRepository.getById(id);
            if (!existingTenant) throw new Error('Tenant not found');

            // Check email uniqueness if email is being updated
            if (data.email && data.email !== existingTenant.email) {
                const emailExists = await TenantRepository.getByEmail(data.email);
                if (emailExists) throw new Error('Email already exists');
            }

            const result = await TenantRepository.update(id, data);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async delete(id) {
        try {
            const result = await TenantRepository.delete(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getTrialTenants() {
        try {
            const result = await TenantRepository.getTrialTenants();
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getExpiredSubscriptions() {
        try {
            const result = await TenantRepository.getExpiredSubscriptions();
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateSubscriptionStatus(tenantId, status) {
        try {
            const validStatuses = ['trial', 'active', 'expired', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid subscription status');
            }

            const result = await TenantRepository.updateSubscriptionStatus(tenantId, status);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getTenantStats(tenantId) {
        try {
            const result = await TenantRepository.getTenantStats(tenantId);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async activateTenant(tenantId) {
        try {
            const tenant = await TenantRepository.getById(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const updateData = {
                status: 'active',
                subscription_status: 'active'
            };

            const result = await TenantRepository.update(tenantId, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async suspendTenant(tenantId, reason = '') {
        try {
            const tenant = await TenantRepository.getById(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const updateData = {
                status: 'suspended',
                subscription_status: 'expired', // Use 'expired' instead of 'cancelled'
                settings: {
                    ...tenant.settings,
                    suspension_reason: reason,
                    suspended_at: new Date()
                }
            };

            const result = await TenantRepository.update(tenantId, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async extendTrial(tenantId, days = 7) {
        try {
            const tenant = await TenantRepository.getById(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const newTrialEndDate = moment(tenant.trial_end_date).add(days, 'days').toDate();

            const updateData = {
                trial_end_date: newTrialEndDate
            };

            const result = await TenantRepository.update(tenantId, updateData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    /**
     * Get tenants with overdue billing for suspension
     */
    static async getOverdueTenants() {
        try {
            const { Tenant, TenantPayment } = require('../models');
            const { Op } = require('sequelize');
            const moment = require('moment');

            // ✅ NEW: H+1 logic - due_date + 1 day <= now (baru dianggap overdue)
            // Contoh: due_date = 11 Des, hari ini = 12 Des → 11+1 = 12, 12 <= 12 = true (overdue)
            // Contoh: due_date = 11 Des, hari ini = 11 Des → 11+1 = 12, 12 <= 11 = false (belum overdue)
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999); // End of yesterday

            console.log('🔍 TenantService.getOverdueTenants - Looking for tenants with overdue billing (H+1 logic)');
            console.log('📅 Date check:', {
                now: now.toISOString(),
                yesterday: yesterday.toISOString(),
                condition: 'due_date <= yesterday (H+1: due_date + 1 day <= now)'
            });

            const overdueTenants = await Tenant.findAll({
                where: {
                    status: {
                        [Op.in]: ['trial', 'active', 'pending_payment'] // Only handle active/trial tenants
                    }
                },
                include: [
                    {
                        model: TenantPayment,
                        as: 'payments',
                        where: {
                            status: 'unpaid', // Only unpaid billings can be overdue
                            due_date: {
                                [Op.lte]: yesterday // ✅ H+1: due_date <= yesterday (due_date + 1 day <= now)
                            }
                        },
                        required: true // Only tenants with overdue billings
                    }
                ],
                attributes: ['id', 'business_name', 'owner_name', 'email', 'status', 'subscription_status']
            });

            console.log(`📅 Found ${overdueTenants.length} tenants with overdue billings (H+1)`);
            overdueTenants.forEach(tenant => {
                // ✅ H+1 logic: due_date + 1 day <= now
                const overdueBillings = tenant.payments.filter(p => {
                    if (p.status !== 'unpaid') return false;
                    const dueDate = new Date(p.due_date);
                    const dueDatePlusOne = new Date(dueDate);
                    dueDatePlusOne.setDate(dueDatePlusOne.getDate() + 1);
                    dueDatePlusOne.setHours(23, 59, 59, 999); // End of due_date + 1 day
                    return dueDatePlusOne <= now;
                });
                console.log(`  - ${tenant.business_name} (ID: ${tenant.id}) - ${overdueBillings.length} overdue billing(s)`);
            });

            return overdueTenants;

        } catch (error) {
            console.error('❌ TenantService.getOverdueTenants - Error:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Handle overdue billing by downgrading to NotaFree (instead of suspending)
     */
    static async suspendOverdueTenants() {
        try {
            console.log('🔄 TenantService.suspendOverdueTenants - Starting overdue billing handling (downgrade to NotaFree)');

            // Get tenants with overdue billing
            const overdueTenants = await this.getOverdueTenants();
            
            if (overdueTenants.length === 0) {
                console.log('✅ No tenants with overdue billing found');
                return {
                    processed: 0,
                    downgraded: 0,
                    errors: 0,
                    results: []
                };
            }

            const DowngradeService = require('./downgradeService');
            const SubscriptionRepository = require('../repositories/subscriptionRepository');
            const { TenantPayment } = require('../models');
            const results = [];
            let downgradedCount = 0;
            let errorCount = 0;

            // Handle each tenant with overdue billing
            for (const tenant of overdueTenants) {
                try {
                    // ✅ H+1 logic: Get overdue billings (due_date + 1 day <= now)
                    const now = new Date();
                    const overdueBillings = tenant.payments.filter(p => {
                        if (p.status !== 'unpaid') return false;
                        const dueDate = new Date(p.due_date);
                        const dueDatePlusOne = new Date(dueDate);
                        dueDatePlusOne.setDate(dueDatePlusOne.getDate() + 1);
                        dueDatePlusOne.setHours(23, 59, 59, 999); // End of due_date + 1 day
                        return dueDatePlusOne <= now;
                    });

                    // Get current active subscription
const activeSubscription = await SubscriptionRepository.getLatestSubscription(tenant.id);
                    
                    // ✅ NEW: Downgrade to NotaFree instead of suspending
                    if (activeSubscription) {
                        console.log(`🔄 Downgrading tenant ${tenant.business_name} (ID: ${tenant.id}) to NotaFree due to ${overdueBillings.length} overdue billing(s)`);
                        
                        const downgradeResult = await DowngradeService.downgradeToNotaFree(tenant.id, activeSubscription);
                        
                        if (downgradeResult) {
                            console.log(`✅ Successfully downgraded tenant ${tenant.business_name} (ID: ${tenant.id}) to NotaFree`);
                        }
                    } else {
                        console.log(`⚠️ Tenant ${tenant.business_name} (ID: ${tenant.id}) has no active subscription, skipping downgrade`);
                    }

                    // Update overdue billing status to 'cancelled' (not failed, to allow reactivation)
                    for (const billing of overdueBillings) {
                        await TenantPayment.update(
                            { 
                                status: 'cancelled',
                                notes: (billing.notes || '') + ' - CANCELLED: Overdue payment, downgraded to NotaFree'
                            },
                            { where: { id: billing.id } }
                        );
                    }

                    downgradedCount++;
                    results.push({
                        tenant_id: tenant.id,
                        business_name: tenant.business_name,
                        action: 'downgraded_to_notafree',
                        overdue_billings: overdueBillings.length,
                        reason: 'overdue_billing'
                    });

                    console.log(`✅ Handled overdue billing for tenant: ${tenant.business_name} (ID: ${tenant.id}) - ${overdueBillings.length} overdue billing(s) downgraded to NotaFree`);

                } catch (error) {
                    errorCount++;
                    console.error(`❌ Failed to handle overdue billing for tenant: ${tenant.business_name} (ID: ${tenant.id}) - ${error.message}`);
                    
                    results.push({
                        tenant_id: tenant.id,
                        business_name: tenant.business_name,
                        action: 'error',
                        error: error.message
                    });
                }
            }

            console.log(`📊 Overdue Billing Summary: ${downgradedCount} downgraded to NotaFree, ${errorCount} errors`);

            return {
                processed: overdueTenants.length,
                downgraded: downgradedCount,
                errors: errorCount,
                results: results
            };

        } catch (error) {
            console.error('❌ TenantService.suspendOverdueTenants - Error:', error);
            throw new Error(error.message);
        }
    }

    static async getTenantDashboard(tenantId) {
        try {
            const tenant = await TenantRepository.getById(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const stats = await TenantRepository.getTenantStats(tenantId);

            const dashboard = {
                tenant: {
                    id: tenant.id,
                    business_name: tenant.business_name,
                    owner_name: tenant.owner_name,
                    email: tenant.email,
                    status: tenant.status,
                    subscription_status: tenant.subscription_status,
                    trial_end_date: tenant.trial_end_date,
                    created_at: tenant.createdAt
                },
                stats: stats,
                subscription: tenant.subscriptions && tenant.subscriptions.length > 0 ? tenant.subscriptions[0] : null
            };

            return dashboard;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getGlobalStats() {
        try {
            const stats = await TenantRepository.getGlobalStats();
            return stats;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async updateTenantStatus(tenantId, status) {
        try {
            console.log('🔍 TenantService.updateTenantStatus - Tenant ID:', tenantId, 'Status:', status);
            
            // Validate status
            const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
            }
            
            // Update tenant status
            const updateData = { status: status };
            
            // If activating tenant, also update subscription status
            if (status === 'active') {
                updateData.subscription_status = 'active';
            }
            
            const updatedTenant = await TenantRepository.update(tenantId, updateData);
            console.log('✅ TenantService.updateTenantStatus - Tenant status updated:', tenantId);
            
            return updatedTenant;
        } catch (error) {
            console.error('❌ TenantService.updateTenantStatus - Error:', error);
            throw new Error(error.message);
        }
    };

    /**
     * Get comprehensive tenant details with analytics for superapp admin
     */
    static async getTenantDetailAnalytics(tenantId) {
        try {
            const tenantData = await TenantRepository.getTenantDetailAnalytics(tenantId);
            return tenantData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = TenantService;
