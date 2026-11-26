#!/usr/bin/env node

/**
 * NotaSepatu Simple Cron Jobs
 * 
 * Simple cron jobs using existing controllers and services
 * No complex abstractions, just direct method calls
 */

// Load environment variables first
// Try multiple possible .env file locations
const path = require('path');
const fs = require('fs');

// Try .env first, then database.env, then default dotenv
const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../database.env'),
    path.resolve(__dirname, '../../.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log(`📄 Loaded environment from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    // Fallback to default dotenv (will look for .env in current directory)
    require('dotenv').config();
    console.log('📄 Using default dotenv configuration');
}

const cron = require('node-cron');
const moment = require('moment');

// Initialize database connection
const sequelize = require('../src/config/database');
// Load models to initialize associations
require('../src/models');

// Import existing services
const BillingService = require('../src/services/billingService');
const TenantService = require('../src/services/tenantService');
const CustomerMembershipService = require('../src/services/customerMembershipService');
const AiCreditService = require('../src/services/AiCreditService');

// Set timezone
process.env.TZ = 'Asia/Jakarta';

// Database connection test function
async function testDatabaseConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to database:', error.message);
        return false;
    }
}

console.log('🌟 NotaSepatu Simple Cron Jobs');
console.log('================================');
console.log(`🕐 Started at: ${moment().format('YYYY-MM-DD HH:mm:ss')} WIB`);
console.log('');

/**
 * Daily Trial Management (1:00 AM WIB)
 * - Check expired trials and downgrade to NotaFree
 * - Note: Billing generation (H-1) handled by endpoint /billing/validate-all (VPS cron)
 */
cron.schedule('0 1 * * *', async () => {
    console.log('\n🔄 [1:00 AM] Running Daily Trial Management...');
    
    try {
        // Check and update expired trials (downgrade to NotaFree)
        console.log('📋 Checking expired trials and downgrading to NotaFree...');
        const expiredTrialsResult = await BillingService.checkAndUpdateExpiredTrials();
        console.log(`✅ Expired trials processed: ${expiredTrialsResult.processed || 0}`);
        
        // ✅ REMOVED: generateBillingForTrialTenants() - handled by endpoint /billing/validate-all (VPS cron)
        // This prevents double notification H-0
        
        console.log('✅ Daily Trial Management completed successfully');
        
    } catch (error) {
        console.error('❌ Daily Trial Management failed:', error.message);
    }
}, {
    timezone: 'Asia/Jakarta'
});

/**
 * Daily Subscription Management (2:00 AM WIB)
 * - Check expired subscriptions and downgrade to NotaFree
 * - Note: Billing generation (H-7) handled by endpoint /billing/validate-all (VPS cron)
 */
cron.schedule('0 2 * * *', async () => {
    console.log('\n🔄 [2:00 AM] Running Daily Subscription Management...');
    
    try {
        // Check and update expired subscriptions (downgrade to NotaFree)
        console.log('📋 Checking expired subscriptions and downgrading to NotaFree...');
        const expiredSubsResult = await BillingService.checkAndUpdateExpiredSubscriptions();
        console.log(`✅ Expired subscriptions processed: ${expiredSubsResult.processed || 0}`);
        
        // ✅ REMOVED: generateBillingForExpiringSubscriptions() - handled by endpoint /billing/validate-all (VPS cron)
        // This prevents double notification
        
        console.log('✅ Daily Subscription Management completed successfully');
        
    } catch (error) {
        console.error('❌ Daily Subscription Management failed:', error.message);
    }
}, {
    timezone: 'Asia/Jakarta'
});

/**
 * Daily Overdue Billing Check (3:00 AM WIB)
 * - Downgrade tenants with overdue billing to NotaFree (instead of suspending)
 */
cron.schedule('0 3 * * *', async () => {
    console.log('\n🔄 [3:00 AM] Running Daily Overdue Billing Check...');
    
    try {
        // Downgrade tenants with overdue billing to NotaFree
        console.log('🔄 Step 1: Downgrading tenants with overdue billing to NotaFree...');
        const downgradeResult = await TenantService.suspendOverdueTenants();
        console.log(`✅ Tenants downgraded to NotaFree: ${downgradeResult.downgraded || 0}`);
        console.log(`❌ Errors: ${downgradeResult.errors || 0}`);
        
        console.log('✅ Daily Overdue Billing Check completed successfully');
        
    } catch (error) {
        console.error('❌ Daily Overdue Billing Check failed:', error.message);
    }
}, {
    timezone: 'Asia/Jakarta'
});

/**
 * Daily Membership Expiration Check (4:00 AM WIB)
 * - Check and update expired customer memberships
 */
cron.schedule('0 4 * * *', async () => {
    console.log('\n🔄 [4:00 AM] Running Daily Membership Expiration Check...');
    
    try {
        console.log('📋 Checking expired customer memberships...');
        const expiredResult = await CustomerMembershipService.checkAndUpdateExpiredMemberships();
        console.log(`✅ Expired memberships processed: ${expiredResult.processed || 0}`);
        
        if (expiredResult.results) {
            const success = expiredResult.results.filter(r => r.action === 'expired').length;
            const errors = expiredResult.results.filter(r => r.action === 'error').length;
            console.log(`📊 Details: ${success} expired, ${errors} errors`);
        }
        
        console.log('✅ Daily Membership Expiration Check completed successfully');
        
    } catch (error) {
        console.error('❌ Daily Membership Expiration Check failed:', error.message);
    }
}, {
    timezone: 'Asia/Jakarta'
});

/**
 * Monthly AI Credit Grant (2:00 AM, 1st of every month)
 * - Grant free AI credits to all tenants based on ai_tier
 *   FREE: +50, BASIC: +200, PREMIUM: +999999
 */
cron.schedule('0 2 1 * *', async () => {
    console.log('\n🔄 [2:00 AM 1st] Running Monthly AI Credit Grant...');
    
    try {
        console.log('📋 Granting monthly AI credits to all tenants...');
        const result = await AiCreditService.processMonthlyGrants();
        console.log(`✅ Tenants processed: ${result.processed}`);
        console.log(`❌ Errors: ${result.errors.length}`);
        
        if (result.errors.length > 0) {
            for (const err of result.errors) {
                console.log(`  ❌ Tenant #${err.tenantId}: ${err.error}`);
            }
        }
        
        console.log('✅ Monthly AI Credit Grant completed successfully');
        
    } catch (error) {
        console.error('❌ Monthly AI Credit Grant failed:', error.message);
    }
}, {
    timezone: 'Asia/Jakarta'
});

/**
 * Manual Testing Functions
 */
async function testTrialManagement() {
    console.log('\n🧪 Testing Trial Management...');
    try {
        const result = await BillingService.checkAndUpdateExpiredTrials();
        console.log('✅ Test completed:', result);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testBillingGeneration() {
    console.log('\n🧪 Testing Billing Generation...');
    console.log('ℹ️ Note: Billing generation handled by endpoint /billing/validate-all (VPS cron)');
    console.log('ℹ️ This test is deprecated - use endpoint instead');
    try {
        // ✅ REMOVED: generateBillingForTrialTenants() - handled by endpoint
        console.log('✅ Test skipped - billing generation handled by endpoint /billing/validate-all');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testOverdueSuspension() {
    console.log('\n🧪 Testing Overdue Suspension...');
    try {
        const result = await TenantService.suspendOverdueTenants();
        console.log('✅ Test completed:', result);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testMembershipExpiration() {
    console.log('\n🧪 Testing Membership Expiration...');
    try {
        const result = await CustomerMembershipService.checkAndUpdateExpiredMemberships();
        console.log('✅ Test completed:', result);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testExpiredSubscriptions() {
    console.log('\n🧪 Testing Expired Subscriptions (H+1 downgrade to NotaFree)...');
    try {
        const result = await BillingService.checkAndUpdateExpiredSubscriptions();
        console.log('✅ Test completed:', result);
        console.log('📊 Results:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
}

async function testAiCreditGrant() {
    console.log('\n🧪 Testing Monthly AI Credit Grant...');
    try {
        const result = await AiCreditService.processMonthlyGrants();
        console.log('✅ Test completed:');
        console.log(`  Processed: ${result.processed}`);
        console.log(`  Errors: ${result.errors.length}`);
        if (result.errors.length > 0) {
            for (const err of result.errors) {
                console.log(`  ❌ Tenant #${err.tenantId}: ${err.error}`);
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
}

// Handle command line arguments for manual testing
const args = process.argv.slice(2);
if (args.length > 0) {
    const command = args[0];
    
    // Test database connection before running tests
    testDatabaseConnection().then(async (connected) => {
        if (!connected) {
            console.error('❌ Cannot proceed without database connection');
            process.exit(1);
        }
    
    switch (command) {
        case 'test-trial':
                await testTrialManagement();
                await sequelize.close();
                process.exit(0);
            break;
        case 'test-billing':
                await testBillingGeneration();
                await sequelize.close();
                process.exit(0);
            break;
        case 'test-overdue':
                await testOverdueSuspension();
                await sequelize.close();
                process.exit(0);
            break;
        case 'test-membership':
                await testMembershipExpiration();
                await sequelize.close();
                process.exit(0);
                break;
            case 'test-expired-subs':
                await testExpiredSubscriptions();
                await sequelize.close();
                process.exit(0);
            break;
        case 'test-ai-credit':
                await testAiCreditGrant();
                await sequelize.close();
                process.exit(0);
            break;
        case 'test-all':
            console.log('🧪 Running all tests...');
            await Promise.all([
                testTrialManagement(),
                // testBillingGeneration() - removed, handled by endpoint
                testOverdueSuspension(),
                testMembershipExpiration(),
                testExpiredSubscriptions()
            ]);
                console.log('✅ All tests completed');
            await sequelize.close();
                process.exit(0);
            break;
        default:
            console.log('Available commands:');
                console.log('  test-trial         - Test trial management');
                console.log('  test-billing       - Test billing generation');
                console.log('  test-overdue       - Test overdue billing (downgrade to NotaFree)');
                console.log('  test-membership    - Test membership expiration');
                console.log('  test-expired-subs  - Test expired subscriptions (H+1 downgrade)');
                console.log('  test-ai-credit     - Test monthly AI credit grant');
                console.log('  test-all           - Run all tests');
                await sequelize.close();
            process.exit(0);
    }
    }).catch((error) => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
} else {
    // Test database connection before starting cron jobs
    testDatabaseConnection().then(async (connected) => {
        if (!connected) {
            console.error('❌ Cannot start cron jobs without database connection');
            process.exit(1);
        }
        
    // Show scheduled jobs
    console.log('📅 Scheduled Jobs:');
        console.log('  - Daily Trial Management: 1:00 AM WIB (expired trials → NotaFree)');
        console.log('  - Daily Subscription Management: 2:00 AM WIB (expired subscriptions → NotaFree)');
        console.log('  - Daily Overdue Billing Check: 3:00 AM WIB (overdue billing → NotaFree)');
    console.log('  - Daily Membership Expiration Check: 4:00 AM WIB');
    console.log('  - Monthly AI Credit Grant: 2:00 AM WIB (1st of month)');
        console.log('');
        console.log('ℹ️ Note: Billing generation (H-1, H-7) and reminders (H-3, H-1, H-0)');
        console.log('   handled by endpoint /billing/validate-all (VPS cron)');
    console.log('');
    console.log('⏳ Cron jobs are running... Press Ctrl+C to stop');
    console.log('');
    console.log('💡 Manual Testing:');
        console.log('  node cronBilling.js test-trial         - Test trial management');
        console.log('  node cronBilling.js test-billing       - Test billing generation');
        console.log('  node cronBilling.js test-overdue       - Test overdue billing (downgrade to NotaFree)');
        console.log('  node cronBilling.js test-membership    - Test membership expiration');
        console.log('  node cronBilling.js test-expired-subs  - Test expired subscriptions (H+1 downgrade)');
        console.log('  node cronBilling.js test-ai-credit     - Test monthly AI credit grant');
        console.log('  node cronBilling.js test-all           - Run all tests');
    }).catch((error) => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
