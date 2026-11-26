const { FinanceCategory } = require('../models');

class FinanceCategoryRepository {
    static async create(data, transaction = null) {
        try {
            const result = await FinanceCategory.create(data, { transaction });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id, type = null) {
        try {
            const whereClause = { tenant_id };
            
            // Add type filter if provided
            if (type) {
                whereClause.type = type;
            }
            
            const result = await FinanceCategory.findAll({
                where: whereClause,
                order: [['is_system', 'DESC'], ['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id) {
        try {
            const result = await FinanceCategory.findOne({
                where: { id, tenant_id }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, tenant_id) {
        try {
            // Check if category exists and belongs to tenant
            const category = await FinanceCategory.findOne({
                where: { id, tenant_id }
            });

            if (!category) {
                throw new Error('Finance category not found');
            }

            // Prevent updating system categories
            if (category.is_system) {
                throw new Error('Cannot update system category');
            }

            const result = await FinanceCategory.update(data, { 
                where: { id, tenant_id } 
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id) {
        try {
            // Check if category exists and belongs to tenant
            const category = await FinanceCategory.findOne({
                where: { id, tenant_id }
            });

            if (!category) {
                throw new Error('Finance category not found');
            }

            // Prevent deleting system categories
            if (category.is_system) {
                throw new Error('Cannot delete system category');
            }

            const result = await FinanceCategory.destroy({ 
                where: { id, tenant_id } 
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = FinanceCategoryRepository;