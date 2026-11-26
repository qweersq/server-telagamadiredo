#!/usr/bin/env node
/**
 * Monthly AI Credit Grant Cron Job
 * 
 * Runs on the 1st of every month to grant free AI credits to all tenants
 * based on their ai_tier:
 *   - FREE:    +50 credit
 *   - BASIC:   +200 credit
 *   - PREMIUM: +999999 credit (practically unlimited)
 * 
 * Usage:
 *   node CRON/monthlyAiCreditGrant.js            # Run normally
 *   node CRON/monthlyAiCreditGrant.js test       # Test run (dry run)
 *   node CRON/monthlyAiCreditGrant.js force      # Force run (ignore date check)
 * 
 * Schedule (crontab):
 *   0 2 1 * * /usr/bin/node /path/to/CRON/monthlyAiCreditGrant.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = require('../src/config/database');
require('../src/models'); // Load models to init associations

const AiCreditService = require('../src/services/AiCreditService');

process.env.TZ = 'Asia/Jakarta';

async function main() {
    const args = process.argv.slice(2);
    const isTest = args.includes('test');
    const isForce = args.includes('force');

    console.log('='.repeat(50));
    console.log('🤖 Monthly AI Credit Grant');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log(`🔧 Mode: ${isTest ? 'TEST (dry run)' : isForce ? 'FORCE' : 'NORMAL'}`);
    console.log('='.repeat(50));

    // Check if today is the 1st of the month, unless force mode
    const today = new Date();
    if (today.getDate() !== 1 && !isForce && !isTest) {
        console.log('⏭️ Today is not the 1st of the month. Skipping. (Use "force" to override)');
        process.exit(0);
    }

    try {
        // Authenticate DB
        await sequelize.authenticate();
        console.log('✅ Database connected');

        if (isTest) {
            // Dry run: just count tenants and what they'd get
            const { Tenant, Op } = require('../src/models');
            const tenants = await Tenant.findAll({
                attributes: ['id', 'business_name', 'ai_credit_balance', 'ai_tier'],
            });

            console.log(`\n📊 Tenants found: ${tenants.length}`);
            console.log('─'.repeat(50));

            for (const tenant of tenants) {
                let grant = 0;
                switch (tenant.ai_tier) {
                    case 'FREE': grant = 50; break;
                    case 'BASIC': grant = 200; break;
                    case 'PREMIUM': grant = 999999; break;
                    default: grant = 50;
                }
                console.log(`  ${tenant.business_name.padEnd(25)} ${tenant.ai_tier.padEnd(10)} ${String(tenant.ai_credit_balance).padStart(6)} → ${String(tenant.ai_credit_balance + grant).padStart(8)} credit`);
            }

            console.log('\n✅ Test run complete. No changes made.');
        } else {
            const result = await AiCreditService.processMonthlyGrants();
            console.log(`\n✅ Grant complete:`);
            console.log(`  Processed: ${result.processed}`);
            console.log(`  Errors: ${result.errors.length}`);
            if (result.errors.length > 0) {
                for (const err of result.errors) {
                    console.log(`  ❌ Tenant #${err.tenantId}: ${err.error}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Monthly grant failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    }
}

main();
