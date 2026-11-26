const AuthRepository = require('../repositories/authRepository');
const shiftRepository = require('../repositories/shiftRepository');
const AbsentRepository = require('../repositories/absentRepository');
const BillingExpirationService = require('./billingExpirationService');
const moment = require('moment');

// Cache untuk auto-close (key: employee_id, value: date)
const autoCloseCache = new Map();

// Cleanup cache setiap hari
const cleanupCache = () => {
    const today = moment().format('YYYY-MM-DD');
    for (const [key, value] of autoCloseCache.entries()) {
        const keyDate = key.split('_')[1];
        if (keyDate !== today) {
            autoCloseCache.delete(key);
        }
    }
};

const { PasswordHelper, RoleHelper, EncryptionHelper } = require('../helpers');
const { AuthMiddleware } = require('../middlewares');

const bcrypt = require('bcrypt');
const { encryptSecureData } = require('../helpers/secureDataHelper');

class AuthService {
    static async register(data) {
        try {
            const checkEmail = await AuthRepository.getByEmail(data.email);
            if (checkEmail) throw new Error('Email already registered');

            const role = RoleHelper.getRoleByName(data.role);
            data.role = role ? role.name : "employee";

            const defaultPassword = "NAMA_BISNIS_GRINDULU_123";
            data.password = await bcrypt.hash(data.password || defaultPassword, 10);

            const userCheck = await AuthRepository.create(data);
            const token = await AuthMiddleware.generateAccessToken(userCheck);

            const user = userCheck.toJSON();
            delete user.password;

            return {
                user: user,
                token: token
            }
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async login(data) {
        try {
            if (!data.email || !data.password) throw new Error('Email and password are required');

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) throw new Error('Invalid email format');

            const userCheck = await AuthRepository.getByEmail(data.email);
            if (!userCheck) throw new Error('Email is not registered in the system');

            const isPasswordValid = await PasswordHelper.comparePasswords(data.password, userCheck.password);
            if (!isPasswordValid) throw new Error('Incorrect password');

            if (!userCheck.status) throw new Error('Invalid user status');

            if (userCheck.status.toLowerCase() === "inactive") throw new Error('Your account is inactive. Please contact administrator');

            // 🚀 NEW: Check if tenant is verified (only for tenant users, not superapp-superadmin)
            if (userCheck.tenant_id && userCheck.role !== 'superapp-superadmin') {
                const TenantRepository = require('../repositories/tenantRepository');
                const tenant = await TenantRepository.getById(userCheck.tenant_id);

                if (tenant && !tenant.is_verified) {
                    throw new Error('Akun Anda belum diverifikasi. Silakan cek WhatsApp untuk link verifikasi atau hubungi support.');
                }
            }

            const token = await AuthMiddleware.generateAccessToken(userCheck);
            if (!token) throw new Error('Failed to generate authentication token');

            const refreshToken = await AuthMiddleware.generateRefreshToken(userCheck);
            if (!refreshToken) throw new Error('Failed to generate refresh token');

            // Calculate expiration date (30 days from now by default)
            const JWT_REFRESH_EXPIRED = parseInt(process.env.JWT_REFRESH_EXPIRED || '30', 10);
            const JWT_REFRESH_EXPIRED_OPTION = process.env.JWT_REFRESH_EXPIRED_OPTION || 'd';
            let expiresInDays = 30; // default
            if (JWT_REFRESH_EXPIRED_OPTION === 'd') {
                expiresInDays = JWT_REFRESH_EXPIRED;
            } else if (JWT_REFRESH_EXPIRED_OPTION === 'h') {
                expiresInDays = JWT_REFRESH_EXPIRED / 24;
            } else if (JWT_REFRESH_EXPIRED_OPTION === 'm') {
                expiresInDays = JWT_REFRESH_EXPIRED / (24 * 60);
            }
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Math.ceil(expiresInDays));

            // Get device type from request (default: 'web')
            const deviceType = data.device_type || 'web';
            const deviceId = data.device_id || null;

            // Validate device_type
            if (deviceType && !['web', 'mobile'].includes(deviceType)) {
                throw new Error('Invalid device_type. Must be "web" or "mobile"');
            }

            // Save refresh token to refresh_tokens table (multi-device support)
            try {
                await AuthRepository.createRefreshToken(
                    userCheck.id,
                    refreshToken,
                    deviceType,
                    deviceId,
                    expiresAt
                );
            } catch (createTokenError) {
                console.error('❌ AuthService.login - Error creating refresh token:', createTokenError);
                // If token creation fails, still return login success but log the error
                // This allows login to succeed even if token storage fails (graceful degradation)
                throw new Error(`Login successful but failed to save refresh token: ${createTokenError.message}`);
            }

            const user = userCheck.toJSON();
            delete user.password;
            delete user.refresh_token; // Don't send refresh token in response

            return {
                userCheck: user,
                token: token,
                refreshToken: refreshToken
            }
        } catch (error) {
            console.error('❌ AuthService.login - Error:', error.message);
            console.error('❌ AuthService.login - Stack:', error.stack);

            if (error.name === 'SequelizeConnectionError') {
                throw new Error('Failed to connect to database');
            }
            if (error.name === 'SequelizeValidationError') {
                throw new Error('Invalid input data');
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Refresh token already exists. Please try again.');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Failed to generate authentication token');
            }

            // Re-throw with original message
            throw error;
        }
    };

    // Helper function untuk menangani unfinished absent
    static async handleUnfinishedAbsent(employee_id) {
        try {
            // Cleanup cache lama
            // cleanupCache();

            const today = moment().format('YYYY-MM-DD');
            const cacheKey = `${employee_id}_${today}`;

            // Cek cache, jika sudah auto-close hari ini, skip
            // if (autoCloseCache.has(cacheKey)) {
            //     return {
            //         hasUnfinishedAbsent: false,
            //         unfinishedAbsentData: null
            //     };
            // }

            // Cari absen yang belum selesai dari kemarin sampai bulan ini
            const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
            const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');

            // Cari absen yang clock_out null atau belum ada
            const unfinishedAbsent = await AbsentRepository.findUnfinishedAbsentByDateRange(
                employee_id,
                startOfMonth,
                yesterday
            );

            if (!unfinishedAbsent) {
                return {
                    hasUnfinishedAbsent: false,
                    unfinishedAbsentData: null
                };
            }

            // Tidak melakukan auto-close, biarkan user update manual
            // Hanya return informasi bahwa ada unfinished absent

            // Set cache untuk mencegah auto-close berulang
            // autoCloseCache.set(cacheKey, true);

            return {
                hasUnfinishedAbsent: true,
                unfinishedAbsentData: {
                    id: unfinishedAbsent.id,
                    date: unfinishedAbsent.date,
                    clock_in: unfinishedAbsent.clock_in,
                    description: 'Lupa absen pulang - Auto close by system'
                }
            };
        } catch (error) {
            // Jika error, tetap return false agar getProfile tetap berjalan
            console.error('Error handling unfinished absent:', error.message);
            return {
                hasUnfinishedAbsent: false,
                unfinishedAbsentData: null
            };
        }
    }

    static async getProfile(data) {
        try {
            console.log('🔍 AuthService.getProfile - Starting with data:', data);
            console.log('🔍 AuthService.getProfile - Current time:', new Date().toISOString());

            const userCheck = await AuthRepository.getByEmail(data.email);
            if (!userCheck) throw new Error('Email not found');

            const user = userCheck.toJSON();
            delete user.password;
            console.log('✅ AuthService.getProfile - User found:', { id: user.id, name: user.name, branch_id: data.branch_id });

            // Get branch and tenant data
            const { Branch, Tenant } = require('../models');
            let branchData = null;
            let tenantData = null;

            if (user.branch_id) {
                branchData = await Branch.findByPk(user.branch_id, {
                    include: [
                        {
                            association: 'parentRelation',
                            include: [{ association: 'parentBranch', attributes: ['id', 'name'] }]
                        }
                    ]
                });
                console.log('✅ AuthService.getProfile - Branch found:', branchData ? { id: branchData.id, name: branchData.name } : 'null');
            }

            if (user.tenant_id) {
                tenantData = await Tenant.findByPk(user.tenant_id);
                console.log('✅ AuthService.getProfile - Tenant found:', tenantData ? { id: tenantData.id, business_name: tenantData.business_name } : 'null');

                // Billing generation moved to middleware

                // Trial expiration check moved to middleware
            }

            // Get active subscription data for tenant
            let subscriptionData = null;
            if (user.tenant_id) {
                const { Subscription, User, Branch, Order } = require('../models');
                const { Op } = require('sequelize');

                subscriptionData = await Subscription.findOne({
                    where: {
                        tenant_id: user.tenant_id,
                        status: 'active' // ✅ Only active subscriptions
                    },
                    include: [{
                        association: 'plan',
                        attributes: ['id', 'name', 'price', 'features', 'max_users', 'max_branches', 'max_orders_per_month', 'duration_days']
                    }],
                    order: [['id', 'DESC']], // ✅ Use id DESC to get the newest subscription (after payment creates new one)
                    limit: 1
                });

                // Check active subscription expiration
                try {
                    await BillingExpirationService.checkActiveSubscriptionExpiration(user.tenant_id);
                } catch (error) {
                    if (error.statusCode === 402) {
                        throw error; // Re-throw 402 error to be handled by controller
                    }
                    console.error('Error checking active subscription expiration:', error.message);
                }




                // ✅ Add current usage data to subscription
                if (subscriptionData) {
                    // Get current counts
                    const currentUsers = await User.count({
                        where: {
                            tenant_id: user.tenant_id,
                            deletedAt: null
                        }
                    });

                    const currentBranches = await Branch.count({
                        where: {
                            tenant_id: user.tenant_id,
                            deletedAt: null
                        }
                    });

                    // Get current month orders count
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);

                    const endOfMonth = new Date();
                    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
                    endOfMonth.setDate(0);
                    endOfMonth.setHours(23, 59, 59, 999);

                    const currentOrdersThisMonth = await Order.count({
                        where: {
                            tenant_id: user.tenant_id,
                            createdAt: {
                                [Op.between]: [startOfMonth, endOfMonth]
                            }
                        }
                    });

                    // Add current usage to subscription data - Clean structure
                    subscriptionData = {
                        id: subscriptionData.id,
                        tenant_id: subscriptionData.tenant_id,
                        plan_id: subscriptionData.plan_id,
                        status: subscriptionData.status,
                        start_date: subscriptionData.start_date,
                        end_date: subscriptionData.end_date,
                        auto_renew: subscriptionData.auto_renew,
                        price: subscriptionData.price,
                        discount_amount: subscriptionData.discount_amount,
                        final_price: subscriptionData.final_price,
                        payment_method: subscriptionData.payment_method,
                        notes: subscriptionData.notes,
                        createdAt: subscriptionData.createdAt,
                        updatedAt: subscriptionData.updatedAt,
                        deletedAt: subscriptionData.deletedAt,
                        plan: {
                            id: subscriptionData.plan.id,
                            name: subscriptionData.plan.name,
                            price: subscriptionData.plan.price,
                            features: subscriptionData.plan.features,
                            max_users: subscriptionData.plan.max_users,
                            max_branches: subscriptionData.plan.max_branches,
                            max_orders_per_month: subscriptionData.plan.max_orders_per_month,
                            duration_days: subscriptionData.plan.duration_days,
                            current_users: currentUsers,
                            current_branches: currentBranches,
                            current_orders_this_month: currentOrdersThisMonth
                        }
                    };
                }

                console.log('✅ AuthService.getProfile - Subscription found:', subscriptionData ? {
                    id: subscriptionData.id,
                    status: subscriptionData.status,
                    plan_name: subscriptionData.plan?.name,
                    current_users: subscriptionData.plan?.current_users,
                    current_branches: subscriptionData.plan?.current_branches
                } : 'null');
            }

            // Validate tenant-branch relationship
            if (branchData && tenantData && branchData.tenant_id !== tenantData.id) {
                console.error('❌ Data inconsistency detected:', {
                    user_id: user.id,
                    user_tenant_id: user.tenant_id,
                    user_branch_id: user.branch_id,
                    branch_tenant_id: branchData.tenant_id,
                    tenant_id: tenantData.id
                });

                // For now, just log the error. In production, you might want to:
                // 1. Redirect to onboarding
                // 2. Auto-fix the data
                // 3. Return error response
                console.warn('⚠️ User has inconsistent tenant-branch relationship. Consider fixing this data.');
            }

            // Handle unfinished absent
            const unfinishedAbsentResult = await AuthService.handleUnfinishedAbsent(user.id);

            // Cek apakah user sudah absen hari ini
            const today = moment().format('YYYY-MM-DD');
            const todayAbsent = await AbsentRepository.findTodayAbsent(user.id, today);
            const isAbsent = !!todayAbsent;

            console.log('🔍 AuthService.getProfile - Checking for active shift in branch_id:', data.branch_id);
            // ✅ Use lightweight getActive instead of heavy calculateShiftData
            const ShiftService = require('./shiftService');
            const activeShift = await ShiftService.getActive(data.branch_id, user.tenant_id);

            // Fetch latest app versions for all platforms
            const AppVersionRepository = require('../repositories/appVersionRepository');
            const [androidVersion, iosVersion, webVersion] = await Promise.all([
                AppVersionRepository.getLatest('android'),
                AppVersionRepository.getLatest('ios'),
                AppVersionRepository.getLatest('web'),
            ]);

            const formatAppVersion = (version) => version ? {
                latestVersion: version.version,
                forceUpdate: version.force_update,
                minRequiredVersion: version.min_required_version,
                updateMessage: version.update_message,
                features: version.features || [],
                versionCode: version.version_code,
            } : null;

            const latestAppVersions = {
                android: formatAppVersion(androidVersion),
                ios: formatAppVersion(iosVersion),
                web: formatAppVersion(webVersion),
            };

            if (!activeShift) {
                console.log('ℹ️ AuthService.getProfile - No active shift found, returning basic profile');
                return {
                    user: user,
                    branch: branchData,
                    tenant: tenantData,
                    subscription: subscriptionData,
                    shifts: null,
                    todayAbsent: todayAbsent,
                    hasUnfinishedAbsent: unfinishedAbsentResult.hasUnfinishedAbsent,
                    unfinishedAbsentData: unfinishedAbsentResult.unfinishedAbsentData,
                    isAbsent: isAbsent,
                    latest_app_versions: latestAppVersions
                }
            }

            console.log('✅ AuthService.getProfile - Active shift found:', {
                id: activeShift.id,
                cash_balance: activeShift.cash_balance,
                is_active: activeShift.is_active
            });

            const shiftData = {
                id: activeShift.id,
                employee_id: activeShift.employee_id,
                branch_id: activeShift.branch_id,
                start_time: activeShift.start_time,
                end_time: activeShift.end_time,
                cash_initial: activeShift.cash_initial,
                cash_inflow: activeShift.cash_inflow,
                cash_outflow: activeShift.cash_outflow,
                cash_balance: activeShift.cash_balance,
                is_active: activeShift.is_active,
                employee_shift: activeShift.employee_shift
            };
            console.log('✅ AuthService.getProfile - Lightweight shift data created successfully');

            return {
                user: user,
                branch: branchData,
                tenant: tenantData,
                subscription: subscriptionData,
                shifts: shiftData,
                todayAbsent: todayAbsent,
                hasUnfinishedAbsent: unfinishedAbsentResult.hasUnfinishedAbsent,
                unfinishedAbsentData: unfinishedAbsentResult.unfinishedAbsentData,
                isAbsent: isAbsent,
                latest_app_versions: latestAppVersions
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async switchBranch(data) {
        try {
            console.log('🔍 AuthService.switchBranch - Starting with data:', data);

            // Update user's branch_id in database
            const updatedUser = await AuthRepository.updateBranch(data.user_id, data.branch_id);

            if (!updatedUser) {
                throw new Error('User not found');
            }

            console.log('✅ AuthService.switchBranch - User branch updated:', updatedUser);

            // Return updated user data
            return {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                branch_id: updatedUser.branch_id,
                branch_name: updatedUser.branch_name,
                branch_address: updatedUser.branch_address,
                tenant_id: updatedUser.tenant_id,
                tenant_name: updatedUser.tenant_name,
                role: updatedUser.role,
                message: 'Branch switched successfully'
            };
        } catch (error) {
            console.error('❌ AuthService.switchBranch - Error:', error);
            throw new Error(error.message);
        }
    }

    static async refreshToken(data) {
        try {
            if (!data.refreshToken) throw new Error('Refresh token is required');

            // Verify refresh token
            const decoded = await AuthMiddleware.verifyRefreshToken(data.refreshToken);
            const user_id = EncryptionHelper.decryptID(decoded.id);

            // Check if refresh token exists in database and matches user
            const userCheck = await AuthRepository.getByRefreshToken(data.refreshToken);
            if (!userCheck) {
                throw new Error('Invalid refresh token');
            }

            // Convert to plain object and check user ID match
            const userPlain = userCheck.toJSON ? userCheck.toJSON() : userCheck;
            const userIdFromDb = parseInt(userPlain.id);
            const userIdFromToken = parseInt(user_id);

            if (userIdFromDb !== userIdFromToken) {
                throw new Error('Invalid refresh token');
            }

            // Check user status
            if (!userPlain.status || userPlain.status.toLowerCase() === "inactive") {
                throw new Error('Your account is inactive. Please contact administrator');
            }

            // Generate new access token
            const newAccessToken = await AuthMiddleware.generateAccessToken(userCheck);
            if (!newAccessToken) throw new Error('Failed to generate new access token');

            return {
                token: newAccessToken
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async logout(user_id, device_type = null) {
        try {
            if (device_type) {
                // Logout specific device (web or mobile)
                await AuthRepository.deleteRefreshTokenByDevice(user_id, device_type);
            } else {
                // Logout all devices
                await AuthRepository.deleteAllRefreshTokensByUserId(user_id);
            }
            return { message: 'Logout successful' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async forgotPassword(email) {
        try {
            // Validate email
            if (!email) throw new Error('Email is required');

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) throw new Error('Invalid email format');

            // Check if user exists
            const user = await AuthRepository.getByEmail(email);
            if (!user) {
                // Don't reveal if email exists or not (security best practice)
                // Return success message even if user doesn't exist
                return { message: 'If the email exists, a password reset link has been sent' };
            }

            // Check if user is active
            if (!user.status || user.status.toLowerCase() === 'inactive') {
                // Still return success to not reveal user status
                return { message: 'If the email exists, a password reset link has been sent' };
            }

            // Generate reset token (32 character random string)
            const crypto = require('crypto');
            const resetToken = crypto.randomBytes(32).toString('hex');

            // Set expiration (1 hour from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

            // Save reset token to database
            await AuthRepository.updatePasswordResetToken(user.id, resetToken, expiresAt);

            // Send reset email
            const EmailNotificationService = require('./email/emailNotificationService');
            const clientUrl = process.env.CLIENT_URL || 'https://notasepatu.id';
            const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

            await EmailNotificationService.sendPasswordReset({
                user_email: user.email,
                user_name: user.name,
                reset_url: resetUrl
            });

            console.log(`✅ AuthService.forgotPassword - Reset token sent to ${email}`);

            // Return success message (don't reveal if email exists)
            return { message: 'If the email exists, a password reset link has been sent' };
        } catch (error) {
            console.error('❌ AuthService.forgotPassword - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async resetPassword(token, newPassword) {
        try {
            // Validate inputs
            if (!token) throw new Error('Reset token is required');
            if (!newPassword) throw new Error('New password is required');

            // Validate password strength (min 8 characters)
            if (newPassword.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }

            // Find user by reset token
            const user = await AuthRepository.getByPasswordResetToken(token);
            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            // Hash new password
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await AuthRepository.updatePassword(user.id, hashedPassword);

            // Clear reset token
            await AuthRepository.clearPasswordResetToken(user.id);

            console.log(`✅ AuthService.resetPassword - Password reset successful for user ${user.id}`);

            return { message: 'Password reset successful' };
        } catch (error) {
            console.error('❌ AuthService.resetPassword - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async updateProfile(user_id, data) {
        try {
            if (!user_id || isNaN(user_id) || user_id <= 0) {
                throw new Error('Invalid user ID');
            }

            // ✅ SECURITY: Only allow specific fields to be updated
            const allowedFields = ['name', 'email', 'phone', 'address'];
            const updateData = {};

            for (const field of allowedFields) {
                if (data[field] !== undefined && data[field] !== null) {
                    updateData[field] = data[field].trim();
                }
            }

            // Validate at least one field is provided
            if (Object.keys(updateData).length === 0) {
                throw new Error('At least one field must be provided for update');
            }

            // Validate name if provided
            if (updateData.name !== undefined && !updateData.name) {
                throw new Error('Name cannot be empty');
            }

            // Validate email format if provided
            if (updateData.email !== undefined) {
                if (!updateData.email) {
                    throw new Error('Email cannot be empty');
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(updateData.email)) {
                    throw new Error('Invalid email format');
                }
            }

            // Get existing user
            const UserRepository = require('../repositories/userRepository');
            const existingUser = await UserRepository.getById(user_id);
            if (!existingUser) {
                throw new Error('User not found');
            }

            const existingUserData = existingUser.toJSON ? existingUser.toJSON() : existingUser;

            // Check email uniqueness if email is being changed
            if (updateData.email && updateData.email !== existingUserData.email) {
                const emailCheck = await AuthRepository.getByEmail(updateData.email);
                if (emailCheck) {
                    throw new Error('Email already registered');
                }
            }

            // Check phone uniqueness if phone is being changed
            if (updateData.phone && updateData.phone !== existingUserData.phone) {
                const phoneCheck = await UserRepository.getByPhone(updateData.phone);
                if (phoneCheck) {
                    throw new Error('Phone already registered');
                }
            }

            // Update user
            const updatedUser = await UserRepository.update(user_id, updateData);

            // Return user data without password
            const result = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
            if (result.password) delete result.password;

            console.log(`✅ AuthService.updateProfile - Profile updated successfully for user ${user_id}`);

            return result;
        } catch (error) {
            console.error('❌ AuthService.updateProfile - Error:', error.message);
            throw new Error(error.message);
        }
    }
};

module.exports = AuthService;