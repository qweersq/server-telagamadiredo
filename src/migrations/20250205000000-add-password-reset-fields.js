'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'password_reset_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Token untuk reset password'
    });

    await queryInterface.addColumn('users', 'password_reset_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Tanggal kadaluarsa password reset token'
    });

    // Add index for faster lookup
    await queryInterface.addIndex('users', ['password_reset_token'], {
      name: 'idx_users_password_reset_token'
    });
    
    console.log('✅ Password reset fields added to users table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'idx_users_password_reset_token');
    await queryInterface.removeColumn('users', 'password_reset_expires_at');
    await queryInterface.removeColumn('users', 'password_reset_token');
    
    console.log('⚠️  Password reset fields removed from users table');
  }
};

