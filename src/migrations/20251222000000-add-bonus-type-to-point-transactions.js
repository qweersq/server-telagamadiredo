'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add bonus_type column to point_transactions table
    await queryInterface.addColumn('point_transactions', 'bonus_type', {
      type: Sequelize.ENUM('referral_referrer', 'referral_new_customer', 'first_order'),
      allowNull: true,
      defaultValue: null,
      comment: 'Jenis bonus poin (hanya untuk type = bonus). referral_referrer: bonus untuk referrer, referral_new_customer: bonus untuk customer baru yang direfer, first_order: bonus untuk order pertama tanpa referral'
    });
    
    // Add index untuk bonus_type untuk query yang lebih cepat
    await queryInterface.addIndex('point_transactions', ['bonus_type'], {
      name: 'idx_point_transactions_bonus_type',
      where: {
        bonus_type: {
          [Sequelize.Op.ne]: null
        }
      }
    });
    
    console.log('✅ Column bonus_type added to point_transactions table');
  },
 
  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('point_transactions', 'idx_point_transactions_bonus_type');
    
    // Remove column
    await queryInterface.removeColumn('point_transactions', 'bonus_type');
    
    // Drop ENUM type (MySQL)
    // Note: MySQL doesn't automatically drop ENUM types, so we need to use raw query
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS `enum_point_transactions_bonus_type`');
    
    console.log('⚠️  Column bonus_type removed from point_transactions table');
  }
};


