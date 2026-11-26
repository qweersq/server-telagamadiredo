'use strict';

/**
 * Routing produksi antar outlet cafe.
 *
 * Telaga punya 3 titik jual cafe, tetapi masakan berat diproduksi terpusat di
 * Cafe 1, sementara item ringan (Popmie, minuman) tetap dibuat di outlet
 * penjualnya. Karena itu routing dibuat dua lapis:
 *
 *   1. `branches.kitchen_branch_id`
 *      Dapur default cabang. Null = masak di cabang sendiri.
 *      Cafe 2 & 3 diarahkan ke Cafe 1.
 *
 *   2. `treatment.production_mode`
 *      Override per produk:
 *        - 'outlet'  → selalu dibuat di outlet yang menjual (Popmie, minuman)
 *        - 'central' → selalu dikirim ke dapur cabang (`kitchen_branch_id`)
 *
 *   3. `order_details.production_branch_id`
 *      Hasil keputusan disimpan per item, supaya 1 order campuran
 *      (Popmie + nasi goreng) bisa pecah jadi 2 tiket produksi berbeda.
 *      Penjualan, struk, shift, dan laporan uang TETAP memakai `orders.branch_id`.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const branchColumns = await queryInterface.describeTable('branches');

        if (!branchColumns.kitchen_branch_id) {
            await queryInterface.addColumn('branches', 'kitchen_branch_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'branches', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Dapur produksi default. Null = masak di cabang sendiri'
            });
            await queryInterface.addIndex('branches', ['kitchen_branch_id'], {
                name: 'idx_branches_kitchen_branch'
            });
            console.log('✅ Column branches.kitchen_branch_id added');
        }

        const treatmentColumns = await queryInterface.describeTable('treatment');

        if (!treatmentColumns.production_mode) {
            await queryInterface.addColumn('treatment', 'production_mode', {
                type: Sequelize.ENUM('outlet', 'central'),
                allowNull: false,
                defaultValue: 'central',
                comment: 'central = dikirim ke dapur cabang (default), outlet = selalu dibuat di outlet penjual'
            });
            console.log('✅ Column treatment.production_mode added');
        }

        const detailColumns = await queryInterface.describeTable('order_details');

        if (!detailColumns.production_branch_id) {
            await queryInterface.addColumn('order_details', 'production_branch_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'branches', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Cabang tempat item ini diproduksi (outlet penjual atau dapur pusat)'
            });
            await queryInterface.addIndex('order_details', ['production_branch_id'], {
                name: 'idx_order_details_production_branch'
            });
            console.log('✅ Column order_details.production_branch_id added');
        }

        // Data lama: seluruh item masih diproduksi di cabang penjualnya.
        await queryInterface.sequelize.query(`
            UPDATE order_details od
            JOIN orders o ON o.id = od.order_id
            SET od.production_branch_id = o.branch_id
            WHERE od.production_branch_id IS NULL
        `);
        console.log('✅ order_details.production_branch_id backfilled from orders.branch_id');

        // Katalog yang ada sekarang: Popmie & minuman dibuat lokal, tiket/parkir
        // tidak melewati dapur sama sekali. Jadi semuanya 'outlet'.
        // Produk makanan baru akan memakai default 'central'.
        await queryInterface.sequelize.query(`
            UPDATE treatment SET production_mode = 'outlet'
        `);
        console.log('✅ Existing treatments set to production_mode = outlet');

        // Cafe 2 & 3 memproduksi makanan berat di Cafe 1.
        // Item ringan tetap lokal lewat treatment.production_mode = 'outlet'.
        await queryInterface.sequelize.query(`
            UPDATE branches b
            JOIN (SELECT id FROM branches WHERE order_mode = 'cafe' ORDER BY id ASC LIMIT 1) c
            SET b.kitchen_branch_id = c.id
            WHERE b.order_mode = 'cafe'
              AND b.id <> c.id
              AND b.kitchen_branch_id IS NULL
        `);
        console.log('✅ Cafe 2 & 3 kitchen_branch_id pointed to the first cafe (Cafe 1)');
    },

    down: async (queryInterface) => {
        const detailColumns = await queryInterface.describeTable('order_details');
        if (detailColumns.production_branch_id) {
            try {
                await queryInterface.removeIndex('order_details', 'idx_order_details_production_branch');
            } catch (error) {
                // index mungkin sudah tidak ada
            }
            await queryInterface.removeColumn('order_details', 'production_branch_id');
            console.log('✅ Column order_details.production_branch_id removed');
        }

        const treatmentColumns = await queryInterface.describeTable('treatment');
        if (treatmentColumns.production_mode) {
            await queryInterface.removeColumn('treatment', 'production_mode');
            console.log('✅ Column treatment.production_mode removed');
        }

        const branchColumns = await queryInterface.describeTable('branches');
        if (branchColumns.kitchen_branch_id) {
            try {
                await queryInterface.removeIndex('branches', 'idx_branches_kitchen_branch');
            } catch (error) {
                // index mungkin sudah tidak ada
            }
            await queryInterface.removeColumn('branches', 'kitchen_branch_id');
            console.log('✅ Column branches.kitchen_branch_id removed');
        }
    }
};
