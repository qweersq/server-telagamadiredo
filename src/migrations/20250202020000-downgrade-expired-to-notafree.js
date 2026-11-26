'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get NotaFree plan ID
    const [freePlan] = await queryInterface.sequelize.query(`
      SELECT id FROM subscription_plans WHERE name = 'NotaFree' LIMIT 1
    `);
    
    if (freePlan.length === 0) {
      throw new Error('NotaFree plan not found. Run migration 20250202010000 first.');
    }
    
    const freePlanId = freePlan[0].id;
    
    // Find expired subscriptions (end_date < NOW() and status active/trial)
    const [expiredSubs] = await queryInterface.sequelize.query(`
      SELECT s.id, s.tenant_id, s.plan_id, s.status, s.end_date
      FROM subscriptions s
      WHERE s.end_date < NOW() 
        AND s.status IN ('active', 'trial')
        AND s.deletedAt IS NULL
    `);
    
    console.log(`🔍 Found ${expiredSubs.length} expired subscriptions to downgrade`);
    
    for (const sub of expiredSubs) {
      const tenantId = sub.tenant_id;
      
      // Expire old subscription
      await queryInterface.sequelize.query(`
        UPDATE subscriptions 
        SET status = 'expired', updatedAt = NOW()
        WHERE id = ${sub.id}
      `);
      
      // Create new FREE subscription
      await queryInterface.bulkInsert('subscriptions', [{
        tenant_id: tenantId,
        plan_id: freePlanId,
        status: 'active',
        start_date: new Date(),
        end_date: null,
        auto_renew: false,
        price: 0.00,
        discount_amount: 0.00,
        final_price: 0.00,
        payment_method: 'free',
        notes: 'Auto downgrade to NotaFree - expired subscription',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }]);
      
      // Update tenant status
      await queryInterface.sequelize.query(`
        UPDATE tenants 
        SET status = 'active', 
            subscription_status = 'active',
            updatedAt = NOW()
        WHERE id = ${tenantId}
      `);
      
      console.log(`✅ Tenant ${tenantId} downgraded to NotaFree`);
    }
    
    console.log(`✅ ${expiredSubs.length} tenants downgraded to NotaFree`);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove FREE subscriptions created by this migration
    await queryInterface.sequelize.query(`
      DELETE FROM subscriptions 
      WHERE payment_method = 'free' 
        AND notes LIKE 'Auto downgrade to NotaFree%'
    `);
    
    console.log('⚠️  FREE subscriptions removed');
  }
};

