'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const usersTable = await queryInterface.describeTable('users');
        if (!usersTable.position) {
            await queryInterface.addColumn('users', 'position', {
                type: Sequelize.STRING(50),
                allowNull: true,
                after: 'role',
                comment: "Jabatan operasional: kasir, kebersihan, dapur, taman, keamanan, dll"
            });
            console.log('✅ Column users.position added');
        }

        // Template tugas berlaku global per tenant (branch_id NULL),
        // tapi boleh dikhususkan untuk satu cabang bila perlu.
        const tables = await queryInterface.showAllTables();
        if (!tables.includes('task_templates')) {
            await queryInterface.createTable('task_templates', {
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
                    comment: 'ID tenant pemilik template'
                },
                branch_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'NULL = berlaku untuk semua cabang'
                },
                title: {
                    type: Sequelize.STRING(150),
                    allowNull: false,
                    comment: 'Nama tugas, mis. Bersihkan toilet'
                },
                position: {
                    type: Sequelize.STRING(50),
                    allowNull: true,
                    comment: 'NULL = semua posisi, mis. kebersihan/dapur/taman/keamanan'
                },
                area: {
                    type: Sequelize.STRING(150),
                    allowNull: true,
                    comment: 'Area kerja default, mis. Toilet Pria'
                },
                requires_photo: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                    comment: 'Foto bukti wajib (opsional per template)'
                },
                is_active: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                sort_order: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                created_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
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

            await queryInterface.addIndex('task_templates', ['tenant_id', 'is_active'], {
                name: 'idx_task_templates_tenant_active'
            });
            await queryInterface.addIndex('task_templates', ['tenant_id', 'position'], {
                name: 'idx_task_templates_tenant_position'
            });
            console.log('✅ Table task_templates created');
        }

        if (!tables.includes('daily_tasks')) {
            await queryInterface.createTable('daily_tasks', {
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
                    onDelete: 'CASCADE'
                },
                branch_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'Cabang tempat tugas dikerjakan'
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'Karyawan yang ditugaskan'
                },
                task_template_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'task_templates', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                    comment: 'NULL = tugas tambahan manual'
                },
                title: {
                    type: Sequelize.STRING(150),
                    allowNull: false,
                    comment: 'Salinan nama tugas agar riwayat tetap utuh'
                },
                area: {
                    type: Sequelize.STRING(150),
                    allowNull: true
                },
                task_date: {
                    type: Sequelize.DATEONLY,
                    allowNull: false,
                    comment: 'Tanggal tugas (YYYY-MM-DD)'
                },
                status: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                    defaultValue: 'pending',
                    comment: 'pending | done | incomplete'
                },
                completed_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                },
                photo_url: {
                    type: Sequelize.STRING(500),
                    allowNull: true,
                    comment: 'Foto bukti (opsional)'
                },
                note: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                created_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
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

            await queryInterface.addIndex('daily_tasks', ['branch_id', 'task_date'], {
                name: 'idx_daily_tasks_branch_date'
            });
            await queryInterface.addIndex('daily_tasks', ['user_id', 'task_date'], {
                name: 'idx_daily_tasks_user_date'
            });
            await queryInterface.addIndex('daily_tasks', ['user_id', 'task_date', 'task_template_id'], {
                name: 'uk_daily_tasks_user_date_template',
                unique: true
            });
            console.log('✅ Table daily_tasks created');
        }
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('daily_tasks').catch(() => { });
        await queryInterface.dropTable('task_templates').catch(() => { });
        await queryInterface.removeColumn('users', 'position').catch(() => { });
        console.log('⚠️  daily_tasks, task_templates dropped & users.position removed');
    }
};
