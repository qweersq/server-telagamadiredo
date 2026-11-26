const { Branch, User, Customer, Order, OrderDetail, Shift, sequelize } = require('../models');

class BranchRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }

        try {
            const result = await Branch.create(data, { transaction });

            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return result;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }

    static async getAll(tenant_id = null) {
        try {
            const whereClause = tenant_id ? { tenant_id } : {};
            const result = await Branch.findAll({
                where: whereClause,
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'status']
                    },
                    {
                        association: 'parentRelation', // Include parent branch info for mitra
                        include: [{
                            association: 'parentBranch',
                            attributes: ['id', 'name', 'address', 'city']
                        }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(branch_id, tenant_id = null) {
        try {
            const whereClause = { id: branch_id };
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Branch.findOne({
                where: whereClause,
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'status']
                    },
                    {
                        association: 'mitraRelations', // Sebagai parent, punya anak
                        include: [{ association: 'mitraBranch', attributes: ['id', 'name', 'address', 'phone', 'city', 'status'] }]
                    },
                    {
                        association: 'parentRelation', // Sebagai anak, punya parent
                        include: [{ association: 'parentBranch', attributes: ['id', 'name', 'address', 'phone', 'city'] }]
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByTenant(tenant_id) {
        try {
            const result = await Branch.findAll({
                where: { tenant_id },
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'status']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByTenantId(tenant_id) {
        try {
            const result = await Branch.findOne({
                where: { tenant_id },
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'status']
                    }
                ],
                order: [['createdAt', 'ASC']] // Get the first branch created
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const whereClause = { id };
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Branch.findOne({ where: whereClause });
            if (!result) {
                throw new Error('Branch not found or access denied');
            }

            // Filter data yang akan diupdate (exclude id dari data)
            const updateData = { ...data };
            delete updateData.id;

            await result.update(updateData, { transaction });
            await transaction.commit();

            // Return updated data dengan include tenant info
            const updatedResult = await Branch.findByPk(id, {
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'status']
                    }
                ]
            });

            return updatedResult;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const whereClause = { id };
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Branch.findOne({ where: whereClause });
            if (!result) {
                throw new Error('Branch not found or access denied');
            }

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getBranchStats(tenant_id = null) {
        try {
            const whereClause = tenant_id ? { tenant_id } : {};

            const totalBranches = await Branch.count({ where: whereClause });

            const activeBranches = await Branch.count({
                where: { ...whereClause, status: 'active' }
            });

            return {
                total_branches: totalBranches,
                active_branches: activeBranches,
                inactive_branches: totalBranches - activeBranches
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getBranchDetail(branch_id, tenant_id = null) {
        try {
            // SIMPLE: Hanya ambil data branch dulu
            const whereClause = { id: branch_id };
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            // Get branch data
            const branch = await Branch.findOne({
                where: whereClause,
                include: [
                    {
                        association: 'tenant',
                        attributes: ['id', 'business_name', 'status']
                    }
                ]
            });

            if (!branch) {
                throw new Error('Branch not found or access denied');
            }

            const target_tenant_id = tenant_id || branch.tenant_id;

            // SIMPLE ENHANCED COUNTS: Data prioritas untuk owner
            const [total_users, total_orders, total_customers, total_shifts] = await Promise.all([
                // Basic counts
                User.count({
                    where: {
                        branch_id: branch_id,
                        tenant_id: target_tenant_id,
                        deletedAt: null
                    }
                }),
                Order.count({
                    where: {
                        branch_id: branch_id,
                        tenant_id: target_tenant_id,
                        deletedAt: null
                    }
                }),
                Customer.count({
                    where: {
                        branch_id: branch_id,
                        tenant_id: target_tenant_id,
                        deletedAt: null
                    }
                }),
                // Total shifts
                Shift.count({
                    where: {
                        branch_id: branch_id,
                        tenant_id: target_tenant_id,
                        deletedAt: null
                    }
                })
            ]);

            // Additional financial data (simplified)
            const [revenue_data, sales_data] = await Promise.all([
                // Revenue data (dari order_details)
                sequelize.query(`
                    SELECT 
                        COALESCE(SUM(od.final_price), 0) as total_revenue,
                        COALESCE(AVG(od.final_price), 0) as avg_order_value,
                        -- ✅ Total Item = jumlah BARANG, bukan jumlah baris order_details:
                        --    1 sepatu dengan 2 layanan tetap 1 item, tapi item_id yang
                        --    sama di order berbeda dihitung terpisah.
                        COALESCE(COUNT(DISTINCT od.order_id, od.item_id), 0) as total_items_sold
                    FROM orders o 
                    JOIN order_details od ON o.id = od.order_id 
                    WHERE o.branch_id = :branch_id 
                    AND o.tenant_id = :tenant_id 
                    AND o.deletedAt IS NULL 
                    AND od.deletedAt IS NULL
                `, {
                    replacements: { branch_id, tenant_id: target_tenant_id },
                    type: sequelize.QueryTypes.SELECT
                }),
                // Sales data (dari payment_details - uang yang benar-benar masuk)
                sequelize.query(`
                    SELECT 
                        COALESCE(SUM(pd.final_amount), 0) as total_sales
                    FROM payment_details pd
                    JOIN payments p ON pd.payment_id = p.id
                    JOIN orders o ON o.payment_id = p.id
                    WHERE o.branch_id = :branch_id 
                    AND o.tenant_id = :tenant_id 
                    AND o.deletedAt IS NULL
                    AND p.deletedAt IS NULL
                    AND pd.deletedAt IS NULL
                `, {
                    replacements: { branch_id, tenant_id: target_tenant_id },
                    type: sequelize.QueryTypes.SELECT
                })
            ]);

            // Extract data from queries
            const revenue = revenue_data[0] || {};
            const sales = sales_data[0] || {};

            return {
                // Basic Information
                id: branch.id,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                city: branch.city,
                status: branch.status,
                longitude: parseFloat(branch.longitude) || null,
                latitude: parseFloat(branch.latitude) || null,
                wa_session_id: branch.wa_session_id,
                manager_id: branch.manager_id,
                createdAt: branch.createdAt,
                updatedAt: branch.updatedAt,

                // Basic counts
                total_users: total_users,
                total_orders: total_orders,
                total_customers: total_customers,
                total_shifts: total_shifts,

                // Financial Performance (Priority Data)
                total_revenue: parseFloat(revenue.total_revenue) || 0,
                total_sales: parseFloat(sales.total_sales) || 0,
                total_cash: 0,
                total_bank_transfer: 0,
                avg_order_value: parseFloat(revenue.avg_order_value) || 0,
                total_items_sold: parseInt(revenue.total_items_sold) || 0,

                // Time-based Performance (simplified)
                today_orders: 0, // Will add later if needed
                today_sales: 0,  // Will add later if needed
                this_week_orders: 0, // Will add later if needed
                this_month_orders: 0, // Will add later if needed

                // Operational Status
                manager_assigned: branch.manager_id > 0,
                wa_connected: branch.wa_session_id !== null,

                // Tenant Information
                tenant: branch.tenant
            };

        } catch (error) {
            throw new Error(error.message);
        }
    }

};

module.exports = BranchRepository;