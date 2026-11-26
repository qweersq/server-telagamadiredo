const { Sequelize } = require('sequelize');
const moment = require('moment');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // 1. Update existing finance transactions yang berelasi dengan expenses
            const expensesWithTransactions = await queryInterface.sequelize.query(
                `SELECT 
                    e.id as expense_id,
                    e.date as expense_date,
                    e.amount,
                    e.finance_account_id,
                    e.finance_category_id,
                    e.description,
                    e.transaction_id,
                    ft.date as transaction_date,
                    ft.createdAt as transaction_created_at
                FROM expenses e
                LEFT JOIN finance_transactions ft ON e.transaction_id = ft.id
                WHERE e.deletedAt IS NULL`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            console.log(`Found ${expensesWithTransactions.length} expenses to process`);

            for (const expense of expensesWithTransactions) {
                const expenseDate = moment(expense.expense_date).format('YYYY-MM-DD HH:mm:ss');

                if (expense.transaction_id) {
                    // Jika tanggal berbeda, update finance transaction
                    if (moment(expense.transaction_date).format('YYYY-MM-DD') !== moment(expense.expense_date).format('YYYY-MM-DD')) {
                        await queryInterface.sequelize.query(
                            `UPDATE finance_transactions 
                            SET 
                                date = ?,
                                createdAt = ?,
                                updatedAt = ?
                            WHERE id = ?`,
                            {
                                replacements: [
                                    expenseDate,
                                    expenseDate,
                                    expenseDate,
                                    expense.transaction_id
                                ],
                                type: Sequelize.QueryTypes.UPDATE
                            }
                        );
                        console.log(`Updated transaction ID: ${expense.transaction_id} with date: ${expenseDate}`);
                    }
                } else {
                    // Buat finance transaction baru jika belum ada
                    await queryInterface.sequelize.query(
                        `INSERT INTO finance_transactions 
                        (description, amount, final_amount, date, createdAt, updatedAt, category_id, account_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        {
                            replacements: [
                                expense.description || `Uang Keluar : ${expense.expense_id}`,
                                expense.amount,
                                expense.amount, // final_amount sama dengan amount untuk expenses
                                expenseDate,
                                expenseDate,
                                expenseDate,
                                expense.finance_category_id,
                                expense.finance_account_id
                            ],
                            type: Sequelize.QueryTypes.INSERT
                        }
                    );

                    // Ambil ID transaksi yang baru dibuat
                    const [newTransaction] = await queryInterface.sequelize.query(
                        `SELECT id FROM finance_transactions 
                        WHERE description = ? AND amount = ? AND date = ? 
                        ORDER BY id DESC LIMIT 1`,
                        {
                            replacements: [
                                expense.description || `Uang Keluar : ${expense.expense_id}`,
                                expense.amount,
                                expenseDate
                            ],
                            type: Sequelize.QueryTypes.SELECT
                        }
                    );

                    // Update expense dengan transaction_id baru
                    await queryInterface.sequelize.query(
                        `UPDATE expenses 
                        SET transaction_id = ? 
                        WHERE id = ?`,
                        {
                            replacements: [newTransaction.id, expense.expense_id],
                            type: Sequelize.QueryTypes.UPDATE
                        }
                    );

                    console.log(`Created new transaction ID: ${newTransaction.id} for expense ID: ${expense.expense_id}`);
                }
            }

            console.log('Migration completed successfully');
            return Promise.resolve();

        } catch (error) {
            console.error('Migration failed:', error);
            return Promise.reject(error);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            // Restore transactions created by this migration
            await queryInterface.sequelize.query(
                `DELETE FROM finance_transactions 
                WHERE id IN (
                    SELECT transaction_id 
                    FROM expenses 
                    WHERE transaction_id IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM payment_details 
                        WHERE payment_details.transaction_id = expenses.transaction_id
                    )
                )`
            );

            console.log('Rollback completed successfully');
            return Promise.resolve();

        } catch (error) {
            console.error('Rollback failed:', error);
            return Promise.reject(error);
        }
    }
};
