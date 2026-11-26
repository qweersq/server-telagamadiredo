const FinanceCategoryRepository = require('../repositories/financeCategoryRepository');

class FinanceCategoryService {
    static async create(name, type, description, tenant_id) {
        try {
            const data = {
                name,
                type,
                description,
                tenant_id,
                is_system: false
            }
            const financeCategory = await FinanceCategoryRepository.create(data);

            return financeCategory;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id, type = null) {
        try {
            const financeCategories = await FinanceCategoryRepository.getAll(tenant_id, type);

            return financeCategories;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id) {
        try {
            const financeCategory = await FinanceCategoryRepository.getById(id, tenant_id);

            return financeCategory;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, name, type, description, tenant_id) {
        try {
            const data = {
                name,
                type,
                description
            };
            const financeCategory = await FinanceCategoryRepository.update(id, data, tenant_id);

            return financeCategory;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id) {
        try {
            const financeCategory = await FinanceCategoryRepository.delete(id, tenant_id);

            return financeCategory;
        } catch (error) {
            throw new Error(error.message);
        }
    }

}

module.exports = FinanceCategoryService;
