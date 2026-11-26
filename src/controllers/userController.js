const UserService = require('../services/userService');
const { ResponseHelper } = require('../helpers');

// Role validation function
// Dipakai untuk CREATE user. Supervisor TIDAK boleh menambah karyawan baru —
// hanya boleh mengelola (edit/reset password/hapus) akun yang sudah ada.
const validateUserRole = (currentUserRole, targetRole) => {
    switch (currentUserRole) {
        case 'superadmin':
            return ['admin', 'employee', 'supervisor'].includes(targetRole);
        case 'supervisor':
            return false;
        default:
            return false;
    }
};

/**
 * Supervisor boleh mengelola karyawan, tetapi tidak boleh menyentuh akun
 * owner (superadmin) maupun staf platform (superapp-superadmin).
 * Tanpa guard ini supervisor bisa mengganti password owner lewat PUT /users/:id.
 *
 * @param {object} req
 * @param {number} targetUserId
 * @returns {Promise<{allowed: boolean, message?: string}>}
 */
const canManageTargetUser = async (req, targetUserId) => {
    if (req.user?.role_asli !== 'supervisor') return { allowed: true };

    try {
        const target = await UserService.getById(targetUserId);
        if (target && ['superadmin', 'superapp-superadmin'].includes(target.role)) {
            return { allowed: false, message: 'Supervisor tidak dapat mengelola akun owner' };
        }
    } catch (error) {
        // Biarkan handler aslinya yang melaporkan (mis. ID tidak valid)
        return { allowed: true };
    }

    return { allowed: true };
};

class UserController {
    /**
     * Posisi kerja dipakai modul Tugas Harian untuk mencocokkan template.
     * Disimpan lowercase & null bila kosong, supaya perbandingan di server konsisten.
     */
    static normalizePosition(value) {
        if (value === undefined) return undefined;
        const clean = String(value || '').trim().toLowerCase();
        return clean || null;
    }

    static async create(req, res) {
        try {
            const raw = {
                name: req.body.name,
                branch_id: parseInt(req.body.branch_id, 10),
                email: req.body.email,
                password: req.body.password,
                phone: req.body.phone,
                address: req.body.address,
                status: req.body.status,
                role: req.body.role,
                position: UserController.normalizePosition(req.body.position),
                salary: req.body.salary,
                salary_date: req.body.salary_date,
                tenant_id: req.user.tenant_id // Always use JWT token for data isolation (security)
            };

            // Role validation based on current user role
            // PENTING: pakai role_asli, bukan req.user.role — supervisor sudah
            // dinormalisasi menjadi 'superadmin' oleh AuthMiddleware sehingga
            // tanpa ini supervisor bisa lolos membuat user.
            const currentUserRole = req.user.role_asli || req.user.role;
            const isValidRole = validateUserRole(currentUserRole, raw.role);
            
            if (!isValidRole) {
                return res.status(403).send(ResponseHelper.errorResponse(`Anda tidak dapat membuat user dengan role ${raw.role}`, 403));
            }

            console.log('👤 UserController.create - Creating user with data:', {
                name: raw.name,
                email: raw.email,
                branch_id: raw.branch_id,
                tenant_id: raw.tenant_id,
                role: raw.role,
                currentUserRole: currentUserRole
            });

            // Pass user context for subscription validation
            const user = await UserService.create(raw, req.user.tenant_id, req.user.role);

            return res.status(201).send(ResponseHelper.successResponse(user, 201));
        } catch (error) {
            console.error('❌ UserController.create - Error:', error);
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const status = req.query.status;
            const role = req.query.role;
            
            console.log('🔍 UserController.getAll - Query params:', {
                search,
                tenant_id,
                branch_id,
                status,
                role
            });

            const users = await UserService.getAll(search, tenant_id, branch_id, status, role);

            return res.status(200).send(ResponseHelper.successResponse(users));
        } catch (error) {
            console.error('❌ UserController.getAll - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const user = await UserService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(user));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async update(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);

            const guard = await canManageTargetUser(req, targetId);
            if (!guard.allowed) {
                return res.status(403).send(ResponseHelper.errorResponse(guard.message, 403));
            }

            const raw = {
                id: targetId,
                name: req.body.name,
                branch_id: parseInt(req.body.branch_id, 10) || undefined,
                email: req.body.email,
                password: req.body.password,
                phone: req.body.phone,
                address: req.body.address,
                status: req.body.status,
                role: req.body.role,
                position: UserController.normalizePosition(req.body.position),
                salary: req.body.salary,
                salary_date: req.body.salary_date
            };

            // ✅ SECURITY: Hardcode role validation - hanya allow admin/employee/supervisor
            if (raw.role && !['admin', 'employee', 'supervisor'].includes(raw.role)) {
                return res.status(403).send(ResponseHelper.errorResponse('Invalid role: Only admin, employee and supervisor roles are allowed', 403));
            }

            const user = await UserService.update(raw);

            return res.status(200).send(ResponseHelper.successResponse(user));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);

            const guard = await canManageTargetUser(req, id);
            if (!guard.allowed) {
                return res.status(403).send(ResponseHelper.errorResponse(guard.message, 403));
            }

            await UserService.delete(id);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async changePassword(req, res) {
        try {
            const { current_password, new_password } = req.body;
            const userId = parseInt(req.params.id, 10);

            const guard = await canManageTargetUser(req, userId);
            if (!guard.allowed) {
                return res.status(403).send(ResponseHelper.errorResponse(guard.message, 403));
            }

            // Validasi input
            if (!current_password || !new_password) {
                return res.status(400).send(ResponseHelper.errorResponse('Current password and new password are required'));
            }

            if (new_password.length < 8) {
                return res.status(400).send(ResponseHelper.errorResponse('New password must be at least 8 characters long'));
            }

            // Validasi password lama dan update password baru
            const result = await UserService.changePassword(userId, current_password, new_password);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message));
        }
    };
};

module.exports = UserController;