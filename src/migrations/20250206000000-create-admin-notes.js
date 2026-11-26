'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admin_notes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Judul notes'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Isi notes'
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID customer jika notes terkait customer'
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
        comment: 'ID order jika notes terkait order'
      },
      status: {
        type: Sequelize.ENUM('pending', 'done', 'archived'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status notes'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Prioritas notes'
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Tanggal deadline notes'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID user yang membuat notes'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID user yang terakhir mengupdate notes'
      },
      done_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID user yang mark notes sebagai done'
      },
      done_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal kapan notes di-mark sebagai done'
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID cabang notes'
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
        comment: 'ID tenant pemilik notes'
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
    await queryInterface.addIndex('admin_notes', ['branch_id'], {
      name: 'idx_admin_notes_branch_id'
    });
    await queryInterface.addIndex('admin_notes', ['tenant_id'], {
      name: 'idx_admin_notes_tenant_id'
    });
    await queryInterface.addIndex('admin_notes', ['customer_id'], {
      name: 'idx_admin_notes_customer_id'
    });
    await queryInterface.addIndex('admin_notes', ['order_id'], {
      name: 'idx_admin_notes_order_id'
    });
    await queryInterface.addIndex('admin_notes', ['status'], {
      name: 'idx_admin_notes_status'
    });
    await queryInterface.addIndex('admin_notes', ['priority'], {
      name: 'idx_admin_notes_priority'
    });
    await queryInterface.addIndex('admin_notes', ['due_date'], {
      name: 'idx_admin_notes_due_date'
    });
    
    console.log('✅ Admin notes table created');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('admin_notes');
    console.log('⚠️  Admin notes table dropped');
  }
};

