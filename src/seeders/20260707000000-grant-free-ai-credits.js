'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Ambil semua tenant
      const [tenants] = await queryInterface.sequelize.query(
        'SELECT id, ai_credit_balance FROM tenants',
        { transaction }
      );

      if (!tenants || tenants.length === 0) {
        console.log('⚠️ No tenants found, skipping seeder.');
        await transaction.commit();
        return;
      }

      console.log(`📦 Found ${tenants.length} tenants, granting 20 AI credits each...`);

      const now = new Date();
      const creditLogs = [];
      const updateValues = [];

      for (const tenant of tenants) {
        const currentBalance = tenant.ai_credit_balance || 0;
        const newBalance = currentBalance + 20;

        updateValues.push({
          id: tenant.id,
          newBalance,
        });

        creditLogs.push({
          tenant_id: tenant.id,
          type: 'CREDIT',
          amount: 20,
          balance_before: currentBalance,
          balance_after: newBalance,
          source: 'ADMIN_GRANT',
          description: 'Free 20 AI credits for early users - welcome trial',
          payment_method: 'ADMIN',
          createdAt: now,
          updatedAt: now,
        });
      }

      // Batch update tenant balances
      for (const val of updateValues) {
        await queryInterface.sequelize.query(
          'UPDATE tenants SET ai_credit_balance = :newBalance, updatedAt = :now WHERE id = :id',
          {
            replacements: { newBalance: val.newBalance, id: val.id, now },
            transaction,
          }
        );
      }

      // Bulk insert credit logs
      await queryInterface.bulkInsert('tenant_ai_credits', creditLogs, { transaction });

      await transaction.commit();
      console.log(`✅ Successfully granted 20 AI credits to ${tenants.length} tenants!`);
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error granting AI credits:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Ambil semua tenant
      const [tenants] = await queryInterface.sequelize.query(
        'SELECT id, ai_credit_balance FROM tenants',
        { transaction }
      );

      if (!tenants || tenants.length === 0) {
        await transaction.commit();
        return;
      }

      const now = new Date();

      // Rollback: kurangi balance 20, hapus credit logs
      for (const tenant of tenants) {
        const currentBalance = tenant.ai_credit_balance || 0;
        const newBalance = Math.max(0, currentBalance - 20);

        await queryInterface.sequelize.query(
          'UPDATE tenants SET ai_credit_balance = :newBalance, updatedAt = :now WHERE id = :id',
          {
            replacements: { newBalance, id: tenant.id, now },
            transaction,
          }
        );
      }

      // Hapus semua credit logs dengan source ADMIN_GRANT dan description welcome trial
      await queryInterface.sequelize.query(
        `DELETE FROM tenant_ai_credits WHERE source = 'ADMIN_GRANT' AND description = 'Free 20 AI credits for early users - welcome trial'`,
        { transaction }
      );

      await transaction.commit();
      console.log(`✅ Successfully rolled back 20 AI credits from ${tenants.length} tenants!`);
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error rolling back AI credits:', error);
      throw error;
    }
  },
};
