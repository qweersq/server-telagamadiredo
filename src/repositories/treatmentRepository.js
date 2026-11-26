const { Op, sequelize, Treatment, ProductCategory } = require('../models');

class TreatmentRepository {
    static async create(data) {
        try {
            const result = await Treatment.create(data);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_role = null, page = 1, pageSize = 10, isActive = undefined) {
        try {
            // Cari kategori yang namanya cocok dulu, lalu pakai id-nya di filter produk
            let matchedCategoryIds = [];
            if (search) {
                const matchedCategories = await ProductCategory.findAll({
                    where: { name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'],
                    raw: true
                });
                matchedCategoryIds = matchedCategories.map((row) => row.id);
            }

            const searchFilter = search
                ? {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { type_item: { [Op.like]: `%${search}%` } },
                        { type_service: { [Op.like]: `%${search}%` } },
                        { description: { [Op.like]: `%${search}%` } },
                        ...(matchedCategoryIds.length ? [{ category_id: { [Op.in]: matchedCategoryIds } }] : []),
                    ],
                }
                : {};

            let whereClause = { ...searchFilter };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
            }

            // Apply is_active filter if provided
            if (isActive !== undefined) {
                whereClause.is_active = isActive;
            }

            // Calculate pagination
            const offset = (page - 1) * pageSize;
            const limit = pageSize;

            // Get total count for pagination
            const totalItems = await Treatment.count({ where: whereClause });
            const totalPages = Math.ceil(totalItems / pageSize);

            // Get paginated results
            const treatments = await Treatment.findAll({
                where: whereClause,
                include: [{
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'name', 'type_service', 'order_mode'],
                    required: false
                }],
                order: [['id', 'ASC']],
                limit: limit,
                offset: offset,
                subQuery: false
            });

            // Return paginated response
            return {
                treatments: treatments,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
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
            let whereClause = {
                id: id
            };

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
            }

            const result = await Treatment.findOne({
                where: whereClause,
                include: [{
                    model: ProductCategory,
                    as: 'category',
                    attributes: ['id', 'name', 'type_service', 'order_mode'],
                    required: false
                }]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Treatment.findByPk(id);

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Treatment.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getOptions(user_tenant_id = null, user_role = null) {
        try {
            let whereClause = {};

            // Apply tenant isolation based on user role
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin can see all data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else {
                whereClause.tenant_id = user_tenant_id;
            }

            // Get grouped type_item options with count
            const typeItems = await Treatment.findAll({
                where: whereClause,
                attributes: [
                    'type_item',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['type_item'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                raw: true
            });

            // Get grouped type_service options with count (only non-null values)
            const typeServices = await Treatment.findAll({
                where: {
                    ...whereClause,
                    type_service: { [Op.ne]: null }
                },
                attributes: [
                    'type_service',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['type_service'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                raw: true
            });

            // Format the response
            const formattedTypeItems = typeItems.map(item => ({
                value: item.type_item,
                count: parseInt(item.count)
            }));

            const formattedTypeServices = typeServices.map(service => ({
                value: service.type_service,
                count: parseInt(service.count)
            }));

            return {
                type_items: formattedTypeItems,
                type_services: formattedTypeServices
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = TreatmentRepository;