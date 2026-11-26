'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add branch_type column
        await queryInterface.addColumn('branches', 'branch_type', {
            type: Sequelize.ENUM('main', 'mitra'),
            allowNull: false,
            defaultValue: 'main',
            comment: 'Tipe cabang: main (cabang utama) atau mitra (sub-branch)',
            after: 'status'
        });

        // Add index for branch_type
        await queryInterface.addIndex('branches', ['branch_type'], {
            name: 'idx_branches_type'
        });

        // Add composite index for tenant_id and branch_type
        await queryInterface.addIndex('branches', ['tenant_id', 'branch_type'], {
            name: 'idx_branches_tenant_type'
        });

        console.log('✅ branch_type column added to branches table');
    },

    down: async (queryInterface, Sequelize) => {
        // Remove indexes first
        await queryInterface.removeIndex('branches', 'idx_branches_tenant_type');
        await queryInterface.removeIndex('branches', 'idx_branches_type');

        // Remove column
        await queryInterface.removeColumn('branches', 'branch_type');

        console.log('⚠️  branch_type column removed from branches table');
    }
};
