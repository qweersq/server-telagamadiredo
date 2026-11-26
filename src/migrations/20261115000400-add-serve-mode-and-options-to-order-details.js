'use strict';

/**
 * Dine-in / bawa pulang per ITEM, bukan per order.
 *
 * Satu order cafe bisa berisi campuran, mis. 2 Popmie dine-in + 1 kopi bawa pulang.
 * Karena itu penanda tempat makan dipindah ke `order_details`:
 *   - `serve_mode`    → 'dine-in' | 'takeaway' (nullable, data lama tidak diisi)
 *   - `options_json`  → opsi terstruktur per item, mis. {"sugar":"less","ice":"normal"}
 *
 * Nomor meja TETAP di `orders.table_number` (satu order = satu meja).
 * `orders.order_type` jadi ringkasan: 'dine-in' / 'takeaway' / 'mixed'.
 *
 * Catatan: catatan bebas per item sudah ada di `order_details.description`,
 * jadi tidak perlu kolom baru untuk itu.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('order_details');

        if (!columns.serve_mode) {
            await queryInterface.addColumn('order_details', 'serve_mode', {
                type: Sequelize.ENUM('dine-in', 'takeaway'),
                allowNull: true,
                defaultValue: null,
                comment: 'Dine-in atau bawa pulang per item. Null = ikut order_type'
            });
            console.log('✅ Column order_details.serve_mode added');
        }

        if (!columns.options_json) {
            await queryInterface.addColumn('order_details', 'options_json', {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: null,
                comment: 'Opsi terstruktur per item, mis. {"sugar":"less","ice":"normal"}'
            });
            console.log('✅ Column order_details.options_json added');
        }

        // Backfill: order satu tipe cukup diisi langsung dari order induknya,
        // supaya laporan lama & kitchen print tidak kosong.
        await queryInterface.sequelize.query(`
            UPDATE order_details od
            JOIN orders o ON o.id = od.order_id
            SET od.serve_mode = CASE
                    WHEN o.order_type = 'dine-in' THEN 'dine-in'
                    WHEN o.order_type = 'takeaway' THEN 'takeaway'
                    ELSE NULL
                END
            WHERE od.serve_mode IS NULL
              AND o.order_type IN ('dine-in', 'takeaway')
        `);
        console.log('✅ order_details.serve_mode backfilled from orders.order_type');
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('order_details');

        if (columns.options_json) {
            await queryInterface.removeColumn('order_details', 'options_json');
            console.log('✅ Column order_details.options_json removed');
        }

        if (columns.serve_mode) {
            await queryInterface.removeColumn('order_details', 'serve_mode');
            console.log('✅ Column order_details.serve_mode removed');
        }
    }
};
