const BranchRepository = require('../repositories/branchRepository');
const SubscriptionValidationService = require('./subscriptionValidationService');

class BranchService {
    static async create(data, user_tenant_id = null, user_role = null) {
        try {
            // Validasi tenant_id
            if (data.tenant_id && isNaN(data.tenant_id)) {
                throw new Error('Invalid tenant_id');
            }

            // Validasi longitude dan latitude
            if (data.longitude && (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180)) {
                throw new Error('Invalid longitude. Must be between -180 and 180');
            }
            if (data.latitude && (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90)) {
                throw new Error('Invalid latitude. Must be between -90 and 90');
            }

            // Super App Super Admin bisa membuat branch untuk tenant manapun
            if (user_role === 'superapp-superadmin') {
                // Jika tidak ada tenant_id di data, gunakan user_tenant_id
                if (!data.tenant_id && user_tenant_id) {
                    data.tenant_id = user_tenant_id;
                }
            } else {
                // Role lain hanya bisa membuat branch untuk tenant-nya sendiri
                if (data.tenant_id && data.tenant_id !== user_tenant_id) {
                    throw new Error('Access denied: Cannot create branch for different tenant');
                }
                // Pastikan tenant_id sesuai dengan user
                data.tenant_id = user_tenant_id;
            }

            // ✅ Validasi subscription limits untuk branch creation
            if (data.tenant_id) {
                console.log('🔍 BranchService.create - Validating subscription limits for tenant:', data.tenant_id);
                
                // Get subscription data untuk validasi
                const { Subscription } = require('../models');
                const subscriptionData = await Subscription.findOne({
                    where: { 
                        tenant_id: data.tenant_id,
                        status: 'active'
                    },
                    include: [{
                        association: 'plan',
                        attributes: ['id', 'name', 'max_users', 'max_branches', 'max_orders_per_month']
                    }],
                    order: [['createdAt', 'DESC']],
                    limit: 1
                });

                if (subscriptionData) {
                    // Get current usage data
                    const { User, Branch } = require('../models');
                    const currentUsers = await User.count({
                        where: { 
                            tenant_id: data.tenant_id, 
                            deletedAt: null 
                        }
                    });
                    
                    const currentBranches = await Branch.count({
                        where: { 
                            tenant_id: data.tenant_id, 
                            deletedAt: null 
                        }
                    });

                    // Add current usage to subscription data - Clean structure
                    const subscriptionWithUsage = {
                        id: subscriptionData.id,
                        tenant_id: subscriptionData.tenant_id,
                        plan_id: subscriptionData.plan_id,
                        status: subscriptionData.status,
                        plan: {
                            id: subscriptionData.plan.id,
                            name: subscriptionData.plan.name,
                            max_users: subscriptionData.plan.max_users,
                            max_branches: subscriptionData.plan.max_branches,
                            max_orders_per_month: subscriptionData.plan.max_orders_per_month,
                            current_users: currentUsers,
                            current_branches: currentBranches
                        }
                    };

                    // Validate branch creation
                    const validation = await SubscriptionValidationService.validateBranchCreation(
                        data.tenant_id, 
                        subscriptionWithUsage
                    );

                    if (!validation.isValid) {
                        console.log('❌ BranchService.create - Subscription validation failed:', validation.message);
                        throw new Error(validation.message);
                    }

                    console.log('✅ BranchService.create - Subscription validation passed:', validation.message);
                } else {
                    console.log('⚠️ BranchService.create - No active subscription found for tenant:', data.tenant_id);
                    // Allow creation if no subscription (for backward compatibility)
                }
            }

            // Generate wa_session_id jika tidak ada
            if (!data.wa_session_id) {
                data.wa_session_id = `wa_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            const result = await BranchRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getAll(user_tenant_id = null, user_role = null, query_tenant_id = null) {
        try {
            let result;
            let target_tenant_id = null;
            
            // Super App Super Admin bisa lihat semua branches atau filter berdasarkan query_tenant_id
            if (user_role === 'superapp-superadmin') {
                // Jika ada query_tenant_id, filter berdasarkan itu
                if (query_tenant_id) {
                    target_tenant_id = query_tenant_id;
                }
                // Jika tidak ada query_tenant_id, tampilkan semua
                result = await BranchRepository.getAll(target_tenant_id);
            } else {
                // Role lain hanya bisa lihat branches dalam tenant-nya
                // Query tenant_id diabaikan untuk role non-superadmin
                result = await BranchRepository.getAll(user_tenant_id);
            }

            if (!result || result.length === 0) throw new Error('No branch found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getById(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            let result;
            
            // Super App Super Admin bisa akses semua branches
            if (user_role === 'superapp-superadmin') {
                result = await BranchRepository.getById(id);
            } else {
                // Role lain hanya bisa akses branches dalam tenant-nya
                result = await BranchRepository.getById(id, user_tenant_id);
            }

            if (!result) throw new Error('Branch not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getByTenant(tenant_id, user_tenant_id = null, user_role = null) {
        try {
            // Super App Super Admin bisa akses semua tenant
            if (user_role === 'superapp-superadmin') {
                return await BranchRepository.getByTenant(tenant_id);
            } else {
                // Role lain hanya bisa akses tenant-nya sendiri
                if (tenant_id !== user_tenant_id) {
                    throw new Error('Access denied');
                }
                return await BranchRepository.getByTenant(tenant_id);
            }
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async update(data, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

            // Validasi tenant_id jika ada
            if (data.tenant_id && isNaN(data.tenant_id)) {
                throw new Error('Invalid tenant_id');
            }

            // Validasi longitude dan latitude
            if (data.longitude && (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180)) {
                throw new Error('Invalid longitude. Must be between -180 and 180');
            }
            if (data.latitude && (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90)) {
                throw new Error('Invalid latitude. Must be between -90 and 90');
            }

            let result;
            
            // Super App Super Admin bisa update semua branches termasuk tenant_id
            if (user_role === 'superapp-superadmin') {
                // Jika tidak ada tenant_id di data, jangan ubah tenant_id yang sudah ada
                if (!data.tenant_id) {
                    // Ambil branch yang ada untuk mendapatkan tenant_id yang sudah ada
                    const existingBranch = await BranchRepository.getById(data.id);
                    if (existingBranch) {
                        data.tenant_id = existingBranch.tenant_id;
                    }
                }
                result = await BranchRepository.update(data.id, data);
            } else {
                // Role lain hanya bisa update branches dalam tenant-nya
                // Dan tidak bisa mengubah tenant_id
                if (data.tenant_id && data.tenant_id !== user_tenant_id) {
                    throw new Error('Access denied: Cannot change tenant_id');
                }
                // Pastikan tenant_id sesuai dengan user
                data.tenant_id = user_tenant_id;
                result = await BranchRepository.update(data.id, data, user_tenant_id);
            }

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async delete(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            // Super App Super Admin bisa delete semua branches
            if (user_role === 'superapp-superadmin') {
                await BranchRepository.delete(id);
            } else {
                // Role lain hanya bisa delete branches dalam tenant-nya
                await BranchRepository.delete(id, user_tenant_id);
            }

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getBranchStats(user_tenant_id = null, user_role = null) {
        try {
            let result;
            
            // Super App Super Admin bisa lihat stats semua branches
            if (user_role === 'superapp-superadmin') {
                result = await BranchRepository.getBranchStats();
            } else {
                // Role lain hanya bisa lihat stats branches dalam tenant-nya
                result = await BranchRepository.getBranchStats(user_tenant_id);
            }

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getBranchDetail(branch_id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(branch_id) || branch_id <= 0) throw new Error('Invalid branch ID');

            // Super App Super Admin bisa akses semua branches
            if (user_role === 'superapp-superadmin') {
                return await BranchRepository.getBranchDetail(branch_id);
            } else {
                // Role lain hanya bisa akses branches dalam tenant-nya
                return await BranchRepository.getBranchDetail(branch_id, user_tenant_id);
            }
        } catch (error) {
            throw new Error(error.message);
        }
    };
};

module.exports = BranchService;