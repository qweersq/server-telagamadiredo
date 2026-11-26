const express = require('express');
const router = express.Router();
const SuperAppExpenseController = require('../controllers/superAppExpenseController');
const AuthMiddleware = require('../middlewares/authMiddleware');

// Protect all routes - Only SuperApp SuperAdmin can access
const superAdminOnly = AuthMiddleware.allow([4]); // Role 1 = superapp-superadmin

/**
 * GET /superapp/expenses/categories
 * Get list of expense categories
 */
router.get('/superapp/expenses/categories', superAdminOnly, SuperAppExpenseController.getCategories);

/**
 * GET /superapp/expenses/summary
 * Get expense summary statistics
 */
router.get('/superapp/expenses/summary', superAdminOnly, SuperAppExpenseController.getSummary);

/**
 * GET /superapp/expenses
 * Get all expenses with filters
 */
router.get('/superapp/expenses', superAdminOnly, SuperAppExpenseController.getAllExpenses);

/**
 * POST /superapp/expenses
 * Create new expense
 */
router.post('/superapp/expenses', superAdminOnly, SuperAppExpenseController.createExpense);

/**
 * GET /superapp/expenses/:id
 * Get expense by ID
 */
router.get('/superapp/expenses/:id', superAdminOnly, SuperAppExpenseController.getExpenseById);

/**
 * PUT /superapp/expenses/:id
 * Update expense
 */
router.put('/superapp/expenses/:id', superAdminOnly, SuperAppExpenseController.updateExpense);

/**
 * DELETE /superapp/expenses/:id
 * Delete expense
 */
router.delete('/superapp/expenses/:id', superAdminOnly, SuperAppExpenseController.deleteExpense);

module.exports = router;

