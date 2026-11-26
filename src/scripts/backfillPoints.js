/**
 * Backfill Points Script
 * Recalculate points for existing orders that were created before points system was implemented
 * 
 * Usage: node src/scripts/backfillPoints.js [--dry-run] [--tenant-id=ID]
 */

require('dotenv').config();
const { sequelize, Order, Payment, Customer, PointTransaction, Op } = require('../models');
const PointService = require('../services/pointService');

async function backfillPoints(options = {}) {
    const { dryRun = false, tenantId = null } = options;
    const transaction = await sequelize.transaction();

    try {
        console.log('🔄 Starting points backfill...');
        if (dryRun) {
            console.log('⚠️  DRY RUN MODE - No changes will be made');
        }

        // Build where clause
        const whereClause = {
            deletedAt: null
        };
        if (tenantId) {
            whereClause.tenant_id = tenantId;
        }

        // Get all paid orders
        const paidOrders = await Order.findAll({
            where: whereClause,
            include: [
                {
                    model: Payment,
                    as: 'payment',
                    where: {
                        status: 'paid',
                        deletedAt: null
                    },
                    required: true,
                    attributes: ['id', 'paid_amount', 'final_price']
                }
            ],
            order: [['entry_date', 'ASC'], ['createdAt', 'ASC']], // Process oldest first
            transaction
        });

        console.log(`📊 Found ${paidOrders.length} paid orders to process`);

        const stats = {
            processed: 0,
            skipped: 0,
            errors: 0,
            totalPoints: 0,
            customersUpdated: new Set()
        };

        // Group orders by customer to track first order
        const customerFirstOrder = {};
        const customerOrders = {};

        // First pass: identify first order per customer
        for (const order of paidOrders) {
            const customerId = order.customer_id;
            if (!customerFirstOrder[customerId]) {
                customerFirstOrder[customerId] = order.id;
            }
            if (!customerOrders[customerId]) {
                customerOrders[customerId] = [];
            }
            customerOrders[customerId].push(order);
        }

        // Second pass: process each order
        for (const order of paidOrders) {
            try {
                const customerId = order.customer_id;
                // Use paid_amount (actual amount paid), fallback to final_price if paid_amount is 0 or null
                // Priority: paid_amount > final_price > 0
                let paidAmount = parseFloat(order.payment?.paid_amount || 0);
                if (paidAmount <= 0) {
                    paidAmount = parseFloat(order.payment?.final_price || 0);
                }

                if (paidAmount <= 0) {
                    console.log(`⚠️  Skipping order ${order.id} - invalid paid amount (paid: ${order.payment?.paid_amount}, final: ${order.payment?.final_price})`);
                    stats.skipped++;
                    continue;
                }

                // Check if points already exist for this order
                const existingTransaction = await PointTransaction.findOne({
                    where: {
                        order_id: order.id,
                        type: 'earn',
                        customer_id: customerId
                    },
                    transaction
                });

                if (existingTransaction) {
                    if (stats.processed % 1000 === 0 || stats.processed < 10) {
                        console.log(`⏭️  Skipping order ${order.id} - points already exist`);
                    }
                    stats.skipped++;
                    continue;
                }

                // Calculate points: 1 poin = Rp 1.000
                const points = Math.floor(paidAmount / 1000);

                if (points <= 0) {
                    console.log(`⚠️  Skipping order ${order.id} - no points earned (paid: ${paidAmount})`);
                    stats.skipped++;
                    continue;
                }

                if (!dryRun) {
                    // Earn points (this will update customer and create transaction)
                    // Note: earnPoints uses paid_amount to calculate: Math.floor(paid_amount / 1000)
                    await PointService.earnPoints(
                        customerId,
                        paidAmount,
                        order.id,
                        transaction,
                        `Backfill: Earned ${points} points from order #${order.id} (Rp ${paidAmount.toLocaleString('id-ID')})`
                    );
                    
                    // Log only for first few or every 1000 orders to reduce noise
                    if (stats.processed < 10 || stats.processed % 1000 === 0) {
                        console.log(`✅ Order ${order.id}: Earned ${points} points from Rp ${paidAmount.toLocaleString('id-ID')}`);
                    }

                    // Check if this is first order (for bonus points)
                    if (customerFirstOrder[customerId] === order.id) {
                        // Check if first order bonus already exists
                        const existingFirstOrderBonus = await PointTransaction.findOne({
                            where: {
                                customer_id: customerId,
                                type: 'bonus',
                                description: { [Op.like]: '%first order%' }
                            },
                            transaction
                        });

                        if (!existingFirstOrderBonus) {
                            // Add first order bonus: 10 points (sesuai dengan orderService.js line 187)
                            const bonusPoints = 10;
                            const customer = await Customer.findByPk(customerId, { transaction });
                            if (customer) {
                                await customer.update({
                                    points: (customer.points || 0) + bonusPoints,
                                    lifetime_points: (customer.lifetime_points || 0) + bonusPoints
                                }, { transaction });

                                await PointTransaction.create({
                                    customer_id: customerId,
                                    order_id: order.id,
                                    type: 'bonus',
                                    points: bonusPoints,
                                    description: `Backfill: First order bonus - ${bonusPoints} points`,
                                    expires_at: null // Bonus points don't expire
                                }, { transaction });

                                console.log(`🎁 Added first order bonus: ${bonusPoints} points for customer ${customerId}`);
                            }
                        }
                    }

                    // Check for referral bonus
                    if (order.referred_by) {
                        // Check if referral bonus already exists for this order
                        const existingReferralBonus = await PointTransaction.findOne({
                            where: {
                                customer_id: order.referred_by,
                                order_id: order.id,
                                type: 'bonus',
                                description: { [Op.like]: '%referral%' }
                            },
                            transaction
                        });

                        if (!existingReferralBonus) {
                            // Add referral bonus: 20 points to referrer (sesuai dengan orderService.js line 207)
                            const referralBonusPoints = 20;
                            const referrer = await Customer.findByPk(order.referred_by, { transaction });
                            if (referrer) {
                                await referrer.update({
                                    points: (referrer.points || 0) + referralBonusPoints,
                                    lifetime_points: (referrer.lifetime_points || 0) + referralBonusPoints
                                }, { transaction });

                                await PointTransaction.create({
                                    customer_id: order.referred_by,
                                    order_id: order.id,
                                    type: 'bonus',
                                    points: referralBonusPoints,
                                    description: `Backfill: Referral bonus - ${referralBonusPoints} points for referring order #${order.id}`,
                                    expires_at: null // Bonus points don't expire
                                }, { transaction });

                                console.log(`🎁 Added referral bonus: ${referralBonusPoints} points for referrer ${order.referred_by}`);
                            }
                        }
                    }
                }

                // Count even in dry-run mode for stats
                stats.processed++;
                stats.totalPoints += points;
                stats.customersUpdated.add(customerId);

                if (stats.processed % 100 === 0) {
                    const avgPoints = stats.totalPoints / stats.processed;
                    console.log(`✅ Processed ${stats.processed} orders... (${stats.totalPoints.toLocaleString('id-ID')} total points, avg: ${avgPoints.toFixed(1)} points/order)`);
                }
            } catch (error) {
                console.error(`❌ Error processing order ${order.id}:`, error.message);
                stats.errors++;
            }
        }

        if (!dryRun) {
            await transaction.commit();
            console.log('✅ Transaction committed');
        } else {
            await transaction.rollback();
            console.log('⚠️  Transaction rolled back (dry run)');
        }

        console.log('\n📊 Backfill Summary:');
        console.log(`   Total Orders Found: ${paidOrders.length}`);
        console.log(`   Processed: ${stats.processed} orders`);
        console.log(`   Skipped: ${stats.skipped} orders (${stats.skipped - stats.errors} invalid amounts, ${stats.errors} errors)`);
        console.log(`   Errors: ${stats.errors} orders`);
        console.log(`   Total Points: ${stats.totalPoints.toLocaleString('id-ID')} poin`);
        if (stats.processed > 0) {
            const avgPoints = (stats.totalPoints / stats.processed).toFixed(2);
            const avgAmountRupiah = Math.round(stats.totalPoints * 1000 / stats.processed);
            console.log(`   Average: ${avgPoints} poin per order (≈ Rp ${avgAmountRupiah.toLocaleString('id-ID')} per order)`);
        }
        console.log(`   Customers Updated: ${stats.customersUpdated.size}`);

        return stats;
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Backfill failed:', error);
        throw error;
    }
}

// CLI execution
if (require.main === module) {
    (async () => {
        try {
            // Test database connection
            await sequelize.authenticate();
            console.log('✅ Database connection established');

            const args = process.argv.slice(2);
            const options = {
                dryRun: args.includes('--dry-run'),
                tenantId: args.find(arg => arg.startsWith('--tenant-id='))?.split('=')[1] || null
            };

            await backfillPoints(options);
            console.log('✅ Backfill completed');
            
            // Close database connection
            await sequelize.close();
            process.exit(0);
        } catch (error) {
            console.error('❌ Backfill failed:', error);
            console.error(error.stack);
            await sequelize.close();
            process.exit(1);
        }
    })();
}

module.exports = { backfillPoints };
