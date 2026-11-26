'use strict';

/**
 * Stok barang per outlet.
 *
 * `treatment` tetap jadi master barang/layanan (Indomie, Popmie, tiket, parkir).
 * Stok disimpan terpisah per outlet supaya Cafe A dan Cafe B bisa punya sisa
 * berbeda untuk barang yang sama.
 *
 * Barang dianggap TIDAK di-track selama belum punya baris di `treatment_stocks`.
 * Jadi treatment lama (tiket masuk, parkir, sewa perahu) tidak perlu diapa-apakan.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tables = await queryInterface.showAllTables();

        if (!tables.includes('treatment_stocks')) {
            await queryInterface.createTable('treatment_stocks', {
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
                treatment_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'treatment', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'Barang/layanan yang di-track stoknya'
                },
                branch_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'Outlet pemilik stok ini'
                },
                stock: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: 'Sisa stok saat ini (boleh minus bila allow_negative_stock aktif)'
                },
                min_stock: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: 'Batas bawah untuk status "Menipis"'
                },
                is_active: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
                    comment: 'false = berhenti di-track (stok tidak lagi dipotong saat penjualan)'
                },
                last_restock_at: {
                    type: Sequelize.DATE,
                    allowNull: true
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

            await queryInterface.addIndex('treatment_stocks', ['tenant_id', 'branch_id'], {
                name: 'idx_treatment_stocks_tenant_branch'
            });
            await queryInterface.addIndex('treatment_stocks', ['treatment_id', 'branch_id'], {
                name: 'uk_treatment_stocks_treatment_branch',
                unique: true
            });
            console.log('✅ Table treatment_stocks created');
        }

        if (!tables.includes('stock_movements')) {
            await queryInterface.createTable('stock_movements', {
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
                    onDelete: 'CASCADE'
                },
                treatment_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'treatment', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                type: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                    comment: 'in | sale | adjust | transfer_in | transfer_out | void'
                },
                qty: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    comment: 'Signed: positif = masuk, negatif = keluar. SUM(qty) = perubahan stok'
                },
                stock_before: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                stock_after: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                ref_type: {
                    type: Sequelize.STRING(30),
                    allowNull: true,
                    comment: 'order | transfer | manual'
                },
                ref_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'ID order / ID pasangan transfer'
                },
                note: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                    comment: 'Siapa yang melakukan pergerakan stok'
                },
                movement_date: {
                    type: Sequelize.DATEONLY,
                    allowNull: false,
                    comment: 'Tanggal lokal (YYYY-MM-DD) untuk filter laporan'
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

            await queryInterface.addIndex('stock_movements', ['tenant_id', 'branch_id', 'movement_date'], {
                name: 'idx_stock_movements_tenant_branch_date'
            });
            await queryInterface.addIndex('stock_movements', ['treatment_id', 'branch_id', 'movement_date'], {
                name: 'idx_stock_movements_treatment_branch_date'
            });
            await queryInterface.addIndex('stock_movements', ['ref_type', 'ref_id'], {
                name: 'idx_stock_movements_ref'
            });
            console.log('✅ Table stock_movements created');
        }
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('stock_movements').catch(() => { });
        await queryInterface.dropTable('treatment_stocks').catch(() => { });
        console.log('⚠️  stock_movements & treatment_stocks dropped');
    }
};
