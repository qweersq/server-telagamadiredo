'use strict';

/**
 * Catatan dari customer untuk satu pesanan.
 *
 * Contoh: "jangan pakai es", "meja dekat kolam", "ambil jam 3 sore".
 * Berbeda dengan `order_details.description` yang menempel ke item tertentu,
 * kolom ini adalah catatan bebas untuk keseluruhan order.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('orders');

        if (!columns.customer_note) {
            await queryInterface.addColumn('orders', 'customer_note', {
                type: Sequelize.TEXT,
                allowNull: true,
                defaultValue: null,
                comment: 'Catatan bebas dari customer untuk keseluruhan pesanan'
            });
            console.log('✅ Column orders.customer_note added');
        }
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('orders');

        if (columns.customer_note) {
            await queryInterface.removeColumn('orders', 'customer_note');
            console.log('✅ Column orders.customer_note removed');
        }
    }
};
