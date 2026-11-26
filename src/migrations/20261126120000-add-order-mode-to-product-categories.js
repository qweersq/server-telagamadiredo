'use strict';

/**
 * Mode outlet untuk kategori produk.
 *
 * Katalog sebelumnya disaring dari `treatment.type_service` saja, sehingga
 * kategori F&B tetap muncul di outlet loket (dan sebaliknya) kalau kasir salah
 * memilih lini bisnis pada produk. Menaruh aturannya di level kategori membuat
 * pengaturan cukup sekali per grup katalog:
 *
 *   order_mode = NULL     → tampil di semua outlet (default, data lama aman)
 *   order_mode = 'loket'  → hanya outlet mode loket (tiket, retribusi, wisata)
 *   order_mode = 'cafe'   → hanya outlet mode cafe (makanan, minuman, snack)
 *
 * Outlet dengan `branches.order_mode = 'mixed'` melihat semua kategori.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('product_categories');

        if (!columns.order_mode) {
            await queryInterface.addColumn('product_categories', 'order_mode', {
                type: Sequelize.STRING(10),
                allowNull: true,
                defaultValue: null,
                comment: "Mode outlet yang menampilkan kategori: 'loket' | 'cafe'. Null = semua outlet"
            });
            console.log('✅ Column product_categories.order_mode added');
        }
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('product_categories');

        if (columns.order_mode) {
            await queryInterface.removeColumn('product_categories', 'order_mode');
            console.log('✅ Column product_categories.order_mode removed');
        }
    }
};
