const BranchMitraService = require('../services/branchMitraService');
const { ResponseHelper } = require('../helpers');

class BranchMitraController {
    /**
     * Create mitra relation
     * POST /api/branch-mitra
     */
    static async create(req, res) {
        try {
            const { parent_branch_id, mitra_branch_id } = req.body;

            // Validasi input
            if (!parent_branch_id || !mitra_branch_id) {
                return res.status(400).send(
                    ResponseHelper.errorResponse('parent_branch_id dan mitra_branch_id harus diisi', 400)
                );
            }

            const userTenantId = req.user.tenant_id;

            const result = await BranchMitraService.createMitraRelation(
                parseInt(parent_branch_id, 10),
                parseInt(mitra_branch_id, 10),
                userTenantId
            );

            return res.status(201).send(ResponseHelper.successResponse(result, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    /**
     * Get all mitras for a parent branch
     * GET /api/branch-mitra/parent/:parentBranchId
     */
    static async getMitrasByParent(req, res) {
        try {
            const parentBranchId = parseInt(req.params.parentBranchId, 10);
            const userTenantId = req.user.tenant_id;
            const userRole = req.user.role;

            const mitras = await BranchMitraService.getMitrasByParentBranch(
                parentBranchId,
                userTenantId,
                userRole
            );

            return res.status(200).send(ResponseHelper.successResponse(mitras));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get parent branch for a mitra
     * GET /api/branch-mitra/mitra/:mitraBranchId/parent
     */
    static async getParentByMitra(req, res) {
        try {
            const mitraBranchId = parseInt(req.params.mitraBranchId, 10);
            const userTenantId = req.user.tenant_id;
            const userRole = req.user.role;

            const parentRelation = await BranchMitraService.getParentBranch(
                mitraBranchId,
                userTenantId,
                userRole
            );

            return res.status(200).send(ResponseHelper.successResponse(parentRelation));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    /**
     * Get relation by ID
     * GET /api/branch-mitra/:relationId
     */
    static async getById(req, res) {
        try {
            const relationId = parseInt(req.params.relationId, 10);
            const userTenantId = req.user.tenant_id;
            const userRole = req.user.role;

            const relation = await BranchMitraService.getRelationById(
                relationId,
                userTenantId,
                userRole
            );

            return res.status(200).send(ResponseHelper.successResponse(relation));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    /**
     * Delete mitra relation
     * DELETE /api/branch-mitra/:id
     */
    static async delete(req, res) {
        try {
            const relationId = parseInt(req.params.id, 10);
            const userTenantId = req.user.tenant_id;
            const userRole = req.user.role;

            const result = await BranchMitraService.deleteMitraRelation(
                relationId,
                userTenantId,
                userRole
            );

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = BranchMitraController;
