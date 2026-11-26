const SuperAppExpenseService = require('../services/superAppExpenseService');
const ResponseHelper = require('../helpers/responseHelper');

class SuperAppExpenseController {
    /**
     * Create new expense
     * POST /superapp/expenses
     */
    static async createExpense(req, res) {
        try {
            const { expense_date, category, amount, description } = req.body;

            // Validation
            if (!expense_date || !category || !amount) {
                return res.status(400).send(
                    ResponseHelper.errorResponse('expense_date, category, and amount are required', 400)
                );
            }

            const data = {
                expense_date,
                category,
                amount: parseFloat(amount),
                description: description || null
            };

            const expense = await SuperAppExpenseService.createExpense(data);

            return res.status(201).send(
                ResponseHelper.successResponse({ expense }, 'Expense created successfully')
            );
        } catch (error) {
            return res.status(400).send(
                ResponseHelper.errorResponse(error.message, 400)
            );
        }
    }

    /**
     * Get all expenses
     * GET /superapp/expenses
     */
    static async getAllExpenses(req, res) {
        try {
            const { category, start_date, end_date, page, limit } = req.query;

            const filters = {
                category,
                start_date,
                end_date,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            };

            const result = await SuperAppExpenseService.getAllExpenses(filters);

            return res.status(200).send(
                ResponseHelper.successResponse(result)
            );
        } catch (error) {
            return res.status(400).send(
                ResponseHelper.errorResponse(error.message, 400)
            );
        }
    }

    /**
     * Get expense by ID
     * GET /superapp/expenses/:id
     */
    static async getExpenseById(req, res) {
        try {
            const { id } = req.params;
            const expense = await SuperAppExpenseService.getExpenseById(id);

            return res.status(200).send(
                ResponseHelper.successResponse({ expense })
            );
        } catch (error) {
            return res.status(404).send(
                ResponseHelper.errorResponse(error.message, 404)
            );
        }
    }

    /**
     * Update expense
     * PUT /superapp/expenses/:id
     */
    static async updateExpense(req, res) {
        try {
            const { id } = req.params;
            const { expense_date, category, amount, description } = req.body;

            const data = {};
            if (expense_date) data.expense_date = expense_date;
            if (category) data.category = category;
            if (amount) data.amount = parseFloat(amount);
            if (description !== undefined) data.description = description;

            const expense = await SuperAppExpenseService.updateExpense(id, data);

            return res.status(200).send(
                ResponseHelper.successResponse({ expense }, 'Expense updated successfully')
            );
        } catch (error) {
            return res.status(400).send(
                ResponseHelper.errorResponse(error.message, 400)
            );
        }
    }

    /**
     * Delete expense
     * DELETE /superapp/expenses/:id
     */
    static async deleteExpense(req, res) {
        try {
            const { id } = req.params;
            const result = await SuperAppExpenseService.deleteExpense(id);

            return res.status(200).send(
                ResponseHelper.successResponse(result)
            );
        } catch (error) {
            return res.status(400).send(
                ResponseHelper.errorResponse(error.message, 400)
            );
        }
    }

    /**
     * Get summary statistics
     * GET /superapp/expenses/summary
     */
    static async getSummary(req, res) {
        try {
            const { start_date, end_date } = req.query;

            const filters = {
                start_date,
                end_date
            };

            const summary = await SuperAppExpenseService.getSummary(filters);

            return res.status(200).send(
                ResponseHelper.successResponse(summary)
            );
        } catch (error) {
            return res.status(400).send(
                ResponseHelper.errorResponse(error.message, 400)
            );
        }
    }

    /**
     * Get categories list
     * GET /superapp/expenses/categories
     */
    static async getCategories(req, res) {
        try {
            const categories = SuperAppExpenseService.getCategories();

            return res.status(200).send(
                ResponseHelper.successResponse({ categories })
            );
        } catch (error) {
            return res.status(400).send(
                ResponseHelper.errorResponse(error.message, 400)
            );
        }
    }
}

module.exports = SuperAppExpenseController;

