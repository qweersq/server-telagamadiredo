const { Op, sequelize, ProductCategory, Treatment } = require('../models');

class ProductCategoryRepository {
    static buildTenantFilter(user_tenant_id = null, user_role = null) {
        // Super App Super Admin melihat semua tenant, role lain diisolasi ke tenant-nya
        if (user_role === 'superapp-superadmin') return {};
        return { tenant_id: user_tenant_id };
    }

    static async create(data) {
        try {
            const result = await ProductCategory.create(data);
            return result;
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Nama kategori sudah dipakai');
            }
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_role = null, page = 1, pageSize = 10, isActive = undefined, typeService = undefined, orderMode = undefined) {
        try {
            const whereClause = { ...this.buildTenantFilter(user_tenant_id, user_role) };

            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { type_service: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            if (isActive !== undefined) {
                whereClause.is_active = isActive;
            }

            if (typeService) {
                whereClause.type_service = typeService;
            }

            // orderMode = 'loket' | 'cafe' → ikut sertakan kategori lintas outlet (NULL)
            if (orderMode) {
                whereClause.order_mode = { [Op.or]: [orderMode, null] };
            }

            const offset = (page - 1) * pageSize;
            const totalItems = await ProductCategory.count({ where: whereClause });
            const totalPages = Math.ceil(totalItems / pageSize) || 1;

            const categories = await ProductCategory.findAll({
                where: whereClause,
                order: [['sort_order', 'ASC'], ['name', 'ASC']],
                limit: pageSize,
                offset,
                attributes: [
                    'id',
                    'tenant_id',
                    'name',
                    'type_service',
                    'order_mode',
                    'description',
                    'sort_order',
                    'is_active',
                    'createdAt',
                    'updatedAt',
                    [
                        sequelize.literal(
                            '(SELECT COUNT(*) FROM treatment t WHERE t.category_id = product_categories.id AND t.deletedAt IS NULL)'
                        ),
                        'product_count'
                    ]
                ],
                subQuery: false
            });

            return {
                categories: categories.map((row) => {
                    const plain = row.get({ plain: true });
                    return { ...plain, product_count: Number(plain.product_count || 0) };
                }),
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: pageSize,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null) {
        try {
            const result = await ProductCategory.findOne({
                where: { id, ...this.buildTenantFilter(user_tenant_id, user_role) }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getOptions(user_tenant_id = null, user_role = null) {
        try {
            const rows = await ProductCategory.findAll({
                where: { ...this.buildTenantFilter(user_tenant_id, user_role), is_active: true },
                order: [['sort_order', 'ASC'], ['name', 'ASC']],
                attributes: ['id', 'name', 'type_service', 'order_mode', 'sort_order'],
                raw: true
            });

            return rows.map((row) => ({
                value: row.id,
                label: row.name,
                type_service: row.type_service,
                order_mode: row.order_mode,
                sort_order: row.sort_order
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async countProducts(categoryId) {
        return Treatment.count({ where: { category_id: categoryId } });
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await ProductCategory.findByPk(id, { transaction });

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Nama kategori sudah dipakai');
            }
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await ProductCategory.findByPk(id, { transaction });

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }
}

module.exports = ProductCategoryRepository;
