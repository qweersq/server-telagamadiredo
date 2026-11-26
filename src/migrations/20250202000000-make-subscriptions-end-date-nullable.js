'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('subscriptions', 'end_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Tanggal berakhir langganan (NULL untuk plan gratis)'
    });
    
    console.log('✅ subscriptions.end_date changed to nullable');
  },

  down: async (queryInterface, Sequelize) => {
    // Set NULL values to far future date before making it NOT NULL
    await queryInterface.sequelize.query(`
      UPDATE subscriptions 
      SET end_date = DATE_ADD(NOW(), INTERVAL 365 DAY) 
      WHERE end_date IS NULL
    `);
    
    await queryInterface.changeColumn('subscriptions', 'end_date', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Tanggal berakhir langganan'
    });
    
    console.log('⚠️  subscriptions.end_date changed back to NOT NULL');
  }
};

