'use strict';

/**
 * Mode operasional cabang sebelumnya hanya 'loket' | 'cafe'.
 *
 * Telaga butuh cabang yang melayani keduanya sekaligus (tiket masuk + F&B),
 * mis. loket utama yang juga punya warung. Karena itu ditambah nilai 'mixed':
 *   - loket → katalog tiket, retribusi, jasa wisata (tanpa tamu & meja)
 *   - cafe  → katalog F&B (wajib nama pemesan + no meja)
 *   - mixed → semua katalog; data tamu/meja hanya diminta kalau ada item F&B
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('branches', 'order_mode', {
            type: Sequelize.ENUM('loket', 'cafe', 'mixed'),
            allowNull: false,
            defaultValue: 'loket',
            comment: 'Mode operasional cabang: loket (tiket/retribusi), cafe (F&B), mixed (keduanya)'
        });
        console.log('✅ branches.order_mode now supports mixed');
    },

    down: async (queryInterface, Sequelize) => {
        // Kembalikan ke dua nilai; baris 'mixed' ditarik ke 'loket' agar tidak gagal.
        await queryInterface.sequelize.query(
            "UPDATE branches SET order_mode = 'loket' WHERE order_mode = 'mixed'"
        );
        await queryInterface.changeColumn('branches', 'order_mode', {
            type: Sequelize.ENUM('loket', 'cafe'),
            allowNull: false,
            defaultValue: 'loket',
            comment: 'Mode operasional cabang: loket (tanpa data tamu/meja) atau cafe (wajib nama pemesan + no meja)'
        });
        console.log('✅ branches.order_mode reverted to loket|cafe');
    }
};
