'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const plans = [
      // NotaLite - 3 Bulan (90 hari, diskon 20%)
      {
        name: 'NotaLite',
        description: 'Paket NotaLite 3 bulan dengan diskon 20%',
        price: 237600.00,
        duration_days: 90,
        max_branches: 1,
        max_users: 5,
        max_orders_per_month: null,
        features: JSON.stringify({
          daily_reports: true,
          multi_payment: true,
          photo_tracking: true,
          digital_invoice: true,
          priority_support: false,
          role_based_access: true,
          advanced_reporting: false,
          follow_up_features: false,
          whatsapp_integration: false
        }),
        is_active: true,
        sort_order: 11,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      },
      // NotaLite - 1 Tahun (365 hari, diskon 50%)
      {
        name: 'NotaLite',
        description: 'Paket NotaLite 1 tahun dengan diskon 50%',
        price: 594000.00,
        duration_days: 365,
        max_branches: 1,
        max_users: 5,
        max_orders_per_month: null,
        features: JSON.stringify({
          daily_reports: true,
          multi_payment: true,
          photo_tracking: true,
          digital_invoice: true,
          priority_support: false,
          role_based_access: true,
          advanced_reporting: false,
          follow_up_features: false,
          whatsapp_integration: false
        }),
        is_active: true,
        sort_order: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      },
      // NotaPro - 3 Bulan (90 hari, diskon 20%)
      {
        name: 'NotaPro',
        description: 'Paket NotaPro 3 bulan dengan diskon 20%',
        price: 357600.00,
        duration_days: 90,
        max_branches: 3,
        max_users: 20,
        max_orders_per_month: null,
        features: JSON.stringify({
          daily_reports: true,
          multi_payment: true,
          photo_tracking: true,
          digital_invoice: true,
          priority_support: false,
          role_based_access: true,
          advanced_reporting: true,
          follow_up_features: false,
          whatsapp_integration: false
        }),
        is_active: true,
        sort_order: 21,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      },
      // NotaPro - 1 Tahun (365 hari, diskon 50%)
      {
        name: 'NotaPro',
        description: 'Paket NotaPro 1 tahun dengan diskon 50%',
        price: 894000.00,
        duration_days: 365,
        max_branches: 3,
        max_users: 20,
        max_orders_per_month: null,
        features: JSON.stringify({
          daily_reports: true,
          multi_payment: true,
          photo_tracking: true,
          digital_invoice: true,
          priority_support: false,
          role_based_access: true,
          advanced_reporting: true,
          follow_up_features: false,
          whatsapp_integration: false
        }),
        is_active: true,
        sort_order: 22,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      },
      // NotaBusiness - 3 Bulan (90 hari, diskon 20%)
      {
        name: 'NotaBusiness',
        description: 'Paket NotaBusiness 3 bulan dengan diskon 20%',
        price: 597600.00,
        duration_days: 90,
        max_branches: 10,
        max_users: 100,
        max_orders_per_month: null,
        features: JSON.stringify({
          daily_reports: false,
          multi_payment: true,
          photo_tracking: true,
          digital_invoice: true,
          priority_support: true,
          role_based_access: true,
          advanced_reporting: true,
          follow_up_features: false,
          whatsapp_integration: false
        }),
        is_active: true,
        sort_order: 31,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      },
      // NotaBusiness - 1 Tahun (365 hari, diskon 50%)
      {
        name: 'NotaBusiness',
        description: 'Paket NotaBusiness 1 tahun dengan diskon 50%',
        price: 1494000.00,
        duration_days: 365,
        max_branches: 10,
        max_users: 100,
        max_orders_per_month: null,
        features: JSON.stringify({
          daily_reports: false,
          multi_payment: true,
          photo_tracking: true,
          digital_invoice: true,
          priority_support: true,
          role_based_access: true,
          advanced_reporting: true,
          follow_up_features: false,
          whatsapp_integration: false
        }),
        is_active: true,
        sort_order: 32,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }
    ];

    // Check existing plans to avoid duplicates (by name AND duration_days)
    for (const plan of plans) {
      const [existing] = await queryInterface.sequelize.query(`
        SELECT id FROM subscription_plans 
        WHERE name = '${plan.name}' AND duration_days = ${plan.duration_days} 
        LIMIT 1
      `);
      
      if (existing.length === 0) {
        await queryInterface.bulkInsert('subscription_plans', [plan]);
        console.log(`✅ ${plan.name} (${plan.duration_days} hari) inserted`);
      } else {
        console.log(`ℹ️  ${plan.name} (${plan.duration_days} hari) already exists, skipping`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('subscription_plans', {
      [Sequelize.Op.and]: [
        {
          name: {
            [Sequelize.Op.in]: ['NotaLite', 'NotaPro', 'NotaBusiness']
          }
        },
        {
          duration_days: {
            [Sequelize.Op.in]: [90, 365]
          }
        }
      ]
    });
    
    console.log('⚠️  3-month and yearly plans removed');
  }
};

