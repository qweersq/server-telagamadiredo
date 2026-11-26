const ExpenseService = require('../services/expenseService');
const { ResponseHelper } = require('../helpers');

class ExpenseController {
  static async create(req, res) {
    try {
      const raw = {
        user_id: parseInt(req.body.user_id, 10),
        name: req.body.name,
        date: req.body.date || new Date(),
        amount: parseFloat(req.body.amount),
        description: req.body.description,
        receipt: req.body.receipt,
        finance_account_id: parseInt(req.body.finance_account_id, 10), // Finance account type
        finance_category_id: parseInt(req.body.finance_category_id, 10), // Finance category type
        tenant_id: parseInt(req.body.tenant_id, 10) || req.user.tenant_id, // Auto from user if not provided
        branch_id: parseInt(req.body.branch_id, 10) || req.user.branch_id // Auto from user if not provided
      };

      // Validasi input
      if (!raw.name) throw new Error('Name is required');
      if (!raw.amount) throw new Error('Amount is required');
      if (!raw.finance_account_id) throw new Error('Finance account type is required');
      if (!raw.finance_category_id) throw new Error('Finance category type is required');

      const data = await ExpenseService.create(raw);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async createExpenseShift(req, res) {
    try {
      const raw = {
        user_id: parseInt(req.body.user_id, 10),
        shift_id: parseInt(req.body.shift_id, 10),
        name: req.body.name,
        amount: req.body.amount,
        date: req.body.date || new Date(),
        description: req.body.description || '',
        receipt: req.body.receipt || '',
        finance_account_id: req.body.finance_account_id || 2,
        finance_category_id: req.body.finance_category_id || 2,
        tenant_id: req.body.tenant_id,
        branch_id: req.body.branch_id
        // ✅ Removed payment_method - now using finance_account.payment_method_id as single source of truth
      };

      const data = await ExpenseService.createExpenseShift(raw);

      return res.status(201).send(ResponseHelper.successResponse(data, 201));
    } catch (error) {
      return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
    }
  };

  static async getAll(req, res) {
    try {
      // Always use tenant_id from JWT token for data isolation (security)
      const raw = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 10,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        tenant_id: req.user.tenant_id,
        branch_id: parseInt(req.query.branch_id, 10) || req.user.branch_id // Always require branch_id
      };

      // Validate required parameters
      if (!raw.tenant_id) {
        return res.status(400).send(ResponseHelper.errorResponse('tenant_id is required', 400));
      }
      if (!raw.branch_id) {
        return res.status(400).send(ResponseHelper.errorResponse('branch_id is required', 400));
      }

      const data = await ExpenseService.getAll(raw);
  
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getExpenseOption(req, res) {
    try {
      const data = await ExpenseService.getExpenseOption();
  
      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getByShift(req, res) {
    try {
      const id = parseInt(req.query.shift_id, 10);
      const data = await ExpenseService.getByShift(id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await ExpenseService.getById(id);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async update(req, res) {
    try {
      const raw = {
        id: parseInt(req.params.id, 10),
        user_id: parseInt(req.body.user_id, 10) || null,
        shift_id: parseInt(req.body.shift_id, 10) || null,
        name: req.body.name,
        date: req.body.date || new Date(),
        amount: req.body.amount,
        description: req.body.description,
        receipt: req.body.receipt,
        finance_account_id: req.body.finance_account_id,
        finance_category_id: req.body.finance_category_id,
        tenant_id: parseInt(req.body.tenant_id, 10) || req.user.tenant_id,
        branch_id: parseInt(req.body.branch_id, 10) || req.user.branch_id
      };

      const data = await ExpenseService.update(raw);

      return res.status(200).send(ResponseHelper.successResponse(data));
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };

  static async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await ExpenseService.delete(id);

      return res.status(200).send(ResponseHelper.successResponse());
    } catch (error) {
      return res.status(500).send(ResponseHelper.errorResponse(error.message));
    }
  };
};

module.exports = ExpenseController;