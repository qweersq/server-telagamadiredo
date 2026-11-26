const { Printer, Tenant, Branch, User, Op, sequelize } = require('../models');

class PrinterRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await Printer.create(data, { transaction });
            
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

    static async getAll(search, status, printer_type, tenant_id, branch_id) {
        try {
            const whereClause = {};
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }
            
            // Filter by branch_id if provided
            if (branch_id) {
                whereClause.branch_id = branch_id;
            }
            
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { device_name: { [Op.like]: `%${search}%` } },
                    { device_id: { [Op.like]: `%${search}%` } }
                ];
            }

            if (status) {
                whereClause.status = status;
            }

            if (printer_type) {
                whereClause.printer_type = printer_type;
            }

            const result = await Printer.findAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name']
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id = null) {
        try {
            const whereClause = { id };
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Printer.findOne({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name']
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByBranch(branch_id, tenant_id = null) {
        try {
            const whereClause = { branch_id };
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Printer.findAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name']
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    }
                ],
                order: [['is_default', 'DESC'], ['createdAt', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDefaultPrinter(branch_id, tenant_id = null) {
        try {
            const whereClause = { 
                branch_id,
                is_default: true,
                status: 'active'
            };
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Printer.findOne({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name']
                    },
                    {
                        model: Branch,
                        as: 'branch',
                        attributes: ['id', 'name', 'address']
                    }
                ]
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
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Printer.update(data, {
                where: whereClause,
                transaction
            });

            if (result[0] === 0) throw new Error('Printer not found');

            await transaction.commit();

            return await this.getById(id, tenant_id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const whereClause = { id };
            
            // Filter by tenant_id if provided
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Printer.destroy({
                where: whereClause,
                transaction
            });

            if (result === 0) throw new Error('Printer not found');

            await transaction.commit();

            return { message: 'Printer deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async setDefaultPrinter(id, branch_id, tenant_id = null) {
        const transaction = await sequelize.transaction();
        try {
            // First, unset all default printers for this branch
            await Printer.update(
                { is_default: false },
                {
                    where: { 
                        branch_id,
                        ...(tenant_id && { tenant_id })
                    },
                    transaction
                }
            );

            // Then set the selected printer as default
            const whereClause = { id };
            
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const result = await Printer.update(
                { is_default: true },
                {
                    where: whereClause,
                    transaction
                }
            );

            if (result[0] === 0) throw new Error('Printer not found');

            await transaction.commit();

            return await this.getById(id, tenant_id);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateStatus(id, status, tenant_id = null) {
        try {
            const whereClause = { id };
            
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const updateData = { 
                status,
                last_connected: status === 'active' ? new Date() : null
            };

            const result = await Printer.update(updateData, {
                where: whereClause
            });

            if (result[0] === 0) throw new Error('Printer not found');

            return await this.getById(id, tenant_id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getPrinterStats(tenant_id = null) {
        try {
            const whereClause = {};
            
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            const [
                totalPrinters,
                activePrinters,
                inactivePrinters,
                maintenancePrinters,
                disconnectedPrinters
            ] = await Promise.all([
                Printer.count({ where: whereClause }),
                Printer.count({ where: { ...whereClause, status: 'active' } }),
                Printer.count({ where: { ...whereClause, status: 'inactive' } }),
                Printer.count({ where: { ...whereClause, status: 'maintenance' } }),
                Printer.count({ where: { ...whereClause, status: 'disconnected' } })
            ]);

            return {
                total_printers: totalPrinters,
                active_printers: activePrinters,
                inactive_printers: inactivePrinters,
                maintenance_printers: maintenancePrinters,
                disconnected_printers: disconnectedPrinters,
                utilization_rate: totalPrinters > 0 ? (activePrinters / totalPrinters * 100).toFixed(1) : 0
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = PrinterRepository;
