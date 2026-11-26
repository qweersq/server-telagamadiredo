const { BranchMitraRelation, Branch, sequelize } = require('../models');

class BranchMitraRepository {
    /**
     * Create new mitra relation
     */
    static async create(parentBranchId, mitraBranchId, tenantId, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }

        try {
            const result = await BranchMitraRelation.create({
                parent_branch_id: parentBranchId,
                mitra_branch_id: mitraBranchId,
                tenant_id: tenantId,
                status: 'active'
            }, { transaction });

            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return result;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }

    /**
     * Get all mitras by parent branch ID
     */
    static async getMitrasByParentBranch(parentBranchId, tenantId = null) {
        try {
            const whereClause = {
                parent_branch_id: parentBranchId,
                status: 'active'
            };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const result = await BranchMitraRelation.findAll({
                where: whereClause,
                include: [
                    {
                        association: 'mitraBranch',
                        attributes: ['id', 'name', 'address', 'phone', 'city', 'status', 'branch_type']
                    },
                    {
                        association: 'parentBranch',
                        attributes: ['id', 'name', 'branch_type']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get parent branch by mitra branch ID
     */
    static async getParentByMitraBranch(mitraBranchId, tenantId = null) {
        try {
            const whereClause = {
                mitra_branch_id: mitraBranchId,
                status: 'active'
            };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const result = await BranchMitraRelation.findOne({
                where: whereClause,
                include: [
                    {
                        association: 'parentBranch',
                        attributes: ['id', 'name', 'address', 'phone', 'city', 'status', 'branch_type']
                    },
                    {
                        association: 'mitraBranch',
                        attributes: ['id', 'name', 'branch_type']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Find relation by mitra branch ID (check if branch is a mitra)
     */
    static async findByMitraBranch(mitraBranchId, tenantId = null) {
        try {
            const whereClause = {
                mitra_branch_id: mitraBranchId
            };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const result = await BranchMitraRelation.findOne({
                where: whereClause
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get all mitra branch IDs for a parent branch (for order queries)
     */
    static async getAllMitraBranchIds(parentBranchId, tenantId = null) {
        try {
            const whereClause = {
                parent_branch_id: parentBranchId,
                status: 'active'
            };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const relations = await BranchMitraRelation.findAll({
                where: whereClause,
                attributes: ['mitra_branch_id']
            });

            return relations.map(rel => rel.mitra_branch_id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get relation by ID
     */
    static async getById(relationId, tenantId = null) {
        try {
            const whereClause = { id: relationId };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const result = await BranchMitraRelation.findOne({
                where: whereClause,
                include: [
                    {
                        association: 'parentBranch',
                        attributes: ['id', 'name', 'branch_type']
                    },
                    {
                        association: 'mitraBranch',
                        attributes: ['id', 'name', 'branch_type']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Delete/Soft delete mitra relation
     */
    static async delete(relationId, tenantId = null, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }

        try {
            const whereClause = { id: relationId };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const relation = await BranchMitraRelation.findOne({
                where: whereClause,
                transaction
            });

            if (!relation) {
                throw new Error('Mitra relation not found or access denied');
            }

            await relation.destroy({ transaction });

            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return relation;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }

    /**
     * Update relation status
     */
    static async updateStatus(relationId, status, tenantId = null, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }

        try {
            const whereClause = { id: relationId };

            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const relation = await BranchMitraRelation.findOne({
                where: whereClause,
                transaction
            });

            if (!relation) {
                throw new Error('Mitra relation not found or access denied');
            }

            await relation.update({ status }, { transaction });

            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return relation;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }
}

module.exports = BranchMitraRepository;
