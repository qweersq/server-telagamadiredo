const SuperAppExpenseRepository = require('../repositories/superAppExpenseRepository');

class SuperAppExpenseService {
    /**
     * Create new expense
     */
    static async createExpense(data) {
        try {
            return await SuperAppExpenseRepository.create(data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get all expenses
     */
    static async getAllExpenses(filters) {
        try {
            return await SuperAppExpenseRepository.findAll(filters);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get expense by ID
     */
    static async getExpenseById(id) {
        try {
            return await SuperAppExpenseRepository.findById(id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Update expense
     */
    static async updateExpense(id, data) {
        try {
            return await SuperAppExpenseRepository.update(id, data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Delete expense
     */
    static async deleteExpense(id) {
        try {
            return await SuperAppExpenseRepository.delete(id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get summary statistics
     */
    static async getSummary(filters) {
        try {
            return await SuperAppExpenseRepository.getSummary(filters);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Get categories list
     */
    static getCategories() {
        return SuperAppExpenseRepository.getCategories();
    }
}

module.exports = SuperAppExpenseService;

