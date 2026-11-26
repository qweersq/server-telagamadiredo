'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('branch_mitra_relations', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            parent_branch_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'branches',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID cabang utama (parent)'
            },
            mitra_branch_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: true, // 1 mitra hanya bisa terhubung ke 1 parent
                references: {
                    model: 'branches',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID cabang mitra (child)'
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
                comment: 'Status relasi mitra'
            },
            tenant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'tenants',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID tenant pemilik relasi'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deletedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            }
        });

        // Add indexes for better performance
        await queryInterface.addIndex('branch_mitra_relations', ['parent_branch_id'], {
            name: 'idx_branch_mitra_parent_id'
        });
        await queryInterface.addIndex('branch_mitra_relations', ['mitra_branch_id'], {
            name: 'idx_branch_mitra_mitra_id'
        });
        await queryInterface.addIndex('branch_mitra_relations', ['tenant_id'], {
            name: 'idx_branch_mitra_tenant_id'
        });
        await queryInterface.addIndex('branch_mitra_relations', ['status'], {
            name: 'idx_branch_mitra_status'
        });
        await queryInterface.addIndex('branch_mitra_relations', ['parent_branch_id', 'status'], {
            name: 'idx_branch_mitra_parent_status'
        });
        await queryInterface.addIndex('branch_mitra_relations', ['tenant_id', 'status'], {
            name: 'idx_branch_mitra_tenant_status'
        });

        console.log('✅ Branch mitra relations table created');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('branch_mitra_relations');
        console.log('⚠️  Branch mitra relations table dropped');
    }
};
