const ShiftService = require('../services/shiftService');
const { ResponseHelper } = require('../helpers');

class ShiftController {
    static async create(req, res) {
        try {
            // Validate cash_initial
            const cash_initial = parseInt(req.body.cash_initial);
            if (isNaN(cash_initial) || cash_initial < 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Cash initial must be >= 0'));
            }
            
            const data = {
                employee_id: req.user.id,   
                branch_id: req.user.branch_id,
                tenant_id: req.user.tenant_id, // Add tenant_id for data isolation
                start_time: Date.now(),
                end_time: null,
                sales: 0,
                cash_initial: cash_initial,
                cash_expected: 0,
                cash_actual: 0,
                bank_transfer: 0,
                qris: 0,
                transaction: 0,
                delivery: 0,
                item: 0,
                service: 0,
                difference: 0,
                // paid
                // unpaid
                // expense
            };

            const shift = await ShiftService.create(data);

            return res.status(201).send(ResponseHelper.successResponse(shift, 201));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    // ✅ Get active shift (lightweight for get-profile)
    static async getActive(req, res) {
        try {
            console.log('🔍 ShiftController.getActive - Getting active shift for user:', { 
                branch_id: req.user.branch_id, 
                tenant_id: req.user.tenant_id 
            });
            
            const result = await ShiftService.getActive(req.user.branch_id, req.user.tenant_id);
            
            if (!result) {
                console.log('ℹ️ ShiftController.getActive - No active shift found');
                return res.status(200).send(ResponseHelper.successResponse(null, 200, 'No active shift found'));
            }
            
            console.log('✅ ShiftController.getActive - Active shift found:', { 
                id: result.id, 
                cash_balance: result.cash_balance,
                is_active: result.is_active 
            });
            
            return res.status(200).send(ResponseHelper.successResponse(result, 200, 'Active shift retrieved successfully'));
        } catch (error) {
            console.error('❌ ShiftController.getActive - Error:', error.message);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getAll(req, res) {
        try {
            const branch_id = parseInt(req.query.branch_id || req.user.branch_id, 10);
            // Always use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            const user_role = req.user.role;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Date filtering parameters
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;
            const date_filter = req.query.date_filter; // 'today', '7days', '30days', 'custom'
            
            // Validate branch_id
            if (isNaN(branch_id)) {
                return res.status(400).send(ResponseHelper.errorResponse('Invalid branch_id'));
            }
            
            const data = await ShiftService.getAll(branch_id, tenant_id, user_role, page, limit, {
                start_date,
                end_date,
                date_filter
            });

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const user_role = req.user.role;
            
            const shift = await ShiftService.getById(id, tenant_id, user_role);            
            return res.status(200).send(ResponseHelper.successResponse(shift));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getShiftDetail(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const user_role = req.user.role;
            
            const shiftDetail = await ShiftService.getShiftDetail(id, tenant_id, user_role);            
            return res.status(200).send(ResponseHelper.successResponse(shiftDetail));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async update(req, res) {
        try {
            const raw = {
                id: parseInt(req.params.id, 10),
                branch_id: parseInt(req.user.branch_id, 10),
                tenant_id: req.user.tenant_id, // Add tenant_id for data isolation
                expense: req.body.expense,
                cash_actual: req.body.cash_actual
            };

            const result = await ShiftService.update(raw);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async endShiftById(req, res) {
        try {
            const raw = {
                id: parseInt(req.params.id, 10),
                branch_id: parseInt(req.user.branch_id, 10),
                tenant_id: req.user.tenant_id, // Add tenant_id for data isolation
                expense: req.body.expense,
                cash_actual: req.body.cash_actual
            };

            const result = await ShiftService.endShiftById(raw);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const tenant_id = req.user.tenant_id;
            const user_role = req.user.role;
            
            await ShiftService.delete(id, tenant_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse());
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getActiveBranches(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branches = await ShiftService.getActiveBranches(tenant_id);

            return res.status(200).send(ResponseHelper.successResponse(branches));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };
};

module.exports = ShiftController;