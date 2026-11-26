const BranchRepository = require('../repositories/branchRepository');
const UserRepository = require('../repositories/userRepository');
const SubscriptionValidationService = require('./subscriptionValidationService');
const { RoleHelper } = require('../helpers');

const bcrypt = require('bcrypt');
const moment = require('moment');

class UserService {
    static async create(data, user_tenant_id = null, user_role = null) {
        try {
            if (data.branch_id) {
                if (isNaN(data.branch_id) || data.branch_id <= 0) throw new Error('Invalid Branch ID');

                if (data.salary_date) data.salary_date = moment(data.salary_date).format('YYYY-MM-DD');

                const check = await BranchRepository.getById(data.branch_id);
                if (!check) throw new Error('Branch not found');
            }

            const role = RoleHelper.getRoleByName(data.role);
            data.role = role ? role.name : "employee";

            // ✅ Validasi subscription limits untuk user creation
            if (data.tenant_id) {
                console.log('🔍 UserService.create - Validating subscription limits for tenant:', data.tenant_id);
                
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

                    // Validate user creation
                    const validation = await SubscriptionValidationService.validateUserCreation(
                        data.tenant_id, 
                        subscriptionWithUsage
                    );

                    if (!validation.isValid) {
                        console.log('❌ UserService.create - Subscription validation failed:', validation.message);
                        throw new Error(validation.message);
                    }

                    console.log('✅ UserService.create - Subscription validation passed:', validation.message);
                } else {
                    console.log('⚠️ UserService.create - No active subscription found for tenant:', data.tenant_id);
                    // Allow creation if no subscription (for backward compatibility)
                }
            }

            const defaultPassword = "NAMA_BISNIS_GRINDULU_123";
            data.password = await bcrypt.hash(data.password || defaultPassword, 10);

            if (data.email) {
                const check = await UserRepository.getByEmail(data.email);
                if (check) throw new Error('Email already registered');
            }

            if (data.phone) {
                const check = await UserRepository.getByPhone(data.phone);
                if (check) throw new Error('Phone already registered');
            }

            const result = await UserRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, tenant_id = null, branch_id = null, status = null, role = null) { 
        try {
            const result = await UserRepository.getAll(search, tenant_id, branch_id, status, role);
            // Return empty array if no users found (this is a valid result)
            return result || [];
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) { 
        try {
            // Convert string to number if needed
            const numericId = parseInt(id);
            if (isNaN(numericId) || numericId <= 0) throw new Error('Invalid ID');

            const result = await UserRepository.getById(numericId);
            if (!result) throw new Error('User not found');

            const final_result = result.toJSON();
            if (final_result.password) delete final_result.password;

            return final_result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw) {
        try {
            if (isNaN(raw.id) || raw.id <= 0) throw new Error('Invalid ID');

            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined && value !== null)
            );

            // ✅ SECURITY: Prevent tenant_id manipulation - NEVER accept tenant_id from request
            if (data.tenant_id) {
                delete data.tenant_id;
            }

            if (data.branch_id) {
                if (isNaN(data.branch_id) || data.branch_id <= 0) throw new Error('Invalid Branch ID');

                const check = await BranchRepository.getById(data.branch_id);
                if (!check) throw new Error('Branch not found');
            }

            const check = await UserRepository.getById(data.id);
            if (!check) throw new Error('User not found');

            if (data.role) {
                const role = RoleHelper.getRoleByName(data.role);
                data.role = role ? role.name : "employee";
            }

            if (data.password) {
                data.password = await bcrypt.hash(data.password, 10);
            }

            if (data.email && data.email != check.email) {
                const check = await UserRepository.getByEmail(data.email);
                if (check) throw new Error('Email already registered');
            }

            if (data.phone) {
                const normalizePhone = (p) => p ? p.replace(/\D/g, '').replace(/^62/, '').replace(/^0/, '') : '';
                if (normalizePhone(data.phone) !== normalizePhone(check.phone)) {
                    const existing = await UserRepository.getByPhone(data.phone);
                    if (existing) throw new Error('Phone already registered');
                }
            }

            if (data.salary_date) data.salary_date = moment(data.salary_date).format('YYYY-MM-DD');

            const result = await UserRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await UserRepository.getById(id);
            if (!check) throw new Error('User not found');

            await UserRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async changePassword(userId, currentPassword, newPassword) {
        try {
            if (isNaN(userId) || userId <= 0) throw new Error('Invalid User ID');

            // Get user data
            const user = await UserRepository.getById(userId);
            if (!user) throw new Error('User not found');

            // Validate current password
            const bcrypt = require('bcrypt');
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            const updatedUser = await UserRepository.update(userId, { password: hashedNewPassword });

            // Return success message without password
            return {
                message: 'Password changed successfully',
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = UserService;