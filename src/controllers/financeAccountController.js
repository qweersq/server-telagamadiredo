// bikin controller untuk finance account
const  FinanceAccountService  = require('../services/financeAccountService');
const { ResponseHelper } = require('../helpers');

class FinanceAccountController {
    static async create(req, res) {
        try {
            const { name, balance, description, branch_id, is_active = true, payment_method_id, requires_payment_proof = false } = req.body;
            const tenant_id = req.user.tenant_id;
            
            console.log('🔍 FinanceAccountController.create - Creating account:', {
                name, balance, description, branch_id, is_active, payment_method_id, requires_payment_proof, tenant_id,
                user_id: req.user.id
            });
            
            const financeAccount = await FinanceAccountService.create(name, balance, description, tenant_id, branch_id, is_active, payment_method_id, requires_payment_proof);

            console.log('✅ FinanceAccountController.create - Account created:', financeAccount.id);
            
            res.status(201).send(ResponseHelper.successResponse(financeAccount));
        } catch (error) {
            console.error('❌ FinanceAccountController.create - Error:', error);
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getAll(req, res) {
        try {
            // ALWAYS use tenant_id from JWT token for data isolation (security)
            const tenant_id = req.user.tenant_id;
            
            // Allow superadmin to filter by branch_id if provided in query, otherwise show all accounts
            const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : 
                             (req.user.role === 'superadmin' ? null : req.user.branch_id);
            
            // Parse is_active from query (handle "1", "true", 1, true, etc.)
            let is_active = true; // default to true
            if (req.query.is_active !== undefined) {
                const activeValue = req.query.is_active;
                is_active = activeValue === 'true' || activeValue === '1' || activeValue === 1 || activeValue === true;
            }
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('tenant_id is required'));
            }
            
            const financeAccounts = await FinanceAccountService.getAll(tenant_id, branch_id, is_active);
            
            res.status(200).send(ResponseHelper.successResponse(financeAccounts));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getBalanceAllAccount(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeAccounts = await FinanceAccountService.getBalanceAllAccount(tenant_id, branch_id);
            res.status(200).send(ResponseHelper.successResponse(financeAccounts));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getFinanceAccountTrends(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeAccounts = await FinanceAccountService.getFinanceAccountTrends(req.body.years, tenant_id, branch_id);
            res.status(200).send(ResponseHelper.successResponse(financeAccounts));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeAccount = await FinanceAccountService.getById(id, tenant_id, branch_id);
            res.status(200).send(ResponseHelper.successResponse(financeAccount));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, balance, description, branch_id, is_active = true, payment_method_id, requires_payment_proof = false } = req.body;
            const tenant_id = req.user.tenant_id;
            const financeAccount = await FinanceAccountService.update(id, name, balance, description, tenant_id, branch_id, is_active, payment_method_id, requires_payment_proof);
            res.status(200).send(ResponseHelper.successResponse(financeAccount));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            const financeAccount = await FinanceAccountService.delete(id, tenant_id, branch_id);
            res.status(200).send(ResponseHelper.successResponse(financeAccount));
        } catch (error) {
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async calculateBalance(req, res) {
        try {
            const { id } = req.params;
            const tenant_id = req.user.tenant_id;
            
            console.log('🔍 FinanceAccountController.calculateBalance - Calculating balance for account:', id);
            
            const result = await FinanceAccountService.calculateAccountBalance(id, tenant_id);
            
            console.log('✅ FinanceAccountController.calculateBalance - Balance calculated:', result);
            
            res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ FinanceAccountController.calculateBalance - Error:', error);
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async calculateAllBalances(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            const branch_id = req.user.branch_id;
            
            console.log('🔍 FinanceAccountController.calculateAllBalances - Calculating all balances for tenant:', tenant_id);
            
            const results = await FinanceAccountService.calculateAllAccountBalances(tenant_id, branch_id);
            
            console.log('✅ FinanceAccountController.calculateAllBalances - All balances calculated:', results.length, 'accounts');
            
            res.status(200).send(ResponseHelper.successResponse(results));
        } catch (error) {
            console.error('❌ FinanceAccountController.calculateAllBalances - Error:', error);
            res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = FinanceAccountController;
