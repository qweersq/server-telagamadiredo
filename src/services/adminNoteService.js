const AdminNoteRepository = require('../repositories/adminNoteRepository');

class AdminNoteService {
    static async create(data) {
        try {
            // Validasi required fields
            if (!data.title || !data.title.trim()) {
                throw new Error('Title is required');
            }
            if (!data.content || !data.content.trim()) {
                throw new Error('Content is required');
            }
            if (!data.created_by) {
                throw new Error('Created by is required');
            }
            if (!data.tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!data.branch_id) {
                throw new Error('Branch ID is required');
            }

            // Prepare note data
            const noteData = {
                title: data.title.trim(),
                content: data.content.trim(),
                customer_id: data.customer_id || null,
                order_id: data.order_id || null,
                status: data.status || 'pending',
                priority: data.priority || 'normal',
                due_date: data.due_date || null,
                created_by: data.created_by,
                updated_by: data.created_by, // Set updated_by same as created_by initially
                branch_id: data.branch_id,
                tenant_id: data.tenant_id
            };

            const result = await AdminNoteRepository.create(noteData);
            return result;
        } catch (error) {
            throw new Error(`Failed to create admin note: ${error.message}`);
        }
    }

    static async getAll(filters) {
        try {
            const {
                page = 1,
                pageSize = 20,
                tenant_id,
                branch_id,
                status,
                priority,
                customer_id,
                order_id,
                search,
                dueDateFilter
            } = filters;

            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!branch_id) {
                throw new Error('Branch ID is required');
            }

            const result = await AdminNoteRepository.getAll({
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                tenant_id,
                branch_id,
                status,
                priority,
                customer_id,
                order_id,
                search,
                dueDateFilter
            });

            return result;
        } catch (error) {
            throw new Error(`Failed to get admin notes: ${error.message}`);
        }
    }

    static async getById(id, tenant_id, branch_id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('Invalid note ID');
            }
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!branch_id) {
                throw new Error('Branch ID is required');
            }

            const result = await AdminNoteRepository.getById(id, tenant_id, branch_id);
            if (!result) {
                throw new Error('Admin note not found');
            }

            return result;
        } catch (error) {
            throw new Error(`Failed to get admin note: ${error.message}`);
        }
    }

    static async update(id, data, tenant_id, branch_id, user_id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('Invalid note ID');
            }
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!branch_id) {
                throw new Error('Branch ID is required');
            }
            if (!user_id) {
                throw new Error('User ID is required');
            }

            // Prepare update data
            const updateData = {};
            if (data.title !== undefined) updateData.title = data.title.trim();
            if (data.content !== undefined) updateData.content = data.content.trim();
            if (data.customer_id !== undefined) updateData.customer_id = data.customer_id || null;
            if (data.order_id !== undefined) updateData.order_id = data.order_id || null;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.priority !== undefined) updateData.priority = data.priority;
            if (data.due_date !== undefined) updateData.due_date = data.due_date || null;
            updateData.updated_by = user_id;

            // Validate title and content if provided
            if (updateData.title !== undefined && !updateData.title) {
                throw new Error('Title cannot be empty');
            }
            if (updateData.content !== undefined && !updateData.content) {
                throw new Error('Content cannot be empty');
            }

            const result = await AdminNoteRepository.update(id, updateData, tenant_id, branch_id);
            return result;
        } catch (error) {
            throw new Error(`Failed to update admin note: ${error.message}`);
        }
    }

    static async markAsDone(id, tenant_id, branch_id, user_id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('Invalid note ID');
            }
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!branch_id) {
                throw new Error('Branch ID is required');
            }
            if (!user_id) {
                throw new Error('User ID is required');
            }

            const result = await AdminNoteRepository.markAsDone(id, user_id, tenant_id, branch_id);
            return result;
        } catch (error) {
            throw new Error(`Failed to mark note as done: ${error.message}`);
        }
    }

    static async delete(id, tenant_id, branch_id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('Invalid note ID');
            }
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!branch_id) {
                throw new Error('Branch ID is required');
            }

            const result = await AdminNoteRepository.delete(id, tenant_id, branch_id);
            return result;
        } catch (error) {
            throw new Error(`Failed to delete admin note: ${error.message}`);
        }
    }

    static async getPendingCount(tenant_id, branch_id) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            if (!branch_id) {
                throw new Error('Branch ID is required');
            }

            const count = await AdminNoteRepository.getPendingCount(tenant_id, branch_id);
            return count;
        } catch (error) {
            throw new Error(`Failed to get pending count: ${error.message}`);
        }
    }
}

module.exports = AdminNoteService;

