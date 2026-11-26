const ProductCategoryRepository = require('../repositories/productCategoryRepository');

class ProductCategoryService {
    static normalizeOrderMode(value) {
        const normalized = String(value ?? '').trim().toLowerCase();
        return ['loket', 'cafe'].includes(normalized) ? normalized : null;
    }

    static async create(data, user_tenant_id = null, user_role = null) {
        try {
            const name = (data.name || '').trim();
            if (!name) throw new Error('Nama kategori wajib diisi');

            const payload = {
                tenant_id: user_tenant_id,
                name,
                type_service: data.type_service ? String(data.type_service).trim() : null,
                order_mode: ProductCategoryService.normalizeOrderMode(data.order_mode),
                description: data.description ?? null,
                sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0,
                is_active: data.is_active === undefined ? true : Boolean(data.is_active)
            };

            return await ProductCategoryRepository.create(payload);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_role = null, page = 1, pageSize = 10, isActive = undefined, typeService = undefined, orderMode = undefined) {
        try {
            return await ProductCategoryRepository.getAll(search, user_tenant_id, user_role, page, pageSize, isActive, typeService, orderMode);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await ProductCategoryRepository.getById(id, user_tenant_id, user_role);
            if (!result) throw new Error('Kategori produk tidak ditemukan');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(raw, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(raw.id) || raw.id <= 0) throw new Error('Invalid ID');

            const data = Object.fromEntries(
                Object.entries(raw).filter(([, value]) => value !== undefined)
            );

            const check = await ProductCategoryRepository.getById(data.id, user_tenant_id, user_role);
            if (!check) throw new Error('Kategori produk tidak ditemukan');

            if (data.name !== undefined) {
                data.name = String(data.name).trim();
                if (!data.name) throw new Error('Nama kategori wajib diisi');
            }
            if (data.sort_order !== undefined) {
                data.sort_order = Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0;
            }
            if (data.type_service !== undefined) {
                data.type_service = data.type_service ? String(data.type_service).trim() : null;
            }
            if (data.order_mode !== undefined) {
                data.order_mode = ProductCategoryService.normalizeOrderMode(data.order_mode);
            }

            delete data.id;
            delete data.tenant_id;

            return await ProductCategoryRepository.update(raw.id, data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await ProductCategoryRepository.getById(id, user_tenant_id, user_role);
            if (!check) throw new Error('Kategori produk tidak ditemukan');

            const productCount = await ProductCategoryRepository.countProducts(id);
            if (productCount > 0) {
                throw new Error(`Kategori masih dipakai ${productCount} produk. Pindahkan produknya atau nonaktifkan kategori ini.`);
            }

            await ProductCategoryRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async toggleStatus(id, user_tenant_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const check = await ProductCategoryRepository.getById(id, user_tenant_id, user_role);
            if (!check) throw new Error('Kategori produk tidak ditemukan');

            return await ProductCategoryRepository.update(id, { is_active: !check.is_active });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getOptions(user_tenant_id = null, user_role = null) {
        try {
            return await ProductCategoryRepository.getOptions(user_tenant_id, user_role);
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = ProductCategoryService;
