const { Op, sequelize, TaskTemplate } = require('../models');

class TaskTemplateRepository {
    /**
     * Filter tenant mengikuti pola repository lain: superapp-superadmin bebas,
     * role lain terkunci ke tenant miliknya.
     */
    static tenantFilter(user_tenant_id, user_role) {
        if (user_role === 'superapp-superadmin') return {};
        return user_tenant_id ? { tenant_id: user_tenant_id } : {};
    }

    static async create(data) {
        try {
            return await TaskTemplate.create(data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * @param {object} params
     * @param {number|null} params.branch_id - bila diisi, template global (branch_id NULL) juga ikut
     * @param {string|null} params.position
     */
    static async getAll({
        tenant_id = null,
        user_role = null,
        branch_id = null,
        position = null,
        search = null,
        is_active = undefined,
        page = 1,
        pageSize = 50,
    } = {}) {
        try {
            const whereClause = { ...TaskTemplateRepository.tenantFilter(tenant_id, user_role) };

            if (search) {
                whereClause.title = { [Op.like]: `%${search}%` };
            }

            if (position) {
                whereClause[Op.and] = [
                    { [Op.or]: [{ position }, { position: null }] },
                ];
            }

            if (is_active !== undefined) {
                whereClause.is_active = is_active;
            }

            if (branch_id) {
                whereClause[Op.and] = [
                    ...(whereClause[Op.and] || []),
                    { [Op.or]: [{ branch_id }, { branch_id: null }] },
                ];
            }

            const totalItems = await TaskTemplate.count({ where: whereClause });
            const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;

            const findAllOptions = {
                where: whereClause,
                order: [['sort_order', 'ASC'], ['id', 'ASC']],
            };

            if (pageSize > 0) {
                findAllOptions.limit = pageSize;
                findAllOptions.offset = (page - 1) * pageSize;
            }

            const task_templates = await TaskTemplate.findAll(findAllOptions);

            return {
                task_templates,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: pageSize,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id = null, user_role = null) {
        try {
            return await TaskTemplate.findOne({
                where: { id, ...TaskTemplateRepository.tenantFilter(tenant_id, user_role) },
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const row = await TaskTemplate.findByPk(id, { transaction });
            if (!row) throw new Error('Template tugas tidak ditemukan');

            await row.update(data, { transaction });
            await transaction.commit();

            return row;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const row = await TaskTemplate.findByPk(id, { transaction });
            if (!row) throw new Error('Template tugas tidak ditemukan');

            await row.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    /**
     * Daftar posisi (jabatan) yang sudah punya template aktif, dipakai untuk
     * dropdown & tombol generate massal di halaman supervisor.
     */
    static async getPositions(tenant_id = null, user_role = null, branch_id = null) {
        try {
            const whereClause = {
                ...TaskTemplateRepository.tenantFilter(tenant_id, user_role),
                is_active: true,
            };

            if (branch_id) {
                whereClause[Op.and] = [{ [Op.or]: [{ branch_id }, { branch_id: null }] }];
            }

            const rows = await TaskTemplate.findAll({
                where: whereClause,
                attributes: [
                    'position',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                group: ['position'],
                order: [['position', 'ASC']],
                raw: true,
            });

            return rows.map((row) => ({
                position: row.position,
                total: parseInt(row.count, 10),
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Template aktif yang berlaku untuk satu karyawan: milik tenant, aktif,
     * untuk cabang tersebut atau global, dan cocok dengan posisinya atau global.
     */
    static async findActiveForPosition({ tenant_id, branch_id = null, position = null }) {
        try {
            // Karyawan tanpa posisi hanya mendapat template generik (position NULL),
            // bukan seluruh template tenant.
            const positionFilter = position
                ? { [Op.or]: [{ position }, { position: null }] }
                : { position: null };

            const and = [
                { [Op.or]: [{ branch_id: null }, branch_id ? { branch_id } : { branch_id: null }] },
                positionFilter,
            ];

            return await TaskTemplate.findAll({
                where: { tenant_id, is_active: true, [Op.and]: and },
                order: [['sort_order', 'ASC'], ['id', 'ASC']],
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = TaskTemplateRepository;
