const { Sequelize } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // Tambah kolom is_checked
            await queryInterface.addColumn('finance_transactions', 'is_checked', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                after: 'id' // Menempatkan kolom setelah id
            });

            // Set semua transaksi yang sudah ada menjadi checked
            await queryInterface.sequelize.query(
                `UPDATE finance_transactions 
                SET is_checked = true 
                WHERE id IN (
                    SELECT transaction_id 
                    FROM payment_details
                    UNION
                    SELECT transaction_id 
                    FROM expenses 
                    WHERE transaction_id IS NOT NULL
                )`
            );

            console.log('Migration completed successfully');
            return Promise.resolve();

        } catch (error) {
            console.error('Migration failed:', error);
            return Promise.reject(error);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.removeColumn('finance_transactions', 'is_checked');
            
            console.log('Rollback completed successfully');
            return Promise.resolve();

        } catch (error) {
            console.error('Rollback failed:', error);
            return Promise.reject(error);
        }
    }
};