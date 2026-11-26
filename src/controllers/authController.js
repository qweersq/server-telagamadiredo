const AuthService = require('../services/authService');
const { ResponseHelper } = require('../helpers');

class AuthController {
    static async register(req, res) {
        try {
            const raw = {
                name: req.body.name,
                branch_id: parseInt(req.body.branch, 10) || null,
                email: req.body.email,
                password: req.body.password,
                phone: req.body.phone || null,
                address: req.body.address || null
                // status
                // role
                // salary
                // salary_date
            };

            const data = await AuthService.register(raw);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async login(req, res) {
        try {
            const raw = {
                email: req.body.email,
                password: req.body.password,
                device_type: req.body.device_type || 'web', // 'web' or 'mobile'
                device_id: req.body.device_id || null // Optional device identifier
            }

            const data = await AuthService.login(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            // Use 400 for login validation errors (wrong email/password)
            // Use 401 only for token expired/invalid in middleware
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getProfile(req, res) {
        try {
            const raw = {
                email: req.user.email,
                branch_id: req.user.branch_id
            }

            const data = await AuthService.getProfile(raw);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            // Handle 402 payment required errors
            if (error.statusCode === 402) {
                return res.status(402).send(ResponseHelper.errorResponse(error.message, 402, {
                    encrypted_data: error.encryptedData
                }));
            }
            
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async switchBranch(req, res) {
        try {
            // Only superadmin (owner) dan supervisor can switch branches
            const isSupervisor = req.user.role_asli === 'supervisor';

            if (req.user.role !== 'superadmin' && !isSupervisor) {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied: Only superadmin can switch branches'));
            }

            const { branch_id } = req.body;
            
            if (!branch_id || isNaN(branch_id)) {
                return res.status(400).send(ResponseHelper.errorResponse('Invalid branch_id'));
            }

            // Supervisor hanya boleh berpindah ke cabang milik tenant-nya sendiri
            if (isSupervisor) {
                const { Branch } = require('../models');
                const branch = await Branch.findOne({
                    where: {
                        id: parseInt(branch_id, 10),
                        tenant_id: req.user.tenant_id
                    },
                    attributes: ['id']
                });

                if (!branch) {
                    return res.status(403).send(ResponseHelper.errorResponse('Access denied: Branch is not in your tenant', 403));
                }
            }

            const raw = {
                user_id: req.user.id,
                branch_id: parseInt(branch_id, 10)
            };

            const data = await AuthService.switchBranch(raw);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async refreshToken(req, res) {
        try {
            const raw = {
                refreshToken: req.body.refreshToken
            };

            const data = await AuthService.refreshToken(raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(401).send(ResponseHelper.errorResponse(error.message, 401));
        }
    }

    static async logout(req, res) {
        try {
            const user_id = req.user?.id;
            
            if (!user_id) {
                return res.status(401).send(ResponseHelper.errorResponse('User not authenticated', 401));
            }

            // Get device_type from body (optional: 'web' or 'mobile')
            // If not provided, logout all devices
            const device_type = req.body.device_type || null;

            const data = await AuthService.logout(user_id, device_type);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async deleteAccount(req, res) {
        try {
            const user_id = req.user?.id;

            if (!user_id) {
                return res.status(401).send(ResponseHelper.errorResponse('User not authenticated', 401));
            }

            // Soft delete user
            const UserService = require('../services/userService');
            await UserService.delete(user_id);

            // Revoke all refresh tokens
            await AuthService.logout(user_id);

            return res.status(200).send(ResponseHelper.successResponse({ message: 'Akun berhasil dihapus' }));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).send(ResponseHelper.errorResponse('Email is required', 400));
            }

            const data = await AuthService.forgotPassword(email);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async resetPassword(req, res) {
        try {
            const { token, password } = req.body;

            if (!token || !password) {
                return res.status(400).send(ResponseHelper.errorResponse('Token and password are required', 400));
            }

            const data = await AuthService.resetPassword(token, password);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async updateProfile(req, res) {
        try {
            const raw = {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address
            };

            const user_id = req.user.id;

            const data = await AuthService.updateProfile(user_id, raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }
};

module.exports = AuthController;