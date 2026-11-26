'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Refresh token untuk auto refresh access token'
    });
    
    console.log('✅ Refresh token field added to users table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'refresh_token');
    
    console.log('⚠️  Refresh token field removed from users table');
  }
};

