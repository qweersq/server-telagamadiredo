const { AdminNote, Op, User, Customer, Order, Branch, Tenant } = require('../models');

class AdminNoteRepository {
    static async create(data, transaction = null) {
        try {
            const result = await AdminNote.create(data, { transaction });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id, branch_id, transaction = null) {
        try {
            const result = await AdminNote.findOne({
                where: {
                    id,
                    tenant_id,
                    branch_id
                },
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'doneBy',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone'],
                        required: false
                    },
                    {
                        model: Order,
                        as: 'order',
                        attributes: ['id'],
                        required: false
                    }
                ],
                transaction
            });
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll({ page = 1, pageSize = 20, tenant_id, branch_id, status, priority, customer_id, order_id, search, dueDateFilter }) {
        try {
            const offset = (page - 1) * pageSize;
            
            // Build where conditions
            const whereConditions = {
                tenant_id,
                branch_id
            };
            
            // Status filter
            if (status && status !== 'all') {
                whereConditions.status = status;
            }
            
            // Priority filter
            if (priority && priority !== 'all') {
                whereConditions.priority = priority;
            }
            
            // Customer filter
            if (customer_id) {
                whereConditions.customer_id = customer_id;
            }
            
            // Order filter
            if (order_id) {
                whereConditions.order_id = order_id;
            }
            
            // Due date filter
            if (dueDateFilter) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                switch (dueDateFilter) {
                    case 'overdue':
                        whereConditions.due_date = { [Op.lt]: today };
                        whereConditions.status = 'pending';
                        break;
                    case 'due_today':
                        whereConditions.due_date = today;
                        whereConditions.status = 'pending';
                        break;
                    case 'due_this_week':
                        const weekEnd = new Date(today);
                        weekEnd.setDate(today.getDate() + 7);
                        whereConditions.due_date = { [Op.between]: [today, weekEnd] };
                        break;
                    case 'due_this_month':
                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        whereConditions.due_date = { [Op.between]: [today, monthEnd] };
                        break;
                }
            }
            
            // Search filter (title or content)
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { title: { [Op.substring]: search } },
                        { content: { [Op.substring]: search } },
                    ],
                }
                : {};
            
            const whereFilter = { ...whereConditions, ...searchFilter };
            
            // Get paginated notes
            const { count, rows: notes } = await AdminNote.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'doneBy',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'name', 'phone'],
                        required: false
                    },
                    {
                        model: Order,
                        as: 'order',
                        attributes: ['id'],
                        required: false
                    }
                ],
                where: whereFilter,
                order: [['createdAt', 'DESC']],
                limit: pageSize,
                offset: offset,
                distinct: true
            });
            
            // Get count by status for statistics
            const [pendingCount, doneCount, archivedCount] = await Promise.all([
                AdminNote.count({ where: { ...whereConditions, status: 'pending' } }),
                AdminNote.count({ where: { ...whereConditions, status: 'done' } }),
                AdminNote.count({ where: { ...whereConditions, status: 'archived' } })
            ]);
            
            const statistics = {
                total: count,
                pending: pendingCount,
                done: doneCount,
                archived: archivedCount
            };
            
            // Pagination info
            const pagination = {
                current_page: page,
                per_page: pageSize,
                total: count,
                total_pages: Math.ceil(count / pageSize),
                has_next: page < Math.ceil(count / pageSize),
                has_prev: page > 1
            };
            
            return {
                notes,
                pagination,
                statistics
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, tenant_id, branch_id, transaction = null) {
        try {
            const [updatedCount] = await AdminNote.update(
                data,
                {
                    where: {
                        id,
                        tenant_id,
                        branch_id
                    },
                    transaction
                }
            );
            
            if (updatedCount === 0) {
                throw new Error('Admin note not found');
            }
            
            return await this.getById(id, tenant_id, branch_id, transaction);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async markAsDone(id, user_id, tenant_id, branch_id, transaction = null) {
        try {
            const [updatedCount] = await AdminNote.update(
                {
                    status: 'done',
                    done_by: user_id,
                    done_at: new Date()
                },
                {
                    where: {
                        id,
                        tenant_id,
                        branch_id,
                        status: 'pending'
                    },
                    transaction
                }
            );
            
            if (updatedCount === 0) {
                throw new Error('Admin note not found or already done');
            }
            
            return await this.getById(id, tenant_id, branch_id, transaction);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id, branch_id, transaction = null) {
        try {
            const deletedCount = await AdminNote.destroy({
                where: {
                    id,
                    tenant_id,
                    branch_id
                },
                transaction
            });
            
            if (deletedCount === 0) {
                throw new Error('Admin note not found');
            }
            
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getPendingCount(tenant_id, branch_id) {
        try {
            const count = await AdminNote.count({
                where: {
                    tenant_id,
                    branch_id,
                    status: 'pending'
                }
            });
            return count;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = AdminNoteRepository;

