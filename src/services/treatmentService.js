const TreatmentRepository = require("../repositories/treatmentRepository");

class TreatmentService {
    static async create(data, user_tenant_id = null, user_role = null) {
        try {
            // Ensure tenant_id is set for data isolation
            if (user_tenant_id) {
                data.tenant_id = user_tenant_id;
            }

            const result = await TreatmentRepository.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_role = null, page = 1, pageSize = 10, isActive = undefined) {
        try {
            const result = await TreatmentRepository.getAll(search, user_tenant_id, user_role, page, pageSize, isActive);
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null) {
        try  {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await TreatmentRepository.getById(id, user_tenant_id, user_role);
            if (!result) throw new Error("Treatment not found");

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(raw.id) || raw.id <= 0) throw new Error('Invalid ID');

            const data = Object.fromEntries(
                Object.entries(raw).filter(([_, value]) => value !== undefined)
            );

            const check = await TreatmentRepository.getById(data.id, user_tenant_id, user_role);
            if (!check) throw new Error("Treatment not found");

            const result = await TreatmentRepository.update(data.id, data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await TreatmentRepository.getById(id, user_tenant_id, user_role);
            if (!check) throw new Error("Treatment not found");

            await TreatmentRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async toggleStatus(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await TreatmentRepository.getById(id, user_tenant_id, user_role);
            if (!check) throw new Error("Treatment not found");

            const newStatus = !check.is_active;
            const result = await TreatmentRepository.update(id, { is_active: newStatus });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getOptions(user_tenant_id = null, user_role = null) {
        try {
            const result = await TreatmentRepository.getOptions(user_tenant_id, user_role);
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = TreatmentService;