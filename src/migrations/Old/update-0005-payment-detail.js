const { Sequelize } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // Tambah kolom deletedAt
            await queryInterface.addColumn('payment_details', 'deletedAt', {
                type: Sequelize.DATE,
                allowNull: true,
                after: 'updatedAt' // Menempatkan kolom setelah updatedAt
            });

            // Tambahkan index untuk optimasi query dengan paranoid
            await queryInterface.addIndex('payment_details', ['deletedAt'], {
                name: 'idx_payment_details_deleted_at'
            });

            console.log('Migration: Added soft delete to payment_details table');
            return Promise.resolve();

        } catch (error) {
            console.error('Migration failed:', error);
            return Promise.reject(error);
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            // Hapus index terlebih dahulu
            await queryInterface.removeIndex('payment_details', 'idx_payment_details_deleted_at');
            
            // Hapus kolom deletedAt
            await queryInterface.removeColumn('payment_details', 'deletedAt');

            console.log('Rollback: Removed soft delete from payment_details table');
            return Promise.resolve();

        } catch (error) {
            console.error('Rollback failed:', error);
            return Promise.reject(error);
        }
    }
};