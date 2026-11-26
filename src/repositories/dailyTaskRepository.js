const { Op, sequelize, DailyTask, User, TaskTemplate } = require('../models');

const EMPLOYEE_ATTRS = ['id', 'name', 'position', 'branch_id', 'role'];
const TEMPLATE_INCLUDE = {
    model: TaskTemplate,
    as: 'template',
    attributes: ['id', 'requires_photo', 'position'],
    required: false,
};

class DailyTaskRepository {
    static async bulkCreate(rows) {
        try {
            if (!rows.length) return { inserted: 0 };

            const inserted = await DailyTask.bulkCreate(rows, { ignoreDuplicates: true });

            return { inserted: inserted.length };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async create(data) {
        try {
            return await DailyTask.create(data);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Tugas ini sudah ada untuk karyawan tersebut pada tanggal tersebut');
            }
            throw new Error(error.message);
        }
    }

    static async getByBranchDate({ tenant_id, branch_id, task_date, position = null, status = null, ai_verdict = null }) {
        try {
            const where = { tenant_id, task_date };
            if (branch_id) where.branch_id = branch_id;
            if (status) where.status = status;
            if (ai_verdict) where.ai_verdict = ai_verdict;

            const include = {
                model: User,
                as: 'employee',
                attributes: EMPLOYEE_ATTRS,
                required: false,
            };

            if (position) {
                include.where = { position };
                include.required = true;
            }

            return await DailyTask.findAll({
                where,
                include: [include, TEMPLATE_INCLUDE],
                order: [
                    [{ model: User, as: 'employee' }, 'name', 'ASC'],
                    ['id', 'ASC'],
                ],
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Tanggal terakhir (sebelum `before`) yang punya tugas di cabang ini.
     * Dipakai tombol "Salin tugas sebelumnya".
     */
    static async findLatestDateBefore({ tenant_id, branch_id, before }) {
        try {
            const row = await DailyTask.findOne({
                where: {
                    tenant_id,
                    branch_id,
                    task_date: { [Op.lt]: before },
                },
                attributes: ['task_date'],
                order: [['task_date', 'DESC']],
            });

            return row ? row.task_date : null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByUserDate({ tenant_id, user_id, task_date }) {
        try {
            return await DailyTask.findAll({
                where: { tenant_id, user_id, task_date },
                include: [TEMPLATE_INCLUDE],
                order: [['id', 'ASC']],
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id = null) {
        try {
            const where = { id };
            if (tenant_id) where.tenant_id = tenant_id;

            return await DailyTask.findOne({
                where,
                include: [
                    { model: User, as: 'employee', attributes: EMPLOYEE_ATTRS, required: false },
                    TEMPLATE_INCLUDE,
                ],
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const row = await DailyTask.findByPk(id, { transaction });
            if (!row) throw new Error('Tugas tidak ditemukan');

            await row.update(data, { transaction });
            await transaction.commit();

            return row;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            const deleted = await DailyTask.destroy({ where: { id } });
            if (!deleted) throw new Error('Tugas tidak ditemukan');

            return deleted;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getEmployees({ tenant_id, branch_id, position = null, user_ids = null }) {
        try {
            const where = { tenant_id, role: 'employee' };
            if (branch_id) where.branch_id = branch_id;
            if (position) where.position = position;
            if (user_ids && user_ids.length) where.id = { [Op.in]: user_ids };

            return await User.findAll({
                where,
                attributes: EMPLOYEE_ATTRS,
                order: [['name', 'ASC']],
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Tugas yang masih `pending` sampai tanggal tertentu diubah menjadi `incomplete`.
     * Dipakai saat karyawan absen pulang / tutup hari.
     */
    static async markPendingIncomplete({ tenant_id, user_id = null, branch_id = null, task_date }) {
        try {
            const where = {
                tenant_id,
                status: 'pending',
                task_date: { [Op.lte]: task_date },
            };
            if (user_id) where.user_id = user_id;
            if (branch_id) where.branch_id = branch_id;

            const [affected] = await DailyTask.update(
                { status: 'incomplete' },
                { where }
            );

            return affected;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = DailyTaskRepository;
