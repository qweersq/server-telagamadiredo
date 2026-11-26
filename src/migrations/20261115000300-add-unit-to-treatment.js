'use strict';

/**
 * Satuan barang untuk `treatment` (pcs, porsi, gelas, botol, ...).
 *
 * Dibutuhkan supaya angka stok punya arti: "sisa 12" itu 12 pcs atau 12 porsi.
 * Nullable karena tiket/paket wisata tidak butuh satuan.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('treatment');

        if (!columns.unit) {
            await queryInterface.addColumn('treatment', 'unit', {
                type: Sequelize.STRING(30),
                allowNull: true,
                comment: 'Satuan barang: pcs, porsi, gelas, botol, bungkus'
            });
            console.log('✅ Column treatment.unit added');
        }
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('treatment');

        if (columns.unit) {
            await queryInterface.removeColumn('treatment', 'unit');
            console.log('✅ Column treatment.unit removed');
        }
    }
};
