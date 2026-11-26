const PointTransactionRepository = require('../repositories/pointTransactionRepository');
const CustomerRepository = require('../repositories/customerRepository');
const TenantRepository = require('../repositories/tenantRepository');
const { Customer, Op } = require('../models');

class PointService {
    /**
     * Get point configuration from tenant settings
     * @param {number} tenant_id - Tenant ID
     * @returns {Object} Point configuration
     */
    static async getPointConfig(tenant_id) {
        try {
            // Reload tenant with fresh query to get latest settings (no cache)
            const { Tenant } = require('../models');
            const tenant = await Tenant.findByPk(tenant_id, {
                attributes: ['id', 'settings'], // Only get what we need
                raw: false // Get Sequelize instance to handle JSON properly
            });
            
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Default values
            const defaultConfig = {
                enabled: false,
                earn_rate: 1000,      // 1 poin per Rp 1.000
                redeem_rate: 50,      // 1 poin = Rp 50 (100 poin = Rp 5.000)
                min_redeem: 100,      // Minimum redeem
                referral_bonus_referrer: 10,      // Poin untuk referrer
                referral_bonus_new_customer: 10,   // Poin untuk customer baru yang direfer
                first_order_bonus: 10,             // Poin untuk customer baru yang order pertama tanpa referral
                first_order_bonus_enabled: true    // Enable/disable first order bonus
            };

            // Get points settings from tenant.settings.points
            // Handle both string (JSON) and object formats
            let currentSettings = {};
            if (tenant.settings) {
                if (typeof tenant.settings === 'string') {
                    currentSettings = JSON.parse(tenant.settings);
                } else {
                    currentSettings = tenant.settings;
                }
            }
            
            const pointsSettings = currentSettings.points || {};

            // Merge with defaults - use explicit values, not || operator to handle 0 values
            const config = {
                enabled: pointsSettings.enabled !== undefined ? Boolean(pointsSettings.enabled) : defaultConfig.enabled,
                earn_rate: pointsSettings.earn_rate !== undefined ? Number(pointsSettings.earn_rate) : defaultConfig.earn_rate,
                redeem_rate: pointsSettings.redeem_rate !== undefined ? Number(pointsSettings.redeem_rate) : defaultConfig.redeem_rate,
                min_redeem: pointsSettings.min_redeem !== undefined ? Number(pointsSettings.min_redeem) : defaultConfig.min_redeem,
                referral_bonus_referrer: pointsSettings.referral_bonus_referrer !== undefined ? Number(pointsSettings.referral_bonus_referrer) : defaultConfig.referral_bonus_referrer,
                referral_bonus_new_customer: pointsSettings.referral_bonus_new_customer !== undefined ? Number(pointsSettings.referral_bonus_new_customer) : defaultConfig.referral_bonus_new_customer,
                first_order_bonus: pointsSettings.first_order_bonus !== undefined ? Number(pointsSettings.first_order_bonus) : (pointsSettings.referral_bonus_new_customer !== undefined ? Number(pointsSettings.referral_bonus_new_customer) : defaultConfig.first_order_bonus), // Backward compatibility: use referral_bonus_new_customer if first_order_bonus not set
                first_order_bonus_enabled: pointsSettings.first_order_bonus_enabled !== undefined ? Boolean(pointsSettings.first_order_bonus_enabled) : defaultConfig.first_order_bonus_enabled
            };

            console.log(`📊 PointService.getPointConfig - Tenant ${tenant_id} config:`, config);
            
            return config;
        } catch (error) {
            console.error('Error getting point config:', error);
            // Return default config if error
            return {
                enabled: false,
                earn_rate: 1000,
                redeem_rate: 50,
                min_redeem: 100,
                referral_bonus_referrer: 10,
                referral_bonus_new_customer: 10,
                first_order_bonus: 10,
                first_order_bonus_enabled: true
            };
        }
    }
    /**
     * Earn points from transaction
     * @param {number} customer_id - Customer ID
     * @param {number} paid_amount - Amount paid (in Rupiah)
     * @param {number} order_id - Order ID (optional)
     * @param {object} transaction - Sequelize transaction (optional)
     * @param {string} description - Description (optional)
     */
    static async earnPoints(customer_id, paid_amount, order_id = null, transaction = null, description = null, tenant_id = null) {
        try {
            // Get customer first to get tenant_id
            const customer = await Customer.findByPk(customer_id, { transaction });
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get point config from tenant settings
            const pointConfig = await this.getPointConfig(tenant_id || customer.tenant_id);

            // Calculate points using config earn_rate
            const points = Math.floor(paid_amount / pointConfig.earn_rate);
            
            if (points <= 0) {
                console.log('⚠️ PointService.earnPoints - No points earned (amount too small)');
                return { points: 0, message: 'No points earned' };
            }

            // Update customer points
            const newPoints = (customer.points || 0) + points;
            const newLifetimePoints = (customer.lifetime_points || 0) + points;

            await customer.update({
                points: newPoints,
                lifetime_points: newLifetimePoints
            }, { transaction });

            // Calculate expiration date: 1 year from now
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            const expiresAtDateOnly = expiresAt.toISOString().split('T')[0]; // Format: YYYY-MM-DD

            // Create point transaction record
            await PointTransactionRepository.create({
                customer_id,
                order_id,
                type: 'earn',
                points: points,
                description: description || `Earned ${points} points from transaction Rp ${paid_amount.toLocaleString('id-ID')}`,
                expires_at: expiresAtDateOnly // Set expiration 1 year from now
            }, transaction);

            console.log(`✅ PointService.earnPoints - Customer ${customer_id} earned ${points} points (Total: ${newPoints}, Lifetime: ${newLifetimePoints})`);

            return {
                points,
                total_points: newPoints,
                lifetime_points: newLifetimePoints
            };
        } catch (error) {
            throw new Error(`Failed to earn points: ${error.message}`);
        }
    }

    /**
     * Redeem points for discount
     * @param {number} customer_id - Customer ID
     * @param {number} points_to_redeem - Points to redeem (min 100)
     * @param {number} order_id - Order ID (optional)
     * @param {object} transaction - Sequelize transaction (optional)
     * @param {string} description - Description (optional)
     */
    static async redeemPoints(customer_id, points_to_redeem, order_id = null, transaction = null, description = null, tenant_id = null) {
        try {
            // Get customer first to get tenant_id
            const customer = await Customer.findByPk(customer_id, { transaction });
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get point config from tenant settings
            const pointConfig = await this.getPointConfig(tenant_id || customer.tenant_id);

            // Validate minimum points using config
            if (points_to_redeem < pointConfig.min_redeem) {
                throw new Error(`Minimum redeem is ${pointConfig.min_redeem} points`);
            }

            // Validate points available
            const currentPoints = customer.points || 0;
            if (currentPoints < points_to_redeem) {
                throw new Error(`Insufficient points. Available: ${currentPoints}, Required: ${points_to_redeem}`);
            }

            // Calculate discount using config redeem_rate: (points / 100) * (redeem_rate * 100)
            // redeem_rate is per point, so 100 points = redeem_rate * 100
            const discountAmount = Math.floor((points_to_redeem / 100) * (pointConfig.redeem_rate * 100));

            // Update customer points (decrease, but lifetime_points stays)
            const newPoints = currentPoints - points_to_redeem;
            await customer.update({
                points: newPoints
            }, { transaction });

            // Create point transaction record (negative points)
            await PointTransactionRepository.create({
                customer_id,
                order_id,
                type: 'redeem',
                points: -points_to_redeem, // Negative for redeem
                description: description || `Redeemed ${points_to_redeem} points for Rp ${discountAmount.toLocaleString('id-ID')} discount`
            }, transaction);

            console.log(`✅ PointService.redeemPoints - Customer ${customer_id} redeemed ${points_to_redeem} points (Remaining: ${newPoints}, Discount: Rp ${discountAmount})`);

            return {
                points_redeemed: points_to_redeem,
                discount_amount: discountAmount,
                remaining_points: newPoints
            };
        } catch (error) {
            throw new Error(`Failed to redeem points: ${error.message}`);
        }
    }

    /**
     * Get customer points
     * @param {number} customer_id - Customer ID
     * @param {number} user_tenant_id - User tenant ID for validation
     */
    static async getCustomerPoints(customer_id, user_tenant_id = null) {
        try {
            const customer = await Customer.findByPk(customer_id);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Validate tenant access
            if (user_tenant_id && customer.tenant_id !== user_tenant_id) {
                throw new Error('Access denied');
            }

            return {
                points: customer.points || 0,
                lifetime_points: customer.lifetime_points || 0
            };
        } catch (error) {
            throw new Error(`Failed to get customer points: ${error.message}`);
        }
    }

    /**
     * Validate if customer has enough points
     * @param {number} customer_id - Customer ID
     * @param {number} points_to_redeem - Points to redeem
     * @param {number} user_tenant_id - User tenant ID for validation
     */
    static async validatePoints(customer_id, points_to_redeem, user_tenant_id = null) {
        try {
            const customer = await Customer.findByPk(customer_id);
            if (!customer) {
                return {
                    valid: false,
                    message: 'Customer not found'
                };
            }

            // Validate tenant access
            if (user_tenant_id && customer.tenant_id !== user_tenant_id) {
                return {
                    valid: false,
                    message: 'Access denied'
                };
            }

            // Get point config from tenant settings
            const pointConfig = await this.getPointConfig(user_tenant_id || customer.tenant_id);

            // Validate minimum points using config
            if (points_to_redeem < pointConfig.min_redeem) {
                return {
                    valid: false,
                    message: `Minimum redeem is ${pointConfig.min_redeem} points`
                };
            }

            const currentPoints = customer.points || 0;
            if (currentPoints < points_to_redeem) {
                return {
                    valid: false,
                    message: `Insufficient points. Available: ${currentPoints}, Required: ${points_to_redeem}`
                };
            }

            return {
                valid: true,
                available_points: currentPoints
            };
        } catch (error) {
            return {
                valid: false,
                message: error.message
            };
        }
    }

    /**
     * Get point transaction history
     * @param {number} customer_id - Customer ID
     * @param {number} user_tenant_id - User tenant ID
     * @param {number} user_branch_id - User branch ID
     * @param {string} user_role - User role
     * @param {number} page - Page number
     * @param {number} limit - Limit per page
     * @param {number} order_id - Optional order ID to filter transactions
     */
    static async getPointHistory(customer_id, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, order_id = null) {
        try {
            return await PointTransactionRepository.getByCustomerId(
                customer_id,
                user_tenant_id,
                user_branch_id,
                user_role,
                page,
                limit,
                order_id // ✅ Pass order_id to repository
            );
        } catch (error) {
            throw new Error(`Failed to get point history: ${error.message}`);
        }
    }

    /**
     * Manual adjustment of customer points (admin only)
     * @param {number} customer_id - Customer ID
     * @param {number} points - Points to adjust (positive = add, negative = subtract)
     * @param {string} description - Description for the adjustment
     * @param {number} user_tenant_id - User tenant ID for validation
     * @param {object} transaction - Sequelize transaction (optional)
     */
    static async adjustPoints(customer_id, points, description, user_tenant_id = null, transaction = null) {
        try {
            if (!points || points === 0) {
                throw new Error('Points adjustment must not be zero');
            }

            // Get customer
            const customer = await Customer.findByPk(customer_id, { transaction });
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Validate tenant access
            if (user_tenant_id && customer.tenant_id !== user_tenant_id) {
                throw new Error('Access denied');
            }

            const currentPoints = customer.points || 0;
            const currentLifetimePoints = customer.lifetime_points || 0;

            // Calculate new points
            const newPoints = Math.max(0, currentPoints + points); // Prevent negative points
            const newLifetimePoints = Math.max(0, currentLifetimePoints + (points > 0 ? points : 0)); // Only add to lifetime if positive

            // Update customer points
            await customer.update({
                points: newPoints,
                lifetime_points: newLifetimePoints
            }, { transaction });

            // Determine transaction type
            const transactionType = points > 0 ? 'bonus' : 'redeem'; // Use 'bonus' for manual addition, 'redeem' for manual deduction

            // Create point transaction record
            // Note: Manual adjustment doesn't expire (expires_at = null)
            await PointTransactionRepository.create({
                customer_id,
                order_id: null, // Manual adjustment has no order
                type: transactionType,
                points: points, // Can be positive or negative
                description: description || `Manual adjustment: ${points > 0 ? '+' : ''}${points} points`,
                expires_at: null // Manual adjustment doesn't expire
            }, transaction);

            console.log(`✅ PointService.adjustPoints - Customer ${customer_id} adjusted ${points > 0 ? '+' : ''}${points} points (Total: ${newPoints}, Lifetime: ${newLifetimePoints})`);

            return {
                points_adjusted: points,
                previous_points: currentPoints,
                new_points: newPoints,
                previous_lifetime_points: currentLifetimePoints,
                new_lifetime_points: newLifetimePoints
            };
        } catch (error) {
            throw new Error(`Failed to adjust points: ${error.message}`);
        }
    }

    /**
     * Expire points that have passed their expiration date
     * This method should be called by cron job daily
     * @returns {Object} Summary of expired points
     */
    static async expirePoints() {
        try {
            const { PointTransaction, Customer, Op } = require('../models');
            const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
            
            console.log(`🔄 PointService.expirePoints - Checking for expired points (expires_at <= ${today})...`);
            
            // Find all earned points that have expired but not yet processed
            const expiredEarnedPoints = await PointTransaction.findAll({
                where: {
                    type: 'earn',
                    expires_at: {
                        [Op.lte]: today,
                        [Op.ne]: null // Must have expiration date
                    },
                    deletedAt: null
                },
                include: [{
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'points', 'lifetime_points', 'tenant_id']
                }],
                order: [['expires_at', 'ASC'], ['createdAt', 'ASC']] // FIFO: oldest first
            });

            if (expiredEarnedPoints.length === 0) {
                console.log('ℹ️ PointService.expirePoints - No expired points found');
                return {
                    expired_count: 0,
                    total_points_expired: 0,
                    customers_affected: 0
                };
            }

            console.log(`🔍 PointService.expirePoints - Found ${expiredEarnedPoints.length} expired point transactions`);

            // Group by customer to batch updates
            const customerPointsMap = new Map();
            
            for (const pointTx of expiredEarnedPoints) {
                // Check if this point transaction has already been expired
                // Look for expire transaction that references this earned transaction
                const existingExpire = await PointTransaction.findOne({
                    where: {
                        customer_id: pointTx.customer_id,
                        type: 'expire',
                        description: {
                            [Op.like]: `%Expired from transaction #${pointTx.id}%`
                        },
                        deletedAt: null
                    }
                });

                // Skip if already expired
                if (existingExpire) {
                    console.log(`ℹ️ PointService.expirePoints - Transaction ${pointTx.id} already expired, skipping`);
                    continue;
                }
                
                // Also check if customer still has enough points to expire
                // (points might have been redeemed already)
                const customer = pointTx.customer;
                if (!customer) {
                    console.log(`⚠️ PointService.expirePoints - Customer ${pointTx.customer_id} not found, skipping transaction ${pointTx.id}`);
                    continue;
                }
                
                const currentPoints = customer.points || 0;
                if (currentPoints < pointTx.points) {
                    // Customer doesn't have enough points (might have been redeemed)
                    // Still create expire transaction but only expire available points
                    console.log(`⚠️ PointService.expirePoints - Customer ${pointTx.customer_id} has only ${currentPoints} points, but transaction ${pointTx.id} has ${pointTx.points} points. Expiring available points only.`);
                }

                const customerId = pointTx.customer_id;
                if (!customerPointsMap.has(customerId)) {
                    customerPointsMap.set(customerId, {
                        customer: pointTx.customer,
                        transactions: [],
                        totalPoints: 0
                    });
                }

                const customerData = customerPointsMap.get(customerId);
                customerData.transactions.push(pointTx);
                customerData.totalPoints += pointTx.points;
            }

            let expiredCount = 0;
            let totalPointsExpired = 0;
            const customersAffected = customerPointsMap.size;

            // Process each customer's expired points
            for (const [customerId, data] of customerPointsMap) {
                try {
                    // Reload customer to get latest points (in case of concurrent updates)
                    const customer = await Customer.findByPk(customerId);
                    if (!customer) {
                        console.log(`⚠️ PointService.expirePoints - Customer ${customerId} not found, skipping`);
                        continue;
                    }

                    let currentPoints = customer.points || 0;
                    let totalExpired = 0;
                    const transactionsToExpire = [];

                    // Process each transaction individually to handle partial expiration
                    for (const pointTx of data.transactions) {
                        // Check if customer still has enough points for this transaction
                        const pointsToExpire = Math.min(pointTx.points, currentPoints - totalExpired);
                        
                        if (pointsToExpire <= 0) {
                            // Customer doesn't have enough points left (might have been redeemed)
                            console.log(`⚠️ PointService.expirePoints - Customer ${customerId} doesn't have enough points for transaction ${pointTx.id} (has ${currentPoints}, need ${pointTx.points}), skipping`);
                            continue;
                        }

                        // Track transaction to expire
                        transactionsToExpire.push({
                            pointTx,
                            pointsToExpire
                        });

                        totalExpired += pointsToExpire;
                        currentPoints -= pointsToExpire; // Update for next iteration
                    }

                    // Update customer points once (batch update)
                    if (totalExpired > 0) {
                        const newPoints = Math.max(0, (customer.points || 0) - totalExpired);
                        await customer.update({
                            points: newPoints
                            // lifetime_points tetap tidak berubah
                        });

                        // Create expire transactions
                        for (const { pointTx, pointsToExpire } of transactionsToExpire) {
                            await PointTransactionRepository.create({
                                customer_id: customerId,
                                order_id: pointTx.order_id,
                                type: 'expire',
                                points: -pointsToExpire, // Negative for expire
                                description: `Expired from transaction #${pointTx.id} (earned on ${pointTx.createdAt?.toISOString().split('T')[0] || 'unknown'}, expires_at: ${pointTx.expires_at})`,
                                expires_at: null // Expire transaction doesn't expire
                            });

                            expiredCount++;
                            totalPointsExpired += pointsToExpire;
                        }

                        console.log(`✅ PointService.expirePoints - Expired ${totalExpired} points from customer ${customerId} (${transactionsToExpire.length} transactions)`);
                    }
                } catch (error) {
                    console.error(`⚠️ PointService.expirePoints - Error expiring points for customer ${customerId}:`, error.message);
                    // Continue with other customers
                }
            }

            console.log(`✅ PointService.expirePoints - Completed: ${expiredCount} transactions expired, ${totalPointsExpired} total points, ${customersAffected} customers affected`);

            return {
                expired_count: expiredCount,
                total_points_expired: totalPointsExpired,
                customers_affected: customersAffected
            };
        } catch (error) {
            throw new Error(`Failed to expire points: ${error.message}`);
        }
    }
}

module.exports = PointService;
