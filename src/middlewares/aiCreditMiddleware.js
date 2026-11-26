const AiCreditService = require('../services/AiCreditService');
const { ResponseHelper } = require('../helpers');

/**
 * Middleware to check AI credit balance before processing AI detection.
 * 
 * - PREMIUM tier: skip check (unlimited)
 * - FREE/BASIC with balance > 0: proceed
 * - FREE/BASIC with balance <= 0: return 402 AI_CREDIT_EXHAUSTED
 */
class AiCreditMiddleware {
    static async checkCredit(req, res, next) {
        try {
            const tenantId = req.user.tenant_id;
            const result = await AiCreditService.checkCredit(tenantId);

            if (!result.allowed) {
                const packages = await AiCreditService.getPackages();
                return res.status(402).send({
                    success: false,
                    error: 'AI_CREDIT_EXHAUSTED',
                    message: 'Kuota AI kamu habis. Upgrade atau beli credit untuk lanjut.',
                    balance: result.balance,
                    packages: packages.map(p => ({
                        id: p.id,
                        credits: p.credits,
                        price: p.price,
                    })),
                });
            }

            // Attach credit info to request for later deduction
            req.aiCredit = { tier: result.tier, balance: result.balance };
            next();
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = AiCreditMiddleware;
