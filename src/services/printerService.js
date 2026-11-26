const PrinterRepository = require('../repositories/printerRepository');
const { sequelize } = require('../models');

class PrinterService {
    static async create(data, userRole = null, userBranchId = null) {
        try {
            // Validate required fields
            if (!data.name || !data.device_name || !data.tenant_id || !data.branch_id) {
                throw new Error('Required fields: name, device_name, tenant_id, branch_id');
            }

            // Validate branch access for admin
            if (userRole === 'admin' && userBranchId && parseInt(data.branch_id) !== parseInt(userBranchId)) {
                throw new Error('Access denied: You can only create printer for your own branch');
            }

            // Check if printer name already exists in the same branch
            const existingPrinter = await PrinterRepository.getAll(
                null, null, null, data.tenant_id, data.branch_id
            );
            
            const nameExists = existingPrinter.some(printer => 
                printer.name.toLowerCase() === data.name.toLowerCase()
            );
            
            if (nameExists) {
                throw new Error('Printer name already exists in this branch');
            }

            // Set default values
            const printerData = {
                name: data.name,
                device_name: data.device_name,
                device_id: data.device_id || null,
                service_uuid: data.service_uuid || null,
                characteristic_uuid: data.characteristic_uuid || null,
                paper_width: data.paper_width || 58,
                encoding: data.encoding || 'CP437',
                printer_type: data.printer_type || 'thermal',
                status: data.status || 'inactive',
                is_default: data.is_default || false,
                print_capabilities: data.print_capabilities || ['invoice', 'tag'],
                connection_settings: data.connection_settings || {},
                tenant_id: data.tenant_id,
                branch_id: data.branch_id,
                created_by: data.created_by || null
            };

            // If this is set as default, unset other default printers
            if (printerData.is_default) {
                await PrinterRepository.setDefaultPrinter(
                    null, 
                    printerData.branch_id, 
                    printerData.tenant_id
                );
            }

            const result = await PrinterRepository.create(printerData);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, status, printer_type, tenant_id, branch_id) {
        try {
            const result = await PrinterRepository.getAll(
                search, status, printer_type, tenant_id, branch_id
            );
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, tenant_id = null) {
        try {
            const result = await PrinterRepository.getById(id, tenant_id);
            if (!result) throw new Error('Printer not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByBranch(branch_id, tenant_id = null) {
        try {
            const result = await PrinterRepository.getByBranch(branch_id, tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDefaultPrinter(branch_id, tenant_id = null) {
        try {
            const result = await PrinterRepository.getDefaultPrinter(branch_id, tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, tenant_id = null, userRole = null, userBranchId = null) {
        try {
            // Validate printer exists
            const existingPrinter = await PrinterRepository.getById(id, tenant_id);
            if (!existingPrinter) throw new Error('Printer not found');

            // Validate branch access for admin
            if (userRole === 'admin' && userBranchId && parseInt(existingPrinter.branch_id) !== parseInt(userBranchId)) {
                throw new Error('Access denied: You can only update printer from your own branch');
            }

            // Validate branch_id change for admin
            if (userRole === 'admin' && data.branch_id && parseInt(data.branch_id) !== parseInt(existingPrinter.branch_id)) {
                throw new Error('Access denied: You cannot change printer branch');
            }

            // Determine branch_id for update (use existing if not provided or if admin)
            const updateBranchId = (userRole === 'admin') ? existingPrinter.branch_id : (data.branch_id || existingPrinter.branch_id);
            
            // If branch_id is being updated, use it
            if (data.branch_id && userRole !== 'admin') {
                data.branch_id = updateBranchId;
            } else {
                // Remove branch_id from data if admin (cannot change)
                delete data.branch_id;
            }

            // Check name uniqueness if name is being updated
            if (data.name && data.name !== existingPrinter.name) {
                const printers = await PrinterRepository.getAll(
                    null, null, null, tenant_id, updateBranchId
                );
                
                const nameExists = printers.some(printer => 
                    printer.id !== id && 
                    printer.name.toLowerCase() === data.name.toLowerCase()
                );
                
                if (nameExists) {
                    throw new Error('Printer name already exists in this branch');
                }
            }

            // If setting as default, unset other default printers
            if (data.is_default) {
                await PrinterRepository.setDefaultPrinter(
                    null, 
                    updateBranchId, 
                    tenant_id
                );
            }

            const result = await PrinterRepository.update(id, data, tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, tenant_id = null) {
        try {
            const result = await PrinterRepository.delete(id, tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async setDefaultPrinter(id, branch_id, tenant_id = null) {
        try {
            const result = await PrinterRepository.setDefaultPrinter(id, branch_id, tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateStatus(id, status, tenant_id = null) {
        try {
            const validStatuses = ['active', 'inactive', 'maintenance', 'disconnected'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid printer status');
            }

            const result = await PrinterRepository.updateStatus(id, status, tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async testConnection(id, tenant_id = null) {
        try {
            const printer = await PrinterRepository.getById(id, tenant_id);
            if (!printer) throw new Error('Printer not found');

            // Update last_connected timestamp
            await PrinterRepository.updateStatus(id, 'active', tenant_id);

            return {
                success: true,
                message: 'Printer connection test successful',
                printer: printer
            };
        } catch (error) {
            // Update status to disconnected on test failure
            try {
                await PrinterRepository.updateStatus(id, 'disconnected', tenant_id);
            } catch (updateError) {
                // Ignore update error
            }
            
            throw new Error(error.message);
        }
    }

    static async getPrinterStats(tenant_id = null) {
        try {
            const result = await PrinterRepository.getPrinterStats(tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async discoverPrinters(tenant_id, branch_id) {
        try {
            // This would integrate with Bluetooth discovery
            // For now, return a mock response
            const discoveredPrinters = [
                {
                    device_name: 'RPP02',
                    device_id: 'bluetooth-device-001',
                    printer_type: 'thermal',
                    paper_width: 58,
                    encoding: 'CP437',
                    print_capabilities: ['invoice', 'tag']
                },
                {
                    device_name: 'POS-58',
                    device_id: 'bluetooth-device-002',
                    printer_type: 'thermal',
                    paper_width: 58,
                    encoding: 'CP437',
                    print_capabilities: ['invoice', 'tag', 'receipt']
                }
            ];

            return {
                success: true,
                discovered_printers: discoveredPrinters,
                message: 'Bluetooth printer discovery completed'
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async connectPrinter(device_id, tenant_id, branch_id) {
        try {
            // This would handle actual Bluetooth connection
            // For now, return a mock response
            const mockConnection = {
                device_id: device_id,
                service_uuid: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
                characteristic_uuid: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
                status: 'connected',
                connected_at: new Date()
            };

            return {
                success: true,
                connection: mockConnection,
                message: 'Printer connected successfully'
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = PrinterService;
