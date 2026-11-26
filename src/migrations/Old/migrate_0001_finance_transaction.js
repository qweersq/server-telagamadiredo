const { Sequelize } = require('sequelize');
const moment = require('moment');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // 1. Ambil finance transactions yang dibuat pada 18 Jan 2025
            const targetDate = '2025-01-18';
            const transactions = await queryInterface.sequelize.query(
                `SELECT 
                    ft.id as transaction_id,
                    p.date as payment_date,
                    p.createdAt as payment_created_at
                FROM finance_transactions ft
                JOIN payment_details pd ON ft.id = pd.transaction_id
                JOIN payments p ON pd.payment_id = p.id
                WHERE DATE(ft.date) = ? 
                AND p.deletedAt IS NULL`,
                {
                    replacements: [targetDate],
                    type: Sequelize.QueryTypes.SELECT
                }
            );

            console.log(`Found ${transactions.length} transactions to update`);

            // 2. Update setiap finance transaction
            for (const transaction of transactions) {
                // Coba gunakan payment_date, jika null gunakan payment_created_at
                let validDate = null;
                
                if (transaction.payment_date) {
                    validDate = moment(transaction.payment_date).isValid() 
                        ? moment(transaction.payment_date)
                        : null;
                }
                
                if (!validDate && transaction.payment_created_at) {
                    validDate = moment(transaction.payment_created_at).isValid() 
                        ? moment(transaction.payment_created_at)
                        : null;
                }

                // Skip jika tidak ada tanggal valid
                if (!validDate) {
                    console.log(`Skipping transaction ID: ${transaction.transaction_id} - No valid date found`);
                    continue;
                }

                const formattedDate = validDate.format('YYYY-MM-DD HH:mm:ss');

                try {
                    // Update finance transaction
                    await queryInterface.sequelize.query(
                        `UPDATE finance_transactions 
                        SET 
                            date = ?,
                            createdAt = ?,
                            updatedAt = ?
                        WHERE id = ?`,
                        {
                            replacements: [
                                formattedDate,
                                formattedDate,
                                formattedDate,
                                transaction.transaction_id
                            ],
                            type: Sequelize.QueryTypes.UPDATE
                        }
                    );

                    console.log(`Updated transaction ID: ${transaction.transaction_id} with date: ${formattedDate}`);
                } catch (updateError) {
                    console.error(`Failed to update transaction ID: ${transaction.transaction_id}`, updateError);
                    continue; // Lanjut ke transaksi berikutnya jika ada error
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
            const defaultDate = '2025-01-18 13:15:23';
            
            await queryInterface.sequelize.query(
                `UPDATE finance_transactions 
                SET 
                    date = ?,
                    createdAt = ?,
                    updatedAt = ?
                WHERE id IN (
                    SELECT transaction_id 
                    FROM payment_details
                )`,
                {
                    replacements: [defaultDate, defaultDate, defaultDate],
                    type: Sequelize.QueryTypes.UPDATE
                }
            );

            console.log('Rollback completed successfully');
            return Promise.resolve();

        } catch (error) {
            console.error('Rollback failed:', error);
            return Promise.reject(error);
        }
    }
};