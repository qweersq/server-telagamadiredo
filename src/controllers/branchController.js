const BranchService = require('../services/branchService');
const { ResponseHelper } = require('../helpers');

class BranchController {
    static async create(req, res) {
        try {
            const raw = {
                name: req.body.name,
                address: req.body.address,
                phone: req.body.phone,
                manager_id: parseInt(req.body.manager_id, 10),
                city: req.body.city,
                status: req.body.status || 'active',
                tenant_id: req.user.tenant_id, // Always use JWT token for data isolation (security)
                longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
                latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
                wa_session_id: req.body.wa_session_id || null,
                branch_type: req.body.branch_type || 'main',
                order_mode: req.body.order_mode || 'loket'
            }

            // Ambil tenant_id dan role dari user yang login
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            const data = await BranchService.create(raw, user_tenant_id, user_role);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            const data = await BranchService.getAll(user_tenant_id, user_role, null);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const branch_id = parseInt(req.params.id, 10);

            // Ambil tenant_id dan role dari user yang login
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            const data = await BranchService.getById(branch_id, user_tenant_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getByTenant(req, res) {
        try {
            // Always use tenant_id from JWT token for data isolation (security)
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            const data = await BranchService.getByTenant(user_tenant_id, user_tenant_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async update(req, res) {
        try {
            const branchId = parseInt(req.params.id, 10);
            const raw = {
                id: branchId,
                name: req.body.name,
                address: req.body.address,
                phone: req.body.phone,
                manager_id: parseInt(req.body.manager_id, 10),
                city: req.body.city,
                status: req.body.status,
                tenant_id: req.user.tenant_id, // Always use JWT token for data isolation (security)
                longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
                latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
                wa_session_id: req.body.wa_session_id || null,
                branch_type: req.body.branch_type || undefined, // Allow updating branch_type
                order_mode: req.body.order_mode || undefined // Mode operasional cabang
            }

            // Ambil tenant_id dan role dari user yang login
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            // Update branch data
            const data = await BranchService.update(raw, user_tenant_id, user_role);

            // Handle parent_branch_id for mitra relations
            const parent_branch_id = req.body.parent_branch_id ? parseInt(req.body.parent_branch_id, 10) : null;
            const branch_type = req.body.branch_type;

            if (branch_type === 'mitra' && parent_branch_id) {
                // If changing to mitra and parent is provided, create/update mitra relation
                try {
                    const BranchMitraService = require('../services/branchMitraService');
                    const { BranchMitraRelation } = require('../models');

                    // Force delete any existing relation (including soft-deleted) to avoid unique constraint
                    await BranchMitraRelation.destroy({
                        where: { mitra_branch_id: branchId },
                        force: true // Hard delete, not soft delete
                    });
                    console.log(`ℹ️ BranchController.update - Cleared any existing mitra relations for branch=${branchId}`);

                    // Create new relation
                    await BranchMitraService.createMitraRelation(parent_branch_id, branchId, user_tenant_id, user_role);
                    console.log(`✅ BranchController.update - Created mitra relation: parent=${parent_branch_id}, mitra=${branchId}`);
                } catch (mitraError) {
                    console.error('❌ BranchController.update - Error creating mitra relation:', mitraError.message);
                    // Don't fail the whole operation, branch is already updated
                }
            } else if (branch_type === 'main') {
                // If changing to main, remove any mitra relations where this branch is mitra
                try {
                    const { BranchMitraRelation } = require('../models');

                    // Force delete any existing relation (including soft-deleted)
                    const deletedCount = await BranchMitraRelation.destroy({
                        where: { mitra_branch_id: branchId },
                        force: true // Hard delete, not soft delete
                    });

                    if (deletedCount > 0) {
                        console.log(`✅ BranchController.update - Deleted ${deletedCount} mitra relation(s) for branch=${branchId}`);
                    } else {
                        console.log(`ℹ️ BranchController.update - No mitra relation to delete for branch=${branchId}`);
                    }
                } catch (deleteError) {
                    console.error('❌ BranchController.update - Error deleting mitra relation:', deleteError.message);
                }
            }

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);

            // Ambil tenant_id dan role dari user yang login
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            await BranchService.delete(id, user_tenant_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getStats(req, res) {
        try {
            // Ambil tenant_id dan role dari user yang login
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            const data = await BranchService.getBranchStats(user_tenant_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getDetail(req, res) {
        try {
            const branch_id = parseInt(req.params.id, 10);

            // Ambil tenant_id dan role dari user yang login
            const user_tenant_id = req.user.tenant_id;
            const user_role = req.user.role;

            const data = await BranchService.getBranchDetail(branch_id, user_tenant_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
};

module.exports = BranchController;