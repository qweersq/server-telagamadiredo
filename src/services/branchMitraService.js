const BranchMitraRepository = require('../repositories/branchMitraRepository');
const BranchRepository = require('../repositories/branchRepository');
const { Branch, sequelize } = require('../models');

class BranchMitraService {
    /**
     * Create mitra relation
     */
    static async createMitraRelation(parentBranchId, mitraBranchId, userTenantId) {
        const transaction = await sequelize.transaction();

        try {
            // Validasi: parent dan mitra ID tidak boleh sama
            if (parentBranchId === mitraBranchId) {
                throw new Error('Parent branch dan mitra branch tidak boleh sama');
            }

            // Validasi: parent branch exists dan dalam tenant yang sama
            const parentBranch = await BranchRepository.getById(parentBranchId, userTenantId);
            if (!parentBranch) {
                throw new Error('Parent branch tidak ditemukan atau bukan milik tenant Anda');
            }

            // Validasi: mitra branch exists dan dalam tenant yang sama
            const mitraBranch = await BranchRepository.getById(mitraBranchId, userTenantId);
            if (!mitraBranch) {
                throw new Error('Mitra branch tidak ditemukan atau bukan milik tenant Anda');
            }

            // Validasi: parent branch bukan mitra dari branch lain
            const parentRelation = await BranchMitraRepository.findByMitraBranch(parentBranchId, userTenantId);
            if (parentRelation) {
                throw new Error('Parent branch tidak bisa menjadi parent karena sudah menjadi mitra dari branch lain');
            }

            // Validasi: mitra branch belum terhubung ke parent lain
            const existingRelation = await BranchMitraRepository.findByMitraBranch(mitraBranchId, userTenantId);
            if (existingRelation) {
                throw new Error('Mitra branch sudah terhubung ke parent branch lain');
            }

            // Create relasi
            const relation = await BranchMitraRepository.create(
                parentBranchId,
                mitraBranchId,
                userTenantId,
                transaction
            );

            // Update mitra branch type menjadi 'mitra'
            await Branch.update(
                { branch_type: 'mitra' },
                {
                    where: { id: mitraBranchId },
                    transaction
                }
            );

            await transaction.commit();

            // Fetch complete relation with includes
            const result = await BranchMitraRepository.getById(relation.id, userTenantId);
            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    /**
     * Get all mitras for a parent branch
     */
    static async getMitrasByParentBranch(parentBranchId, userTenantId, userRole) {
        try {
            // Validasi akses: user harus bisa akses parent branch
            if (userRole !== 'superapp-superadmin') {
                const parentBranch = await BranchRepository.getById(parentBranchId, userTenantId);
                if (!parentBranch) {
                    throw new Error('Parent branch tidak ditemukan atau Anda tidak memiliki akses');
                }
            }

            const mitras = await BranchMitraRepository.getMitrasByParentBranch(parentBranchId, userTenantId);
            return mitras;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get parent branch info for a mitra
     */
    static async getParentBranch(mitraBranchId, userTenantId, userRole) {
        try {
            // Validasi akses: user harus bisa akses mitra branch
            if (userRole !== 'superapp-superadmin') {
                const mitraBranch = await BranchRepository.getById(mitraBranchId, userTenantId);
                if (!mitraBranch) {
                    throw new Error('Mitra branch tidak ditemukan atau Anda tidak memiliki akses');
                }
            }

            const parentRelation = await BranchMitraRepository.getParentByMitraBranch(mitraBranchId, userTenantId);

            if (!parentRelation) {
                throw new Error('Branch ini bukan mitra dari branch manapun');
            }

            return parentRelation;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Delete mitra relation
     */
    static async deleteMitraRelation(relationId, userTenantId, userRole) {
        const transaction = await sequelize.transaction();

        try {
            // Get relation info
            const relation = await BranchMitraRepository.getById(relationId, userTenantId);

            if (!relation) {
                throw new Error('Relasi mitra tidak ditemukan atau Anda tidak memiliki akses');
            }

            const mitraBranchId = relation.mitra_branch_id;

            // Delete relation
            await BranchMitraRepository.delete(relationId, userTenantId, transaction);

            // Update mitra branch type kembali ke 'main'
            await Branch.update(
                { branch_type: 'main' },
                {
                    where: { id: mitraBranchId },
                    transaction
                }
            );

            await transaction.commit();

            return { message: 'Relasi mitra berhasil dihapus' };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    /**
     * Get relation by ID
     */
    static async getRelationById(relationId, userTenantId, userRole) {
        try {
            const relation = await BranchMitraRepository.getById(relationId, userTenantId);

            if (!relation) {
                throw new Error('Relasi mitra tidak ditemukan atau Anda tidak memiliki akses');
            }

            return relation;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = BranchMitraService;
