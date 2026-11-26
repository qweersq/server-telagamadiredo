const { Sequelize } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // Tambah kolom deletedAt
            await queryInterface.addColumn('finance_transactions', 'deletedAt', {
                type: Sequelize.DATE,
                allowNull: true,
                after: 'updatedAt' // Menempatkan kolom setelah updatedAt
            });

            // Tambahkan index untuk optimasi query dengan paranoid
            await queryInterface.addIndex('finance_transactions', ['deletedAt'], {
                name: 'idx_finance_transactions_deleted_at'
            });

            console.log('Migration: Added soft delete to finance_transactions table');
            return Promise.resolve();

        } catch (error) {
            console.error('Migration failed:', error);
            return Promise.reject(error);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            // Hapus index terlebih dahulu
            await queryInterface.removeIndex('finance_transactions', 'idx_finance_transactions_deleted_at');
            
            // Hapus kolom deletedAt
            await queryInterface.removeColumn('finance_transactions', 'deletedAt');

            console.log('Rollback: Removed soft delete from finance_transactions table');
            return Promise.resolve();

        } catch (error) {
            console.error('Rollback failed:', error);
            return Promise.reject(error);
        }
    }
};