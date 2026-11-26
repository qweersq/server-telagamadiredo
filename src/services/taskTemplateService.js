const TaskTemplateRepository = require('../repositories/taskTemplateRepository');

const BOOLEAN_FIELDS = ['requires_photo', 'is_active'];

class TaskTemplateService {
    /**
     * Menormalisasi input body menjadi payload yang aman untuk model.
     * Field yang tidak dikirim tidak ikut diubah (penting untuk update parsial).
     */
    static sanitize(body = {}, { tenant_id, created_by, isCreate = false } = {}) {
        const data = {};

        if (body.title !== undefined) {
            const title = String(body.title).trim();
            if (!title) throw new Error('Nama tugas wajib diisi');
            if (title.length > 150) throw new Error('Nama tugas maksimal 150 karakter');
            data.title = title;
        } else if (isCreate) {
            throw new Error('Nama tugas wajib diisi');
        }

        if (body.area !== undefined) {
            data.area = body.area === null || String(body.area).trim() === ''
                ? null
                : String(body.area).trim();
        }

        if (body.position !== undefined) {
            data.position = body.position === null || String(body.position).trim() === ''
                ? null
                : String(body.position).trim().toLowerCase();
        }

        if (body.branch_id !== undefined) {
            if (body.branch_id === null || body.branch_id === '' || body.branch_id === 0) {
                data.branch_id = null;
            } else {
                const branchId = parseInt(body.branch_id, 10);
                if (isNaN(branchId) || branchId <= 0) throw new Error('branch_id tidak valid');
                data.branch_id = branchId;
            }
        }

        BOOLEAN_FIELDS.forEach((field) => {
            if (body[field] === undefined) return;
            const value = body[field];
            data[field] = typeof value === 'boolean'
                ? value
                : ['true', '1', 1, 'on', 'yes'].includes(String(value).toLowerCase());
        });

        if (body.sort_order !== undefined) {
            const sortOrder = parseInt(body.sort_order, 10);
            if (isNaN(sortOrder)) throw new Error('sort_order tidak valid');
            data.sort_order = sortOrder;
        }

        if (isCreate) {
            if (tenant_id) data.tenant_id = tenant_id;
            if (created_by) data.created_by = created_by;
        }

        return data;
    }

    static async create(body, tenant_id = null, user_role = null, created_by = null) {
        try {
            // Superapp admin membuat template atas nama tenant yang dikirim di body
            const targetTenant = user_role === 'superapp-superadmin' && body.tenant_id
                ? parseInt(body.tenant_id, 10)
                : tenant_id;

            if (!targetTenant) throw new Error('tenant_id tidak ditemukan');

            const data = TaskTemplateService.sanitize(body, {
                tenant_id: targetTenant,
                created_by,
                isCreate: true,
            });

            return await TaskTemplateRepository.create(data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(params) {
        try {
            return await TaskTemplateRepository.getAll(params);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('ID tidak valid');

            const row = await TaskTemplateRepository.getById(id, tenant_id, user_role);
            if (!row) throw new Error('Template tugas tidak ditemukan');

            return row;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, body, tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('ID tidak valid');

            await TaskTemplateService.getById(id, tenant_id, user_role);

            const data = TaskTemplateService.sanitize(body, { isCreate: false });
            if (Object.keys(data).length === 0) throw new Error('Tidak ada data yang diubah');

            return await TaskTemplateRepository.update(id, data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('ID tidak valid');

            await TaskTemplateService.getById(id, tenant_id, user_role);
            await TaskTemplateRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async toggleStatus(id, tenant_id = null, user_role = null) {
        try {
            const row = await TaskTemplateService.getById(id, tenant_id, user_role);
            return await TaskTemplateRepository.update(id, { is_active: !row.is_active });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getPositions(tenant_id = null, user_role = null, branch_id = null) {
        try {
            return await TaskTemplateRepository.getPositions(tenant_id, user_role, branch_id);
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = TaskTemplateService;
