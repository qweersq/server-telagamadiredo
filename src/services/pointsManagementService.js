const PointService = require('./pointService');
const PointTransactionRepository = require('../repositories/pointTransactionRepository');
const MembershipTierService = require('./membershipTierService');
const { Customer, Order, Payment, PointTransaction, Op } = require('../models');
const { sequelize } = require('../models');

class PointsManagementService {
    /**
     * Recalculate points for customer(s)
     * @param {number} tenant_id - Tenant ID
     * @param {Array<number>} customer_ids - Array of customer IDs (empty = all customers)
     * @param {number} user_id - User ID who performs the action
     * @returns {Object} Summary of recalculation
     */
    static async recalculatePoints(tenant_id, customer_ids = [], user_id = null) {
        try {
            // Get point config (fresh from database, no cache)
            const pointConfig = await PointService.getPointConfig(tenant_id);
            console.log(`📊 PointsManagementService.recalculatePoints - Using point config for tenant ${tenant_id}:`, {
                earn_rate: pointConfig.earn_rate,
                redeem_rate: pointConfig.redeem_rate,
                min_redeem: pointConfig.min_redeem,
                enabled: pointConfig.enabled
            });

            // Build customer where clause
            const customerWhere = {
                tenant_id: tenant_id,
                deletedAt: null
            };
            
            if (customer_ids.length > 0) {
                customerWhere.id = { [Op.in]: customer_ids };
            }

            // Get total count first (without transaction to avoid long lock)
            const totalCustomers = await Customer.count({
                where: customerWhere
            });

            if (totalCustomers === 0) {
                throw new Error('No customers found');
            }

            let totalRecalculated = 0;
            let totalPointsAdded = 0;
            const results = [];
            const batchSize = 50; // Process 50 customers per batch
            let processedCount = 0;

            // Process customers in batches
            for (let offset = 0; offset < totalCustomers; offset += batchSize) {
                // Get batch of customers (without transaction to avoid long lock)
                const customers = await Customer.findAll({
                    where: customerWhere,
                    limit: batchSize,
                    offset: offset,
                    order: [['id', 'ASC']]
                });

                // Process each customer in this batch
                for (const customer of customers) {
                    const batchTransaction = await sequelize.transaction();
                    try {
                        // STEP 1: RESET - Soft delete ALL existing PointTransactions for this customer
                        const deletedCount = await PointTransaction.destroy({
                            where: {
                                customer_id: customer.id,
                                deletedAt: null
                            },
                            transaction: batchTransaction
                        });
                        console.log(`🗑️ Soft deleted ${deletedCount} point transactions for customer ${customer.id}`);

                        // STEP 2: RESET - Reset customer points and lifetime_points to 0 first
                        const customerToReset = await Customer.findByPk(customer.id, { transaction: batchTransaction });
                        const oldPoints = customerToReset.points || 0;
                        const oldLifetimePoints = customerToReset.lifetime_points || 0;
                        
                        await customerToReset.update({
                            points: 0,
                            lifetime_points: 0
                        }, { transaction: batchTransaction });
                        console.log(`🔄 Reset points to 0 for customer ${customer.id} (old: ${oldPoints} points, ${oldLifetimePoints} lifetime)`);

                        // STEP 3: RECALCULATE - Get all paid orders for this customer (pure calculation from orders)
                        const paidOrders = await Order.findAll({
                            where: {
                                customer_id: customer.id,
                                tenant_id: tenant_id,
                                deletedAt: null
                            },
                            include: [{
                                model: Payment,
                                as: 'payment',
                                where: {
                                    status: 'paid',
                                    paid_amount: { [Op.gt]: 0 },
                                    deletedAt: null
                                },
                                required: true
                            }],
                            transaction: batchTransaction,
                            order: [['id', 'ASC']] // Process in order
                        });

                        // STEP 4: RECALCULATE - Calculate points from all paid orders and create PointTransaction for each
                        let totalPoints = 0;
                        let totalLifetimePoints = 0;
                        
                        for (const order of paidOrders) {
                            const paidAmount = parseFloat(order.payment.paid_amount || 0);
                            const pointsFromOrder = Math.floor(paidAmount / pointConfig.earn_rate);
                            
                            if (pointsFromOrder > 0) {
                                // Calculate expiration date: 1 year from order payment date
                                const expiresAt = new Date(order.payment.updatedAt || order.payment.createdAt || new Date());
                                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                                const expiresAtDateOnly = expiresAt.toISOString().split('T')[0];

                                // Create PointTransaction for this order
                                await PointTransactionRepository.create({
                                    customer_id: customer.id,
                                    order_id: order.id,
                                    type: 'earn',
                                    points: pointsFromOrder,
                                    description: `Earned ${pointsFromOrder} points from order #${order.id} (paid: Rp ${paidAmount.toLocaleString('id-ID')})`,
                                    expires_at: expiresAtDateOnly
                                }, batchTransaction);

                                totalPoints += pointsFromOrder;
                                totalLifetimePoints += pointsFromOrder;
                            }
                        }

                        // STEP 5: RECALCULATE - Update customer points and lifetime_points with calculated values
                        const customerToUpdate = await Customer.findByPk(customer.id, { transaction: batchTransaction });
                        await customerToUpdate.update({
                            points: totalPoints,
                            lifetime_points: totalLifetimePoints
                        }, { transaction: batchTransaction });
                        console.log(`✅ Recalculated points for customer ${customer.id}: ${totalPoints} points (${totalLifetimePoints} lifetime) from ${paidOrders.length} paid orders`);

                        // STEP 6: Update tier membership based on new lifetime_points
                        try {
                            await MembershipTierService.upgradeTier(
                            customer.id,
                            tenant_id,
                                batchTransaction
                            );
                            console.log(`✅ Updated tier for customer ${customer.id}`);
                        } catch (tierError) {
                            console.error(`⚠️ Error updating tier for customer ${customer.id}:`, tierError.message);
                            // Non-critical, continue
                        }

                            totalRecalculated++;
                        totalPointsAdded += (totalPoints - oldPoints);

                            results.push({
                                customer_id: customer.id,
                                customer_name: customer.name,
                            old_points: oldPoints,
                            new_points: totalPoints,
                            old_lifetime_points: oldLifetimePoints,
                            new_lifetime_points: totalLifetimePoints,
                            points_difference: totalPoints - oldPoints,
                            paid_orders_count: paidOrders.length
                            });

                        await batchTransaction.commit();
                        processedCount++;
                        
                        // Log progress every 50 customers
                        if (processedCount % 50 === 0) {
                            console.log(`📊 Recalculate progress: ${processedCount}/${totalCustomers} customers processed`);
                        }
                    } catch (error) {
                        await batchTransaction.rollback();
                        console.error(`Error recalculating points for customer ${customer.id}:`, error);
                        // Continue with other customers
                    }
                }
            }

            return {
                success: true,
                total_customers: totalCustomers,
                total_recalculated: totalRecalculated,
                total_points_added: totalPointsAdded,
                results: results.slice(0, 100) // Limit results to first 100 to avoid large response
            };
        } catch (error) {
            console.error('Error in recalculatePoints:', error);
            throw error;
        }
    }

    /**
     * Reset points for customer(s)
     * @param {number} tenant_id - Tenant ID
     * @param {Array<number>} customer_ids - Array of customer IDs (empty = all customers)
     * @param {Object} options - Reset options
     * @param {boolean} options.reset_points - Reset points field (default: true)
     * @param {boolean} options.reset_lifetime_points - Reset lifetime_points field (default: false)
     * @param {number} options.reset_to_value - Reset to this value (default: 0)
     * @param {number} user_id - User ID who performs the action
     * @returns {Object} Summary of reset
     */
    static async resetPoints(tenant_id, customer_ids = [], options = {}, user_id = null) {
        const transaction = await sequelize.transaction();
        try {
            const {
                reset_points = true,
                reset_lifetime_points = false,
                reset_to_value = 0
            } = options;

            // Build customer where clause
            const customerWhere = {
                tenant_id: tenant_id,
                deletedAt: null
            };
            
            if (customer_ids.length > 0) {
                customerWhere.id = { [Op.in]: customer_ids };
            }

            // Get customers
            const customers = await Customer.findAll({
                where: customerWhere,
                transaction
            });

            if (customers.length === 0) {
                throw new Error('No customers found');
            }

            let totalReset = 0;
            const results = [];

            // Process each customer
            for (const customer of customers) {
                try {
                    const oldPoints = customer.points || 0;
                    const oldLifetimePoints = customer.lifetime_points || 0;

                    // 1. Soft delete ALL existing PointTransactions for this customer
                    const deletedCount = await PointTransaction.destroy({
                        where: {
                            customer_id: customer.id,
                            deletedAt: null
                        },
                        transaction
                    });
                    console.log(`🗑️ Soft deleted ${deletedCount} point transactions for customer ${customer.id}`);

                    // 2. Update customer points and lifetime_points
                    const updateData = {};
                    if (reset_points) {
                        updateData.points = reset_to_value;
                    }
                    if (reset_lifetime_points) {
                        updateData.lifetime_points = reset_to_value;
                    }

                    await customer.update(updateData, { transaction });

                    // 3. Reset tier membership (set to null/initial tier)
                    // If lifetime_points is reset to 0, customer should not have any tier
                    const newLifetimePoints = reset_lifetime_points ? reset_to_value : oldLifetimePoints;
                    if (newLifetimePoints === 0 || (reset_lifetime_points && reset_to_value === 0)) {
                        // Reset customer's current_membership_id to null (back to initial tier)
                        await customer.update({
                            current_membership_id: null
                        }, { transaction });
                        console.log(`🔄 Reset tier for customer ${customer.id} (lifetime_points = 0)`);
                    } else {
                        // Update tier based on new lifetime_points
                        try {
                            await MembershipTierService.upgradeTier(
                                customer.id,
                                tenant_id,
                                transaction
                            );
                            console.log(`✅ Updated tier for customer ${customer.id}`);
                        } catch (tierError) {
                            console.error(`⚠️ Error updating tier for customer ${customer.id}:`, tierError.message);
                            // Non-critical, continue
                        }
                    }

                    totalReset++;
                    results.push({
                        customer_id: customer.id,
                        customer_name: customer.name,
                        old_points: oldPoints,
                        new_points: reset_points ? reset_to_value : oldPoints,
                        old_lifetime_points: oldLifetimePoints,
                        new_lifetime_points: reset_lifetime_points ? reset_to_value : oldLifetimePoints
                    });
                } catch (error) {
                    console.error(`Error resetting points for customer ${customer.id}:`, error);
                    // Continue with other customers
                }
            }

            await transaction.commit();

            return {
                success: true,
                total_customers: customers.length,
                total_reset: totalReset,
                results: results
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = PointsManagementService;

