const AiCreditRepository = require('../repositories/AiCreditRepository');
const { sequelize } = require('../models');

class AiCreditService {
    /**
     * Check if tenant has enough AI credit to perform a detection.
     * Returns { allowed: boolean, balance: number, tier: string }
     */
    static async checkCredit(tenantId) {
        try {
            const balanceData = await AiCreditRepository.getBalance(tenantId);
            if (!balanceData) {
                return { allowed: false, balance: 0, tier: 'FREE', message: 'Tenant not found' };
            }

            // PREMIUM tier: unlimited, no deduction
            if (balanceData.tier === 'PREMIUM') {
                return { allowed: true, balance: 999999, tier: 'PREMIUM' };
            }

            if (balanceData.balance <= 0) {
                return { allowed: false, balance: 0, tier: balanceData.tier, message: 'AI_CREDIT_EXHAUSTED' };
            }

            return { allowed: true, balance: balanceData.balance, tier: balanceData.tier };
        } catch (error) {
            throw new Error(`Failed to check credit: ${error.message}`);
        }
    }

    /**
     * Deduct 1 credit after successful AI detection.
     * Records a DEBIT transaction and updates tenant balance.
     */
    static async deductCredit(tenantId, description = '') {
        const transaction = await sequelize.transaction();
        try {
            const balanceData = await AiCreditRepository.getBalance(tenantId, transaction);

            // PREMIUM tier: no deduction
            if (balanceData.tier === 'PREMIUM') {
                await transaction.commit();
                return { deducted: false, tier: 'PREMIUM', balance: 999999 };
            }

            if (balanceData.balance <= 0) {
                await transaction.commit();
                throw new Error('AI_CREDIT_EXHAUSTED');
            }

            const balanceBefore = balanceData.balance;
            const balanceAfter = balanceBefore - 1;

            // Record DEBIT transaction
            await AiCreditRepository.createTransaction({
                tenant_id: tenantId,
                type: 'DEBIT',
                amount: -1,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                source: 'USAGE',
                description: description || 'AI Detection',
                payment_method: 'FREE_TIER',
            }, transaction);

            // Update tenant balance
            await AiCreditRepository.updateBalance(tenantId, balanceAfter, transaction);

            await transaction.commit();
            return { deducted: true, balance: balanceAfter, tier: balanceData.tier };
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    /**
     * Grant credit to a tenant (monthly grant, purchase, admin grant, refund).
     */
    static async grantCredit(tenantId, amount, source, { description, paymentMethod, paymentRef, metadata } = {}) {
        const transaction = await sequelize.transaction();
        try {
            if (amount <= 0) throw new Error('Grant amount must be positive');

            const balanceData = await AiCreditRepository.getBalance(tenantId, transaction);
            const balanceBefore = balanceData ? balanceData.balance : 0;
            const balanceAfter = balanceBefore + amount;

            // Record CREDIT transaction
            await AiCreditRepository.createTransaction({
                tenant_id: tenantId,
                type: 'CREDIT',
                amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                source,
                description: description || `Credit grant - ${source}`,
                payment_method: paymentMethod || 'FREE_TIER',
                payment_ref: paymentRef || null,
                metadata: metadata || null,
            }, transaction);

            // Update tenant balance
            await AiCreditRepository.updateBalance(tenantId, balanceAfter, transaction);

            await transaction.commit();
            return { balance: balanceAfter, amount, source };
        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to grant credit: ${error.message}`);
        }
    }

    /**
     * Get credit balance for a tenant.
     */
    static async getBalance(tenantId) {
        try {
            const balanceData = await AiCreditRepository.getBalance(tenantId);
            if (!balanceData) {
                return { balance: 0, tier: 'FREE' };
            }
            return balanceData;
        } catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    /**
     * Get credit transaction history for a tenant.
     */
    static async getHistory(tenantId, { page = 1, pageSize = 20 } = {}) {
        try {
            return await AiCreditRepository.getHistory(tenantId, { page, pageSize });
        } catch (error) {
            throw new Error(`Failed to get history: ${error.message}`);
        }
    }

    /**
     * All available credit packages.
     */
    static PACKAGES = [
        { id: 1, credits: 50, price: 20000, platform: 'BOTH', active: true },
        { id: 2, credits: 100, price: 35000, platform: 'BOTH', active: true },
        { id: 3, credits: 200, price: 60000, platform: 'BOTH', active: true },
        { id: 4, credits: 500, price: 125000, platform: 'BOTH', active: true },
        { id: 5, credits: 1000, price: 200000, platform: 'BOTH', active: true },
        { id: 6, credits: 2000, price: 300000, platform: 'BOTH', active: true },
    ];

    /**
     * Get available credit packages for purchase.
     */
    static async getPackages(platform = null) {
        let list = AiCreditService.PACKAGES.filter(p => p.active);
        if (platform) {
            list = list.filter(p => p.platform === 'BOTH' || p.platform === platform);
        }
        return list;
    }

    /**
     * Get a single package by ID.
     */
    static async getPackageById(id) {
        return AiCreditService.PACKAGES.find(p => p.id === id && p.active) || null;
    }

    /**
     * Get monthly usage count for a tenant (since monthStart).
     */
    static async getMonthlyUsage(tenantId, monthStart) {
        try {
            return await AiCreditRepository.getMonthlyUsage(tenantId, monthStart);
        } catch (error) {
            throw new Error(`Failed to get monthly usage: ${error.message}`);
        }
    }

    /**
     * Get monthly grant record for a tenant (since monthStart).
     * Returns null if no grant given yet this month.
     */
    static async getMonthlyGrant(tenantId, monthStart) {
        try {
            return await AiCreditRepository.getMonthlyGrant(tenantId, monthStart);
        } catch (error) {
            throw new Error(`Failed to get monthly grant: ${error.message}`);
        }
    }

    /**
     * Process monthly grant for all tenants based on their ai_tier.
     * Called by CRON job on the 1st of each month.
     */
    static async processMonthlyGrants() {
        const transaction = await sequelize.transaction();
        try {
            const tenants = await AiCreditRepository.getAllTenantsWithTier(null, transaction);
            const results = { processed: 0, skipped: 0, errors: [] };

            for (const tenant of tenants) {
                try {
                    let grantAmount = 0;
                    switch (tenant.ai_tier) {
                        case 'FREE':
                            grantAmount = 50;
                            break;
                        case 'BASIC':
                            grantAmount = 200;
                            break;
                        case 'PREMIUM':
                            grantAmount = 999999;
                            break;
                        default:
                            grantAmount = 50; // Default to FREE
                    }

                    const balanceBefore = tenant.ai_credit_balance;
                    const balanceAfter = balanceBefore + grantAmount;

                    await AiCreditRepository.createTransaction({
                        tenant_id: tenant.id,
                        type: 'CREDIT',
                        amount: grantAmount,
                        balance_before: balanceBefore,
                        balance_after: balanceAfter,
                        source: 'MONTHLY_GRANT',
                        description: `Free monthly credit - ${tenant.ai_tier} Tier`,
                        payment_method: 'FREE_TIER',
                    }, transaction);

                    await AiCreditRepository.updateBalance(tenant.id, balanceAfter, transaction);
                    results.processed++;
                } catch (err) {
                    results.errors.push({ tenantId: tenant.id, error: err.message });
                }
            }

            await transaction.commit();
            return results;
        } catch (error) {
            await transaction.rollback();
            throw new Error(`Monthly grant failed: ${error.message}`);
        }
    }

    /**
     * Check if a Tripay reference has already been used to grant AI credit.
     * This is the IDEMPOTENCY GUARD to prevent double credit on duplicate callbacks.
     */
    static async isTripayPurchaseProcessed(tripayReference) {
        try {
            const { AiCredit } = require('../models');
            const existing = await AiCredit.findOne({
                where: {
                    payment_ref: tripayReference,
                    type: 'CREDIT',
                    source: 'PURCHASE',
                },
            });
            return !!existing;
        } catch (error) {
            throw new Error(`Failed to check Tripay reference: ${error.message}`);
        }
    }

    /**
     * Process AI credit purchase from Tripay callback.
     * Called when Tripay sends PAID callback for AI-CREDIT-* merchant_ref.
     * 
     * @param {number} tenantId - Tenant ID
     * @param {number} packageId - Credit package ID
     * @param {number} credits - Number of credits to grant
     * @param {number} amountPaid - Amount paid in Rupiah
     * @param {string} tripayReference - Tripay transaction reference
     * @param {string} paymentMethod - Payment method from Tripay
     * @param {object} metadata - Full Tripay callback data
     * @returns {object} { balance, amount }
     */
    static async processTripayPurchase(tenantId, packageId, credits, amountPaid, tripayReference, paymentMethod, metadata = {}) {
        const transaction = await sequelize.transaction();
        try {
            // ⛔ IDEMPOTENSI: Cek apakah reference ini udah pernah diproses
            const alreadyProcessed = await AiCreditRepository.findOneByPaymentRef(tripayReference, transaction);
            if (alreadyProcessed) {
                await transaction.rollback();
                console.log('⏭️ AiCreditService.processTripayPurchase - Already processed, skipping (idempotency):', tripayReference);
                return {
                    idempotent: true,
                    balance: alreadyProcessed.balance_after,
                    amount: credits,
                };
            }

            const balanceData = await AiCreditRepository.getBalance(tenantId, transaction);
            const balanceBefore = balanceData ? balanceData.balance : 0;
            const balanceAfter = balanceBefore + credits;

            // Record CREDIT transaction with Tripay reference
            await AiCreditRepository.createTransaction({
                tenant_id: tenantId,
                type: 'CREDIT',
                amount: credits,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                source: 'PURCHASE',
                description: `Pembelian ${credits} credit via Tripay (${paymentMethod})`,
                payment_method: 'TRIPAY',
                payment_ref: tripayReference,
                metadata: {
                    package_id: packageId,
                    amount_paid: amountPaid,
                    payment_method: paymentMethod,
                    tripay_callback: metadata,
                },
            }, transaction);

            // Update tenant balance
            await AiCreditRepository.updateBalance(tenantId, balanceAfter, transaction);

            await transaction.commit();
            return { idempotent: false, balance: balanceAfter, amount: credits };
        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to process Tripay purchase: ${error.message}`);
        }
    }
}

module.exports = AiCreditService;
