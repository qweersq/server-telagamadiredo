'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Drop table if exists (for re-migration)
        await queryInterface.dropTable('incomes').catch(() => { });

        await queryInterface.createTable('incomes', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                comment: 'User yang mencatat pemasukan'
            },
            shift_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'shifts',
                    key: 'id'
                },
                comment: 'Shift saat pemasukan dicatat (opsional)'
            },
            finance_account_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'finance_accounts',
                    key: 'id'
                },
                comment: 'Akun keuangan tujuan pemasukan'
            },
            finance_category_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'finance_categories',
                    key: 'id'
                },
                comment: 'Kategori keuangan'
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
                comment: 'Nama/judul pemasukan'
            },
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false,
                comment: 'Tanggal pemasukan'
            },
            amount: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
                comment: 'Nominal pemasukan'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Deskripsi/catatan pemasukan'
            },
            receipt: {
                type: Sequelize.STRING(1000),
                allowNull: true,
                comment: 'URL bukti/receipt'
            },
            status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed'),
                defaultValue: 'completed',
                comment: 'Status pemasukan'
            },
            approved_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                comment: 'User yang approve'
            },
            approved_at: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Waktu approval'
            },
            transaction_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'finance_transactions',
                    key: 'id'
                },
                comment: 'Referensi ke finance transaction'
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
                comment: 'ID tenant pemilik'
            },
            branch_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'branches',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID cabang'
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
            },
            deletedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Soft delete timestamp'
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        });

        // Add indexes
        await queryInterface.addIndex('incomes', ['tenant_id'], {
            name: 'idx_incomes_tenant'
        });

        await queryInterface.addIndex('incomes', ['branch_id'], {
            name: 'idx_incomes_branch'
        });

        await queryInterface.addIndex('incomes', ['date'], {
            name: 'idx_incomes_date'
        });

        await queryInterface.addIndex('incomes', ['user_id'], {
            name: 'idx_incomes_user'
        });

        console.log('✅ Table incomes created successfully');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('incomes');
        console.log('⚠️  Table incomes dropped');
    }
};
