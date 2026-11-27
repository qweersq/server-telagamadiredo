'use strict';

/**
 * HPP (harga pokok penjualan) per produk.
 *
 *   treatment.cost_price     → HPP bahan utama per 1 unit, diisi manual admin
 *   order_details.cost_price → snapshot HPP saat transaksi dibuat
 *
 * Snapshot di order_details wajib supaya perubahan HPP di kemudian hari
 * tidak mengubah laba transaksi yang sudah lewat.
 *
 * Nullable + default NULL karena data lama belum punya HPP. Baris dengan
 * cost_price NULL dianggap "HPP belum diisi" dan dilewati saat hitung margin.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const treatmentColumns = await queryInterface.describeTable('treatment');

        if (!treatmentColumns.cost_price) {
            await queryInterface.addColumn('treatment', 'cost_price', {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true,
                defaultValue: null,
                comment: 'HPP bahan utama per unit (diisi manual). NULL = belum diisi'
            });
            console.log('✅ Column treatment.cost_price added');
        }

        const orderDetailColumns = await queryInterface.describeTable('order_details');

        if (!orderDetailColumns.cost_price) {
            await queryInterface.addColumn('order_details', 'cost_price', {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true,
                defaultValue: null,
                comment: 'Snapshot HPP per unit saat transaksi dibuat, agar laba historis tidak berubah'
            });
            await queryInterface.addIndex('order_details', ['order_id', 'cost_price'], {
                name: 'idx_order_details_order_cost_price'
            });
            console.log('✅ Column order_details.cost_price added');
        }
    },

    down: async (queryInterface) => {
        const orderDetailColumns = await queryInterface.describeTable('order_details');

        if (orderDetailColumns.cost_price) {
            await queryInterface.removeIndex('order_details', 'idx_order_details_order_cost_price').catch(() => { });
            await queryInterface.removeColumn('order_details', 'cost_price');
            console.log('✅ Column order_details.cost_price removed');
        }

        const treatmentColumns = await queryInterface.describeTable('treatment');

        if (treatmentColumns.cost_price) {
            await queryInterface.removeColumn('treatment', 'cost_price');
            console.log('✅ Column treatment.cost_price removed');
        }
    }
};
