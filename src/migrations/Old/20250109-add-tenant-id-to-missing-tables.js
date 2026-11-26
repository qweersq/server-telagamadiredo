'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('=== ADDING TENANT_ID TO MISSING TABLES ===');
      
      // 1. Add tenant_id to order_details
      console.log('Adding tenant_id to order_details...');
      await queryInterface.addColumn('order_details', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik order detail'
      }, { transaction });
      
      // 2. Add tenant_id to payments
      console.log('Adding tenant_id to payments...');
      await queryInterface.addColumn('payments', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik payment'
      }, { transaction });
      
      // 3. Add tenant_id to payment_details
      console.log('Adding tenant_id to payment_details...');
      await queryInterface.addColumn('payment_details', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik payment detail'
      }, { transaction });
      
      // 4. Add tenant_id to payment_logs
      console.log('Adding tenant_id to payment_logs...');
      await queryInterface.addColumn('payment_logs', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik payment log'
      }, { transaction });
      
      // 5. Add tenant_id to shifts
      console.log('Adding tenant_id to shifts...');
      await queryInterface.addColumn('shifts', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik shift'
      }, { transaction });
      
      // 6. Add tenant_id to expenses
      console.log('Adding tenant_id to expenses...');
      await queryInterface.addColumn('expenses', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik expense'
      }, { transaction });
      
      // 7. Add tenant_id to absents
      console.log('Adding tenant_id to absents...');
      await queryInterface.addColumn('absents', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik absent'
      }, { transaction });
      
      // 8. Add tenant_id to deliveries
      console.log('Adding tenant_id to deliveries...');
      await queryInterface.addColumn('deliveries', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik delivery'
      }, { transaction });
      
      // 9. Add tenant_id to delivery_details
      console.log('Adding tenant_id to delivery_details...');
      await queryInterface.addColumn('delivery_details', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik delivery detail'
      }, { transaction });
      
      // 10. Add tenant_id to discounts
      console.log('Adding tenant_id to discounts...');
      await queryInterface.addColumn('discounts', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik discount'
      }, { transaction });
      
      // 11. Add tenant_id to leads
      console.log('Adding tenant_id to leads...');
      await queryInterface.addColumn('leads', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik lead'
      }, { transaction });
      
      // 12. Add tenant_id to lead_records
      console.log('Adding tenant_id to lead_records...');
      await queryInterface.addColumn('lead_records', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik lead record'
      }, { transaction });
      
      // 13. Add tenant_id to finance_accounts
      console.log('Adding tenant_id to finance_accounts...');
      await queryInterface.addColumn('finance_accounts', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik finance account'
      }, { transaction });
      
      // 14. Add tenant_id to finance_categories
      console.log('Adding tenant_id to finance_categories...');
      await queryInterface.addColumn('finance_categories', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik finance category'
      }, { transaction });
      
      // 15. Add tenant_id to finance_transactions
      console.log('Adding tenant_id to finance_transactions...');
      await queryInterface.addColumn('finance_transactions', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik finance transaction'
      }, { transaction });
      
      // 16. Add tenant_id to invoice_tokens
      console.log('Adding tenant_id to invoice_tokens...');
      await queryInterface.addColumn('invoice_tokens', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik invoice token'
      }, { transaction });
      
      // 17. Add tenant_id to invoice_access_logs
      console.log('Adding tenant_id to invoice_access_logs...');
      await queryInterface.addColumn('invoice_access_logs', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik invoice access log'
      }, { transaction });
      
      // 18. Add tenant_id to reminder_logs
      console.log('Adding tenant_id to reminder_logs...');
      await queryInterface.addColumn('reminder_logs', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik reminder log'
      }, { transaction });
      
      // 19. Add tenant_id to order_detail_status_logs
      console.log('Adding tenant_id to order_detail_status_logs...');
      await queryInterface.addColumn('order_detail_status_logs', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik order detail status log'
      }, { transaction });
      
      // 20. Add tenant_id to item_status_photos
      console.log('Adding tenant_id to item_status_photos...');
      await queryInterface.addColumn('item_status_photos', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik item status photo'
      }, { transaction });
      
      // 21. Add tenant_id to shoe_photos
      console.log('Adding tenant_id to shoe_photos...');
      await queryInterface.addColumn('shoe_photos', 'tenant_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik shoe photo'
      }, { transaction });
      
      await transaction.commit();
      console.log('✅ All tenant_id columns added successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('=== REMOVING TENANT_ID FROM TABLES ===');
      
      // Remove tenant_id columns
      const tables = [
        'order_details', 'payments', 'payment_details', 'payment_logs',
        'shifts', 'expenses', 'absents', 'deliveries', 'delivery_details',
        'discounts', 'leads', 'lead_records', 'finance_accounts',
        'finance_categories', 'finance_transactions', 'invoice_tokens',
        'invoice_access_logs', 'reminder_logs', 'order_detail_status_logs',
        'item_status_photos', 'shoe_photos'
      ];
      
      for (const table of tables) {
        console.log(`Removing tenant_id from ${table}...`);
        await queryInterface.removeColumn(table, 'tenant_id', { transaction });
      }
      
      await transaction.commit();
      console.log('✅ All tenant_id columns removed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
