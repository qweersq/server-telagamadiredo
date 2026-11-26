'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('customer_memberships', 'end_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Tanggal berakhir membership (NULL untuk tier-based membership yang tidak expire)'
    });
    
    console.log('✅ customer_memberships.end_date changed to nullable');
  },

  down: async (queryInterface, Sequelize) => {
    // Set NULL values to far future date before making it NOT NULL
    await queryInterface.sequelize.query(`
      UPDATE customer_memberships 
      SET end_date = DATE_ADD(NOW(), INTERVAL 365 DAY) 
      WHERE end_date IS NULL
    `);
    
    await queryInterface.changeColumn('customer_memberships', 'end_date', {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Tanggal berakhir membership'
    });
    
    console.log('⚠️  customer_memberships.end_date changed back to NOT NULL');
  }
};

