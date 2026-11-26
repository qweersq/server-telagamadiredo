const PointsSettingsService = require('../services/pointsSettingsService');
const { ResponseHelper } = require('../helpers');

class PointsSettingsController {
    static async getSettings(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            const settings = await PointsSettingsService.getSettings(tenant_id);
            return res.status(200).send(ResponseHelper.successResponse(settings, 200));
        } catch (error) {
            console.error('Error getting points settings:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async updateSettings(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            console.log('📥 [Controller] Received body:', req.body);

            const pointsSettings = {
                enabled: req.body.enabled !== undefined ? req.body.enabled : false,
                earn_rate: req.body.earn_rate || 1000,
                redeem_rate: req.body.redeem_rate || 50,
                min_redeem: req.body.min_redeem || 100,
                recalculate_on_enable: req.body.recalculate_on_enable !== undefined ? req.body.recalculate_on_enable : false,
                referral_bonus_referrer: req.body.referral_bonus_referrer !== undefined ? Number(req.body.referral_bonus_referrer) : 10,
                referral_bonus_new_customer: req.body.referral_bonus_new_customer !== undefined ? Number(req.body.referral_bonus_new_customer) : 10
            };

            console.log('📤 [Controller] Passing to service:', pointsSettings);

            const updatedSettings = await PointsSettingsService.updateSettings(tenant_id, pointsSettings);
            return res.status(200).send(ResponseHelper.successResponse(updatedSettings, 200));
        } catch (error) {
            console.error('Error updating points settings:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = PointsSettingsController;

