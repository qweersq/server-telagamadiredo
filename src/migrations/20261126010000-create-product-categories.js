'use strict';

/**
 * Kategori produk/paket.
 *
 * Sebelumnya `treatment.type_item` dipakai campur untuk dua hal: jenis penjualan
 * (Tiket, Wahana, Parkir, Jasa) dan kategori katalog (Makanan, Minuman, Paket).
 * Akibatnya kasir bingung saat menambah menu F&B karena tidak ada daftar
 * kategori yang baku.
 *
 * Tabel ini memisahkan dua level:
 *   - type_service  → lini bisnis (Wisata, F&B, Retribusi)
 *   - product_categories → grup katalog di dalam lini bisnis
 *
 * `treatment.type_item` tetap dipertahankan untuk kompatibilitas data lama,
 * sedangkan `treatment.category_id` menjadi relasi kategori yang sebenarnya.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tables = await queryInterface.showAllTables();

        if (!tables.includes('product_categories')) {
            await queryInterface.createTable('product_categories', {
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
                    comment: 'ID tenant pemilik kategori'
                },
                name: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    comment: 'Nama kategori, mis. "Makanan Berat", "Kopi", "Paket"'
                },
                type_service: {
                    type: Sequelize.STRING(50),
                    allowNull: true,
                    comment: 'Lini bisnis kategori ini: Wisata, F&B, Retribusi, dll'
                },
                description: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                sort_order: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: 'Urutan tampil di katalog/POS (kecil duluan)'
                },
                is_active: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
                    comment: 'false = kategori disembunyikan dari pilihan produk'
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

            await queryInterface.addIndex('product_categories', ['tenant_id', 'type_service'], {
                name: 'idx_product_categories_tenant_service'
            });
            await queryInterface.addIndex('product_categories', ['tenant_id', 'name'], {
                name: 'uk_product_categories_tenant_name',
                unique: true
            });
            console.log('✅ Table product_categories created');
        }

        const treatmentColumns = await queryInterface.describeTable('treatment');

        if (!treatmentColumns.category_id) {
            await queryInterface.addColumn('treatment', 'category_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: { model: 'product_categories', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Kategori katalog produk. Null = belum dikategorikan'
            });
            await queryInterface.addIndex('treatment', ['category_id'], {
                name: 'idx_treatment_category'
            });
            console.log('✅ Column treatment.category_id added');
        }

        // Seed kategori default untuk setiap tenant yang sudah punya produk.
        const [tenants] = await queryInterface.sequelize.query(
            'SELECT DISTINCT tenant_id FROM treatment WHERE tenant_id IS NOT NULL'
        );

        // type_service mengikuti nilai yang dipakai `treatment.type_service`
        // (Makanan/Minuman/Snack/Souvenir/Wisata/Retribusi) supaya filter katalog
        // di POS langsung cocok. Null = berlaku lintas lini bisnis.
        const defaults = [
            { name: 'Makanan Berat', type_service: 'Makanan', sort_order: 1, description: 'Nasi, mie, ayam, sate' },
            { name: 'Camilan', type_service: 'Snack', sort_order: 1, description: 'Kentang, pisang goreng, popmie' },
            { name: 'Kopi', type_service: 'Minuman', sort_order: 1, description: 'Kopi susu, americano, tubruk' },
            { name: 'Non-Kopi', type_service: 'Minuman', sort_order: 2, description: 'Teh, jus, susu, air mineral' },
            { name: 'Souvenir', type_service: 'Souvenir', sort_order: 1, description: 'Oleh-oleh dan merchandise' },
            { name: 'Tiket Masuk', type_service: 'Wisata', sort_order: 1, description: 'Tiket masuk kawasan' },
            { name: 'Wahana', type_service: 'Wisata', sort_order: 2, description: 'Permainan dan atraksi' },
            { name: 'Parkir', type_service: 'Retribusi', sort_order: 1, description: 'Retribusi parkir kendaraan' },
            { name: 'Paket', type_service: null, sort_order: 99, description: 'Bundling tiket + makan, family package' }
        ];

        for (const row of tenants) {
            if (!row.tenant_id) continue;

            for (const item of defaults) {
                await queryInterface.sequelize.query(
                    `INSERT INTO product_categories
                        (tenant_id, name, type_service, description, sort_order, is_active, createdAt, updatedAt)
                     VALUES (:tenant_id, :name, :type_service, :description, :sort_order, 1, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE name = name`,
                    {
                        replacements: {
                            tenant_id: row.tenant_id,
                            name: item.name,
                            type_service: item.type_service,
                            description: item.description,
                            sort_order: item.sort_order
                        }
                    }
                );
            }
            console.log(`✅ Default product categories seeded for tenant ${row.tenant_id}`);
        }
    },

    down: async (queryInterface) => {
        const treatmentColumns = await queryInterface.describeTable('treatment');

        if (treatmentColumns.category_id) {
            await queryInterface.removeIndex('treatment', 'idx_treatment_category').catch(() => { });
            await queryInterface.removeColumn('treatment', 'category_id');
            console.log('✅ Column treatment.category_id removed');
        }

        const tables = await queryInterface.showAllTables();
        if (tables.includes('product_categories')) {
            await queryInterface.dropTable('product_categories');
            console.log('⚠️  product_categories dropped');
        }
    }
};
