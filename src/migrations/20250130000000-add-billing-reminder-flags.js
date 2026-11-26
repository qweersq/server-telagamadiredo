'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenant_payments', 'reminder_h3_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag email reminder H-3 sudah terkirim'
    });

    await queryInterface.addColumn('tenant_payments', 'reminder_h1_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag email reminder H-1 sudah terkirim'
    });

    await queryInterface.addColumn('tenant_payments', 'reminder_h0_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag email reminder hari H sudah terkirim'
    });
    
    console.log('✅ Billing reminder flags added to tenant_payments table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenant_payments', 'reminder_h3_sent');
    await queryInterface.removeColumn('tenant_payments', 'reminder_h1_sent');
    await queryInterface.removeColumn('tenant_payments', 'reminder_h0_sent');
    
    console.log('⚠️  Billing reminder flags removed from tenant_payments table');
  }
};

