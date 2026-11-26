'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if NotaFree already exists
    const [existing] = await queryInterface.sequelize.query(`
      SELECT id FROM subscription_plans WHERE name = 'NotaFree' LIMIT 1
    `);
    
    if (existing.length > 0) {
      console.log('ℹ️  NotaFree plan already exists, skipping seed');
      return;
    }
    
    await queryInterface.bulkInsert('subscription_plans', [{
      name: 'NotaFree',
      description: 'Paket gratis untuk bisnis laundry sepatu kecil',
      price: 0.00,
      duration_days: 9999,
      max_branches: 1,
      max_users: 2,
      max_orders_per_month: 50,
      features: JSON.stringify({
        input_order: true,
        daily_reports: false,
        multi_payment: false,
        photo_tracking: true,
        digital_invoice: true,
        priority_support: false,
        role_based_access: true,
        advanced_reporting: false,
        follow_up_features: false,
        whatsapp_integration: false,
        campaign_features: false,
        nota_basic: true
      }),
      is_active: true,
      sort_order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }]);
    
    console.log('✅ NotaFree plan seeded');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('subscription_plans', {
      name: 'NotaFree'
    });
    
    console.log('⚠️  NotaFree plan removed');
  }
};

