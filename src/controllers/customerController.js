const CustomerService = require('../services/customerService');
const { ResponseHelper } = require('../helpers');

class CustomerController {
    static async create(req, res) {
        try {
            const raw = {
                name: req.body.name,
                phone: req.body.phone,
                email: req.body.email,
                gender: req.body.gender,
                password: req.body.password,
                address: req.body.address,
                gmaps: req.body.gmaps,
                date_birthday: req.body.date_birthday,
                city: req.body.city,
                hobby: req.body.hobby,
                age: req.body.age,
                working_type: req.body.working_type,
                description: req.body.description,
                branch_id: req.body.branch_id || req.user.branch_id
            }

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await CustomerService.create(raw, user_tenant_id, user_branch_id, user_role);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const sort_by = req.query.sort_by || 'newest'; // 'newest' or 'most_services'
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getAll(search, user_tenant_id, user_branch_id, user_role, page, limit, branch_id, sort_by);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getOrCreateWalkIn(req, res) {
        try {
            const data = await CustomerService.getOrCreateWalkIn(req.user.tenant_id, req.user.branch_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getAllWithMembership(req, res) {
        try {
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const sort_by = req.query.sort_by || 'newest'; // 'newest' or 'most_services'
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getAllWithMembership(search, user_tenant_id, user_branch_id, user_role, page, limit, branch_id, sort_by);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getAllWithoutMembership(req, res) {
        try {
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const sort_by = req.query.sort_by || 'newest'; // 'newest' or 'most_services'
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getAllWithoutMembership(search, user_tenant_id, user_branch_id, user_role, page, limit, branch_id, sort_by);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getAllCustomersFollowUp(req, res) {
        try {
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const result = await CustomerService.getAllCustomersFollowUp(user_tenant_id, user_branch_id, user_role);
    
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async searchByName(req, res) {
        try {
            const search = req.query.search || req.query.name; // Support both parameters
            const sort_by = req.query.sort_by || 'newest'; // 'newest' or 'most_services'
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const result = await CustomerService.searchByName(search, user_tenant_id, user_branch_id, user_role, sort_by);

            // Return array directly (like before)
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getById(id, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async update(req, res) {
        try {
            const raw = {
                id: parseInt(req.params.id, 10),
                name: req.body.name,
                phone: req.body.phone,
                email: req.body.email,
                gender: req.body.gender,
                password: req.body.password,
                address: req.body.address,
                gmaps: req.body.gmaps,
                date_birthday: req.body.date_birthday,
                city: req.body.city,
                hobby: req.body.hobby,
                age: req.body.age,
                working_type: req.body.working_type,
                description: req.body.description,
                branch_id: req.body.branch_id || req.user.branch_id
            }

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            const data = await CustomerService.update(raw, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async delete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const result = await CustomerService.delete(id, user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getDormantCustomers(req, res) {
        try {
            const daysSinceLastOrder = parseInt(req.query.days) || 14;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getDormantCustomers(daysSinceLastOrder, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getDormantCustomersByPeriod(req, res) {
        try {
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getDormantCustomersByPeriod(user_tenant_id, user_branch_id, user_role);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getDormantCustomersByPeriodRange(req, res) {
        try {
            const period = (req.query.period || '20-30').trim();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Debug logging
            console.log('🔍 Period parameter received:', period);
            console.log('🔍 Period type:', typeof period);
            console.log('🔍 Period length:', period.length);
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.getDormantCustomersByPeriodRange(period, user_tenant_id, user_branch_id, user_role, page, limit);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    /**
     * Export customers data to CSV
     * GET /customers/export
     */
    static async exportCustomers(req, res) {
        try {
            const search = req.query.search;
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const membership_filter = req.query.membership_filter || 'all'; // 'all', 'with_membership', 'without_membership'
            const sort_by = req.query.sort_by || 'newest';
            
            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.exportCustomers(search, user_tenant_id, user_branch_id, user_role, branch_id, membership_filter, sort_by);

            // Set headers for CSV download
            const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            return res.status(200).send(data);
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    /**
     * Export customers data to CSV - OPTIMIZED VERSION (BARU!)
     * GET /customers/export-optimized
     * Max 10,000 records
     * Filter: tenant_id + branch_id (mengikuti filter di layar)
     */
    static async exportCustomersOptimized(req, res) {
        try {
            const search = req.query.search;
            // Branch filter: ikuti dropdown "Outlet" di layar (null = semua outlet)
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
            const membership_filter = req.query.membership_filter || 'all'; // 'all', 'with_membership', 'without_membership'
            // Sort: Default by nama (abjad A-Z)
            
            // Add user context for data isolation (tenant only)
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;
            
            const data = await CustomerService.exportCustomersOptimized(search, user_tenant_id, user_branch_id, user_role, branch_id, membership_filter, 'alphabetical');

            // Set headers for CSV download
            const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            return res.status(200).send(data);
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getReferralStats(req, res) {
        try {
            const customer_id = parseInt(req.params.id);
            const user_tenant_id = req.user.tenant_id;

            if (!customer_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Customer ID is required', 400));
            }

            const data = await CustomerService.getReferralStats(customer_id, user_tenant_id);
            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    /**
     * Import customers from CSV file
     * POST /customers/import
     */
    static async importCustomers(req, res) {
        try {
            if (!req.file) {
                return res.status(400).send(ResponseHelper.errorResponse('File CSV wajib diupload', 400));
            }

            // Add user context for data isolation
            const user_tenant_id = req.user.tenant_id;
            const user_branch_id = req.user.branch_id;
            const user_role = req.user.role;

            // Process import
            const result = await CustomerService.importCustomers(
                req.file.path,
                user_tenant_id,
                user_branch_id,
                user_role
            );

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            // Cleanup file if exists
            if (req.file && req.file.path) {
                const fs = require('fs');
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Error deleting temp file:', unlinkError);
                }
            }
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };
};

module.exports = CustomerController;