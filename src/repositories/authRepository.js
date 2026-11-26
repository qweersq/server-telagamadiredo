const { sequelize, Shift, User, RefreshToken } = require('../models');

class AuthRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            const user = await User.create(data, { transaction });
            await transaction.commit();

            return user;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    };

    static async getByEmail(query) {
        try {
            const user = await User.findOne({
                where: {
                    email: query,
                }
            })

            return user;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static async getActiveShift(id) {
        try {
            const shift = await Shift.findOne({
                where: {
                    branch_id: id,
                    end_time: null
                }
            });

            return shift
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getShiftById(id) {
        try {
            const shift = await Shift.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'employee_shift',
                        attributes: ['id', 'name']
                    }
                ]
            });

            return shift;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateShift(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const shift = await Shift.findByPk(id);

            await shift.update(data);
            await transaction.commit();

            return shift;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateBranch(user_id, branch_id) {
        try {
            console.log('🔍 AuthRepository.updateBranch - Updating user:', user_id, 'to branch:', branch_id);
            
            // Update user's branch_id
            await User.update(
                { branch_id: branch_id },
                { where: { id: user_id } }
            );
            
            // Get updated user with branch and tenant info
            const updatedUser = await User.findOne({
                where: { id: user_id },
                include: [
                    {
                        model: require('../models').Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: require('../models').Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name']
                    }
                ]
            });
            
            if (!updatedUser) {
                throw new Error('User not found after update');
            }
            
            // Format response
            const result = {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                branch_id: updatedUser.branch_id,
                branch_name: updatedUser.branch?.name || null,
                branch_address: updatedUser.branch?.address || null,
                tenant_id: updatedUser.tenant_id,
                tenant_name: updatedUser.tenant?.business_name || null,
                role: updatedUser.role
            };
            
            console.log('✅ AuthRepository.updateBranch - Updated user:', result);
            return result;
        } catch (error) {
            console.error('❌ AuthRepository.updateBranch - Error:', error);
            throw new Error(error.message);
        }
    }

    // OLD: Update refresh token in users table (deprecated, use createRefreshToken instead)
    static async updateRefreshToken(user_id, refresh_token) {
        try {
            await User.update(
                { refresh_token: refresh_token },
                { where: { id: user_id } }
            );
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // OLD: Get user by refresh token from users table (deprecated, use getByRefreshToken instead)
    static async getByRefreshTokenOld(refresh_token) {
        try {
            const user = await User.findOne({
                where: {
                    refresh_token: refresh_token,
                }
            });
            return user;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // NEW: Create refresh token in refresh_tokens table
    static async createRefreshToken(user_id, refresh_token, device_type = 'web', device_id = null, expires_at) {
        try {
            // Validate required fields
            if (!user_id || !refresh_token || !expires_at) {
                throw new Error('Missing required fields: user_id, refresh_token, or expires_at');
            }

            // Validate device_type
            if (device_type && !['web', 'mobile'].includes(device_type)) {
                throw new Error('Invalid device_type. Must be "web" or "mobile"');
            }

            // Check if refresh token already exists (uniqueness check at application level)
            const existingToken = await RefreshToken.findOne({
                where: {
                    refresh_token: refresh_token,
                    deletedAt: null
                }
            });

            if (existingToken) {
                console.warn(`⚠️ AuthRepository.createRefreshToken - Refresh token already exists for user ${existingToken.user_id}`);
                throw new Error('Refresh token already exists');
            }

            const token = await RefreshToken.create({
                user_id: user_id,
                refresh_token: refresh_token,
                device_type: device_type || 'web',
                device_id: device_id,
                expires_at: expires_at
            });
            
            console.log(`✅ AuthRepository.createRefreshToken - Token created for user ${user_id}, device: ${device_type}`);
            return token;
        } catch (error) {
            console.error('❌ AuthRepository.createRefreshToken - Error:', error.message);
            console.error('❌ AuthRepository.createRefreshToken - Details:', {
                user_id,
                device_type,
                has_refresh_token: !!refresh_token,
                expires_at
            });
            throw new Error(error.message);
        }
    }

    // NEW: Get refresh token with user from refresh_tokens table
    static async getByRefreshToken(refresh_token) {
        try {
            if (!refresh_token) {
                return null;
            }

            const tokenRecord = await RefreshToken.findOne({
                where: {
                    refresh_token: refresh_token,
                    deletedAt: null
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'status', 'role', 'tenant_id', 'branch_id']
                    }
                ]
            });

            if (!tokenRecord) {
                console.log('⚠️ AuthRepository.getByRefreshToken - Token not found or already deleted');
                return null;
            }

            // Check if token is expired
            const now = new Date();
            const expiresAt = new Date(tokenRecord.expires_at);
            if (now > expiresAt) {
                console.log(`⚠️ AuthRepository.getByRefreshToken - Token expired. Expires: ${expiresAt}, Now: ${now}`);
                // Soft delete expired token
                await RefreshToken.update(
                    { deletedAt: now },
                    { where: { id: tokenRecord.id } }
                );
                return null;
            }

            if (!tokenRecord.user) {
                console.error('❌ AuthRepository.getByRefreshToken - User not found for token');
                return null;
            }

            return tokenRecord.user;
        } catch (error) {
            console.error('❌ AuthRepository.getByRefreshToken - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // NEW: Delete refresh token by token value
    static async deleteRefreshToken(refresh_token) {
        try {
            await RefreshToken.update(
                { deletedAt: new Date() },
                { where: { refresh_token: refresh_token } }
            );
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // NEW: Delete all refresh tokens for a user (logout all devices)
    static async deleteAllRefreshTokensByUserId(user_id) {
        try {
            if (!user_id) {
                throw new Error('user_id is required');
            }

            const result = await RefreshToken.update(
                { deletedAt: new Date() },
                { where: { user_id: user_id, deletedAt: null } }
            );

            console.log(`✅ AuthRepository.deleteAllRefreshTokensByUserId - Deleted all tokens for user ${user_id}, affected: ${result[0]}`);
            return true;
        } catch (error) {
            console.error('❌ AuthRepository.deleteAllRefreshTokensByUserId - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // NEW: Delete refresh token by user_id and device_type (logout specific device)
    static async deleteRefreshTokenByDevice(user_id, device_type) {
        try {
            if (!user_id || !device_type) {
                throw new Error('user_id and device_type are required');
            }

            // Validate device_type
            if (!['web', 'mobile'].includes(device_type)) {
                throw new Error('Invalid device_type. Must be "web" or "mobile"');
            }

            const result = await RefreshToken.update(
                { deletedAt: new Date() },
                { 
                    where: { 
                        user_id: user_id, 
                        device_type: device_type,
                        deletedAt: null 
                    } 
                }
            );

            console.log(`✅ AuthRepository.deleteRefreshTokenByDevice - Deleted tokens for user ${user_id}, device: ${device_type}, affected: ${result[0]}`);
            return true;
        } catch (error) {
            console.error('❌ AuthRepository.deleteRefreshTokenByDevice - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // Password Reset: Update password reset token
    static async updatePasswordResetToken(user_id, reset_token, expires_at) {
        try {
            if (!user_id || !reset_token || !expires_at) {
                throw new Error('user_id, reset_token, and expires_at are required');
            }

            await User.update(
                {
                    password_reset_token: reset_token,
                    password_reset_expires_at: expires_at
                },
                { where: { id: user_id } }
            );

            console.log(`✅ AuthRepository.updatePasswordResetToken - Token updated for user ${user_id}`);
            return true;
        } catch (error) {
            console.error('❌ AuthRepository.updatePasswordResetToken - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // Password Reset: Get user by reset token
    static async getByPasswordResetToken(reset_token) {
        try {
            if (!reset_token) {
                return null;
            }

            const user = await User.findOne({
                where: {
                    password_reset_token: reset_token,
                    password_reset_expires_at: {
                        [require('sequelize').Op.gt]: new Date() // Token not expired
                    }
                }
            });

            if (!user) {
                console.log('⚠️ AuthRepository.getByPasswordResetToken - Token not found or expired');
                return null;
            }

            return user;
        } catch (error) {
            console.error('❌ AuthRepository.getByPasswordResetToken - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // Password Reset: Clear reset token after successful reset
    static async clearPasswordResetToken(user_id) {
        try {
            if (!user_id) {
                throw new Error('user_id is required');
            }

            await User.update(
                {
                    password_reset_token: null,
                    password_reset_expires_at: null
                },
                { where: { id: user_id } }
            );

            console.log(`✅ AuthRepository.clearPasswordResetToken - Token cleared for user ${user_id}`);
            return true;
        } catch (error) {
            console.error('❌ AuthRepository.clearPasswordResetToken - Error:', error.message);
            throw new Error(error.message);
        }
    }

    // Password Reset: Update user password
    static async updatePassword(user_id, hashed_password) {
        try {
            if (!user_id || !hashed_password) {
                throw new Error('user_id and hashed_password are required');
            }

            await User.update(
                { password: hashed_password },
                { where: { id: user_id } }
            );

            console.log(`✅ AuthRepository.updatePassword - Password updated for user ${user_id}`);
            return true;
        } catch (error) {
            console.error('❌ AuthRepository.updatePassword - Error:', error.message);
            throw new Error(error.message);
        }
    }
};

module.exports = AuthRepository;