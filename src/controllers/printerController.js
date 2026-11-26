const PrinterService = require('../services/printerService');
const { ResponseHelper } = require('../helpers');

class PrinterController {
    static async create(req, res) {
        try {
            const userRole = req.user?.role;
            const userBranchId = req.user?.branch_id;
            const branchId = req.body.branch_id;

            // Validate branch_id for admin
            if (userRole === 'admin' && branchId && parseInt(branchId) !== parseInt(userBranchId)) {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied: You can only create printer for your own branch', 403));
            }

            // Auto-set branch_id for admin if not provided
            const finalBranchId = (userRole === 'admin' && !branchId) ? userBranchId : branchId;

            const raw = {
                name: req.body.name,
                device_name: req.body.device_name,
                device_id: req.body.device_id,
                service_uuid: req.body.service_uuid,
                characteristic_uuid: req.body.characteristic_uuid,
                paper_width: req.body.paper_width,
                encoding: req.body.encoding,
                printer_type: req.body.printer_type,
                status: req.body.status,
                is_default: req.body.is_default,
                print_capabilities: req.body.print_capabilities,
                connection_settings: req.body.connection_settings,
                tenant_id: req.user?.tenant_id,
                branch_id: finalBranchId,
                created_by: req.user?.id
            };

            const data = await PrinterService.create(raw, userRole, userBranchId);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const status = req.query.status;
            const printer_type = req.query.printer_type;
            const tenant_id = req.user?.tenant_id;
            const userRole = req.user?.role;
            const userBranchId = req.user?.branch_id;
            
            // For admin, filter by their branch_id (ignore query param branch_id)
            // CRITICAL: Always use req.user.branch_id for admin, not req.query.branch_id
            const branch_id = (userRole === 'admin') ? userBranchId : req.query.branch_id;

            console.log('🔍 PrinterController.getAll - User role:', userRole);
            console.log('🔍 PrinterController.getAll - req.user.branch_id:', userBranchId);
            console.log('🔍 PrinterController.getAll - req.query.branch_id:', req.query.branch_id);
            console.log('🔍 PrinterController.getAll - Final branch_id used:', branch_id);

            const data = await PrinterService.getAll(search, status, printer_type, tenant_id, branch_id);

            console.log('🔍 PrinterController.getAll - Returned printers count:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('🔍 PrinterController.getAll - First printer branch_id:', data[0]?.branch_id);
            }

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user?.tenant_id;
            const data = await PrinterService.getById(id, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    static async getByBranch(req, res) {
        try {
            const { branch_id } = req.params;
            const tenant_id = req.user?.tenant_id;
            const data = await PrinterService.getByBranch(branch_id, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    static async getDefaultPrinter(req, res) {
        try {
            const { branch_id } = req.params;
            const tenant_id = req.user?.tenant_id;
            const data = await PrinterService.getDefaultPrinter(branch_id, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user?.tenant_id;
            const userRole = req.user?.role;
            const userBranchId = req.user?.branch_id;
            const raw = {
                name: req.body.name,
                device_name: req.body.device_name,
                device_id: req.body.device_id,
                service_uuid: req.body.service_uuid,
                characteristic_uuid: req.body.characteristic_uuid,
                paper_width: req.body.paper_width,
                encoding: req.body.encoding,
                printer_type: req.body.printer_type,
                status: req.body.status,
                is_default: req.body.is_default,
                print_capabilities: req.body.print_capabilities,
                connection_settings: req.body.connection_settings,
                branch_id: req.body.branch_id
            };

            // Remove undefined values
            Object.keys(raw).forEach(key => {
                if (raw[key] === undefined) {
                    delete raw[key];
                }
            });

            const data = await PrinterService.update(id, raw, tenant_id, userRole, userBranchId);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user?.tenant_id;
            const data = await PrinterService.delete(id, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    }

    static async setDefaultPrinter(req, res) {
        try {
            const { id } = req.params;
            const { branch_id } = req.body;
            const tenant_id = req.user?.tenant_id;

            if (!branch_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Branch ID is required', 400));
            }

            const data = await PrinterService.setDefaultPrinter(id, branch_id, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const tenant_id = req.user?.tenant_id;

            if (!status) {
                return res.status(400).send(ResponseHelper.errorResponse('Status is required', 400));
            }

            const data = await PrinterService.updateStatus(id, status, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async testConnection(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user?.tenant_id;
            const data = await PrinterService.testConnection(id, tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }

    static async getStats(req, res) {
        try {
            const tenant_id = req.user?.tenant_id;
            const data = await PrinterService.getPrinterStats(tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async discoverPrinters(req, res) {
        try {
            const { branch_id } = req.body;
            const tenant_id = req.user?.tenant_id;

            if (!branch_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Branch ID is required', 400));
            }

            const data = await PrinterService.discoverPrinters(tenant_id, branch_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async connectPrinter(req, res) {
        try {
            const { device_id, branch_id } = req.body;
            const tenant_id = req.user?.tenant_id;

            if (!device_id || !branch_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Device ID and Branch ID are required', 400));
            }

            const data = await PrinterService.connectPrinter(device_id, tenant_id, branch_id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    }
}

module.exports = PrinterController;
