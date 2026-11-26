'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('calendar_notes').catch(() => { });

        await queryInterface.createTable('calendar_notes', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            tenant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'tenants', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID tenant pemilik'
            },
            branch_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'branches', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID cabang'
            },
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false,
                comment: 'Tanggal catatan (YYYY-MM-DD)'
            },
            note: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: 'Isi catatan'
            },
            created_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'User yang membuat catatan'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        });

        await queryInterface.addIndex('calendar_notes', ['tenant_id', 'branch_id', 'date'], {
            name: 'idx_calendar_notes_tenant_branch_date',
            unique: true
        });

        await queryInterface.addIndex('calendar_notes', ['tenant_id', 'branch_id'], {
            name: 'idx_calendar_notes_tenant_branch'
        });

        console.log('✅ Table calendar_notes created successfully');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('calendar_notes');
        console.log('⚠️  Table calendar_notes dropped');
    }
};
