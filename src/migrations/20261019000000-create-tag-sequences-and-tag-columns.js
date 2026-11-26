'use strict';

/**
 * Nomor antrian tag sepatu (reset harian per cabang).
 * Dasar reset: tanggal masuk order (orders.entry_date).
 *
 * Sumber awal: sql/tag_sequence_migration.sql
 * Migration ini dibuat IDEMPOTENT supaya aman dijalankan di DB yang
 * kolom/tabelnya sudah pernah dibuat manual lewat SQL.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const hasTable = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName))
      .includes('tag_sequences');

    if (!hasTable) {
      await queryInterface.createTable('tag_sequences', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        seq_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'Tanggal order masuk (entry_date) sebagai dasar reset harian',
        },
        last_number: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Nomor antrian terakhir yang sudah dipakai',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('tag_sequences', ['tenant_id', 'branch_id', 'seq_date'], {
        unique: true,
        name: 'uniq_tag_sequences_tenant_branch_date',
      });

      await queryInterface.addIndex('tag_sequences', ['branch_id', 'seq_date'], {
        name: 'idx_tag_sequences_branch_date',
      });

      await queryInterface.addConstraint('tag_sequences', {
        fields: ['tenant_id'],
        type: 'foreign key',
        name: 'fk_tag_sequences_tenant',
        references: { table: 'tenants', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      await queryInterface.addConstraint('tag_sequences', {
        fields: ['branch_id'],
        type: 'foreign key',
        name: 'fk_tag_sequences_branch',
        references: { table: 'branches', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    // Kolom nomor tag di order_details
    const orderDetailColumns = await queryInterface.describeTable('order_details');

    if (!orderDetailColumns.tag_number) {
      await queryInterface.addColumn('order_details', 'tag_number', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Nomor antrian tag sepatu, reset setiap hari per cabang (dasar: entry_date order)',
      });
    }

    if (!orderDetailColumns.tag_date) {
      await queryInterface.addColumn('order_details', 'tag_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
        comment: 'Tanggal (entry_date order) yang dipakai sebagai dasar penomoran antrian',
      });
    }

    // Index bantu untuk pencarian / reprint
    try {
      const indexes = await queryInterface.showIndex('order_details');
      const hasIndex = indexes.some((idx) => idx.name === 'idx_order_details_tag');
      if (!hasIndex) {
        await queryInterface.addIndex('order_details', ['order_id', 'tag_number'], {
          name: 'idx_order_details_tag',
        });
      }
    } catch (error) {
      console.warn('⚠️ Skip index idx_order_details_tag:', error.message);
    }
  },

  down: async (queryInterface) => {
    try {
      const indexes = await queryInterface.showIndex('order_details');
      if (indexes.some((idx) => idx.name === 'idx_order_details_tag')) {
        await queryInterface.removeIndex('order_details', 'idx_order_details_tag');
      }
    } catch (error) {
      console.warn('⚠️ Skip remove index idx_order_details_tag:', error.message);
    }

    const orderDetailColumns = await queryInterface.describeTable('order_details');
    if (orderDetailColumns.tag_number) {
      await queryInterface.removeColumn('order_details', 'tag_number');
    }
    if (orderDetailColumns.tag_date) {
      await queryInterface.removeColumn('order_details', 'tag_date');
    }

    const tables = await queryInterface.showAllTables();
    const hasTable = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName))
      .includes('tag_sequences');

    if (hasTable) {
      await queryInterface.dropTable('tag_sequences');
    }
  },
};
