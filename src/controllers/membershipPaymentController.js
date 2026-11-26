const MembershipPaymentService = require('../services/membershipPaymentService');
const { ResponseHelper } = require('../helpers');

class MembershipPaymentController {
    /**
     * Create membership payment
     * POST /membership-payments
     */
    static async create(req, res) {
        try {
            console.log('🔍 MembershipPaymentController.create - Request body:', req.body);
            
            const {
                customer_id,
                membership_id,
                payment_method_id,
                finance_account_id,
                finance_category_id,
                shift_id,
                amount,
                notes
            } = req.body;

            // Validate required fields
            if (!customer_id || !membership_id || !payment_method_id || !finance_account_id || !amount || !shift_id) {
                return res.status(400).send(ResponseHelper.errorResponse(
                    'customer_id, membership_id, payment_method_id, finance_account_id, shift_id, dan amount wajib diisi',
                    400
                ));
            }

            // Prepare data for service
            const membershipPaymentData = {
                customer_id: parseInt(customer_id),
                membership_id: parseInt(membership_id),
                payment_method_id: parseInt(payment_method_id),
                finance_account_id: parseInt(finance_account_id),
                finance_category_id: parseInt(finance_category_id) || 1, // Default to income category
                shift_id: parseInt(shift_id) || null,
                amount: parseFloat(amount),
                notes: notes || '',
                // User context for data isolation
                user_tenant_id: req.user.tenant_id,
                user_branch_id: req.user.branch_id,
                user_role: req.user.role,
                user_id: req.user.id
            };

            console.log('🔍 MembershipPaymentController.create - Processed data:', membershipPaymentData);

            const result = await MembershipPaymentService.create(membershipPaymentData);
            
            console.log('✅ MembershipPaymentController.create - Success:', result.id);
            return res.status(201).send(ResponseHelper.successResponse(result, 201));
            
        } catch (error) {
            console.error('❌ MembershipPaymentController.create - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Get all membership payments
     * GET /membership-payments
     */
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search = null,
                start_date = null,
                end_date = null,
                customer_id = null,
                membership_id = null
            } = req.query;

            const filters = {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                start_date,
                end_date,
                customer_id: customer_id ? parseInt(customer_id) : null,
                membership_id: membership_id ? parseInt(membership_id) : null,
                user_tenant_id: req.user.tenant_id,
                user_branch_id: req.user.branch_id,
                user_role: req.user.role
            };

            const result = await MembershipPaymentService.getAll(filters);
            
            return res.status(200).send(ResponseHelper.successResponse(result));
            
        } catch (error) {
            console.error('❌ MembershipPaymentController.getAll - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Get membership payment by ID
     * GET /membership-payments/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).send(ResponseHelper.errorResponse('ID membership payment tidak valid', 400));
            }

            const result = await MembershipPaymentService.getById(
                parseInt(id),
                req.user.tenant_id,
                req.user.branch_id,
                req.user.role
            );

            if (!result) {
                return res.status(404).send(ResponseHelper.errorResponse('Membership payment tidak ditemukan', 404));
            }

            return res.status(200).send(ResponseHelper.successResponse(result));
            
        } catch (error) {
            console.error('❌ MembershipPaymentController.getById - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Delete membership payment
     * DELETE /membership-payments/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).send(ResponseHelper.errorResponse('ID membership payment tidak valid', 400));
            }

            console.log('🔍 MembershipPaymentController.delete - Deleting membership payment ID:', id);

            const result = await MembershipPaymentService.delete(
                parseInt(id),
                req.user.tenant_id,
                req.user.branch_id
            );

            console.log('✅ MembershipPaymentController.delete - Success:', result);
            return res.status(200).send(ResponseHelper.successResponse(result));
            
        } catch (error) {
            console.error('❌ MembershipPaymentController.delete - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = MembershipPaymentController;
