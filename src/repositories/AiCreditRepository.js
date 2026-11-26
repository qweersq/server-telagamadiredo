const { AiCredit, AiCreditPackage, Tenant, Op, sequelize }  = require('../models');

class AiCreditRepository {
    static async createTransaction(data, transaction = null) {
        return await AiCredit.create(data, { transaction });
    }

    static async findOneByPaymentRef(paymentRef, transaction = null) {
        return await AiCredit.findOne({
            where: {
                payment_ref: paymentRef,
                type: 'CREDIT',
                source: 'PURCHASE',
            },
            transaction,
        });
    }

    static async getBalance(tenantId, transaction = null) {
        const tenant = await Tenant.findByPk(tenantId, {
            attributes: ['ai_credit_balance', 'ai_tier'],
            transaction,
        });
        return tenant ? { balance: tenant.ai_credit_balance, tier: tenant.ai_tier } : null;
    }

    static async updateBalance(tenantId, newBalance, transaction = null) {
        const result = await Tenant.update(
            { ai_credit_balance: newBalance },
            { where: { id: tenantId }, transaction }
        );
        return result;
    }

    static async getHistory(tenantId, { page = 1, pageSize = 20 } = {}, transaction = null) {
        const offset = (page - 1) * pageSize;
        const { rows, count } = await AiCredit.findAndCountAll({
            where: { tenant_id: tenantId },
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize,
            transaction,
        });
        return {
            transactions: rows,
            pagination: {
                page,
                pageSize,
                total: count,
                totalPages: Math.ceil(count / pageSize),
            },
        };
    }

    static async getActivePackages(platform = null, transaction = null) {
        const where = { active: true };
        if (platform && platform !== 'BOTH') {
            where.platform = { [Op.or]: [platform, 'BOTH'] };
        }
        return await AiCreditPackage.findAll({
            where,
            order: [['price', 'ASC']],
            transaction,
        });
    }

    static async getPackageById(packageId, transaction = null) {
        return await AiCreditPackage.findByPk(packageId, { transaction });
    }

    static async getAllTenantsWithTier(tier = null, transaction = null) {
        const where = {};
        if (tier) where.ai_tier = tier;
        return await Tenant.findAll({
            where,
            attributes: ['id', 'ai_credit_balance', 'ai_tier', 'business_name'],
            transaction,
        });
    }

    static async getMonthlyUsage(tenantId, monthStart, transaction = null) {
        const result = await AiCredit.findAll({
            where: {
                tenant_id: tenantId,
                type: 'DEBIT',
                source: 'USAGE',
                createdAt: { [Op.gte]: monthStart },
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_usage'],
            ],
            raw: true,
            transaction,
        });
        return parseInt(result[0]?.total_usage || 0, 10);
    }

    static async getMonthlyGrant(tenantId, monthStart, transaction = null) {
        const result = await AiCredit.findOne({
            where: {
                tenant_id: tenantId,
                type: 'CREDIT',
                source: 'MONTHLY_GRANT',
                createdAt: { [Op.gte]: monthStart },
            },
            transaction,
        });
        return result;
    }
}

module.exports = AiCreditRepository;
