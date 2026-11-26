'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add points and lifetime_points to customers table
    await queryInterface.addColumn('customers', 'points', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Poin saat ini yang bisa dipakai untuk redeem'
    });

    await queryInterface.addColumn('customers', 'lifetime_points', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total poin yang pernah didapat (untuk tier membership, tidak pernah turun)'
    });

    // 2. Add min_points to memberships table (keep price for backward compatibility)
    await queryInterface.addColumn('memberships', 'min_points', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Minimum lifetime_points untuk tier ini (nullable, untuk backward compatibility)'
    });

    // 3. Make duration_days nullable (keep for backward compatibility)
    await queryInterface.changeColumn('memberships', 'duration_days', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Durasi membership dalam hari (nullable untuk backward compatibility)'
    });

    // 4. Create point_transactions table
    await queryInterface.createTable('point_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID customer pemilik poin'
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID order terkait (nullable untuk bonus poin)'
      },
      type: {
        type: Sequelize.ENUM('earn', 'redeem', 'expire', 'bonus'),
        allowNull: false,
        comment: 'Jenis transaksi poin'
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Jumlah poin (bisa negatif untuk redeem)'
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Deskripsi transaksi poin'
      },
      expires_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
        comment: 'Tanggal kadaluarsa poin (nullable, untuk future use)'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex('point_transactions', ['customer_id'], {
      name: 'idx_point_transactions_customer_id'
    });

    await queryInterface.addIndex('point_transactions', ['order_id'], {
      name: 'idx_point_transactions_order_id'
    });

    await queryInterface.addIndex('point_transactions', ['type'], {
      name: 'idx_point_transactions_type'
    });

    await queryInterface.addIndex('point_transactions', ['createdAt'], {
      name: 'idx_point_transactions_created_at'
    });

    console.log('✅ Migration completed:');
    console.log('   - customers.points added');
    console.log('   - customers.lifetime_points added');
    console.log('   - memberships.min_points added');
    console.log('   - memberships.duration_days made nullable');
    console.log('   - point_transactions table created');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: remove in reverse order
    await queryInterface.dropTable('point_transactions');
    
    await queryInterface.changeColumn('memberships', 'duration_days', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Durasi membership dalam hari'
    });
    
    await queryInterface.removeColumn('memberships', 'min_points');
    
    await queryInterface.removeColumn('customers', 'lifetime_points');
    await queryInterface.removeColumn('customers', 'points');

    console.log('⚠️  Rollback completed: all changes reverted');
  }
};
