'use strict';

/**
 * Dapur produksi spesifik per produk.
 *
 * Sebelumnya item 'central' selalu dikirim ke `branches.kitchen_branch_id`
 * milik outlet penjual, sehingga semua menu "dapur pusat" di Telaga jatuh ke
 * Cafe 1 tanpa bisa dipilih. Kolom ini memberi override eksplisit:
 * produk bisa ditentukan dibuat di outlet mana pun.
 *
 * Urutan resolusi (OrderService.resolveProductionBranchId):
 *   1. treatment.production_branch_id (kalau diisi)
 *   2. branches.kitchen_branch_id  (mode 'central' tanpa override)
 *   3. outlet penjual              (mode 'outlet')
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('treatment');

        if (!columns.production_branch_id) {
            await queryInterface.addColumn('treatment', 'production_branch_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'branches', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Dapur produksi khusus produk ini. Null = ikut mode produksi cabang'
            });
            await queryInterface.addIndex('treatment', ['production_branch_id'], {
                name: 'idx_treatment_production_branch'
            });
            console.log('✅ Column treatment.production_branch_id added');
        }
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('treatment');

        if (columns.production_branch_id) {
            await queryInterface.removeIndex('treatment', 'idx_treatment_production_branch').catch(() => {});
            await queryInterface.removeColumn('treatment', 'production_branch_id');
            console.log('✅ Column treatment.production_branch_id removed');
        }
    }
};
