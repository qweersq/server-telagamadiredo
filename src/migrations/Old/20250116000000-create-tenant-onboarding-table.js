'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tenant_onboardings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
        comment: 'ID tenant yang sedang onboarding'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID user yang melakukan onboarding'
      },
      current_step: {
        type: Sequelize.ENUM('branch_setup', 'user_creation', 'service_setup', 'printer_setup', 'wa_setup', 'completed'),
        allowNull: false,
        defaultValue: 'branch_setup',
        comment: 'Step onboarding saat ini'
      },
      completed_steps: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array step yang sudah diselesaikan'
      },
      onboarding_data: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Data yang dikumpulkan selama onboarding'
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Apakah onboarding sudah selesai'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Tanggal selesai onboarding'
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
    });

    // Add indexes
    await queryInterface.addIndex('tenant_onboardings', ['tenant_id'], {
      name: 'idx_tenant_onboardings_tenant_id'
    });
    
    await queryInterface.addIndex('tenant_onboardings', ['user_id'], {
      name: 'idx_tenant_onboardings_user_id'
    });
    
    await queryInterface.addIndex('tenant_onboardings', ['current_step'], {
      name: 'idx_tenant_onboardings_current_step'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tenant_onboardings');
  }
};
