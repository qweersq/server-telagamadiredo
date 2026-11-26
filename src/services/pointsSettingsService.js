const TenantRepository = require('../repositories/tenantRepository');

class PointsSettingsService {
    static async getSettings(tenant_id) {
        try {
            const tenant = await TenantRepository.getById(tenant_id);
            
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Default values
            const defaultConfig = {
                enabled: false,
                earn_rate: 1000,      // 1 poin per Rp 1.000
                redeem_rate: 50,      // 1 poin = Rp 50 (100 poin = Rp 5.000)
                min_redeem: 100,      // Minimum redeem
                recalculate_on_enable: false,
                referral_bonus_referrer: 10,      // Poin untuk referrer
                referral_bonus_new_customer: 10,   // Poin untuk customer baru yang direfer
                first_order_bonus: 10,             // Poin untuk customer baru yang order pertama tanpa referral
                first_order_bonus_enabled: true    // Enable/disable first order bonus
            };

            // Get points settings from tenant.settings.points
            // Parse settings if it's a string (JSON)
            let currentSettings = {};
            if (tenant.settings) {
                if (typeof tenant.settings === 'string') {
                    try {
                        currentSettings = JSON.parse(tenant.settings);
                    } catch (e) {
                        console.error('Error parsing tenant.settings:', e);
                        currentSettings = {};
                    }
                } else {
                    currentSettings = tenant.settings;
                }
            }
            const pointsSettings = currentSettings.points || {};

            // Merge with defaults
            const settings = {
                enabled: pointsSettings.enabled !== undefined ? Boolean(pointsSettings.enabled) : defaultConfig.enabled,
                earn_rate: pointsSettings.earn_rate !== undefined ? Number(pointsSettings.earn_rate) : defaultConfig.earn_rate,
                redeem_rate: pointsSettings.redeem_rate !== undefined ? Number(pointsSettings.redeem_rate) : defaultConfig.redeem_rate,
                min_redeem: pointsSettings.min_redeem !== undefined ? Number(pointsSettings.min_redeem) : defaultConfig.min_redeem,
                recalculate_on_enable: pointsSettings.recalculate_on_enable !== undefined ? Boolean(pointsSettings.recalculate_on_enable) : defaultConfig.recalculate_on_enable,
                referral_bonus_referrer: pointsSettings.referral_bonus_referrer !== undefined ? Number(pointsSettings.referral_bonus_referrer) : defaultConfig.referral_bonus_referrer,
                referral_bonus_new_customer: pointsSettings.referral_bonus_new_customer !== undefined ? Number(pointsSettings.referral_bonus_new_customer) : defaultConfig.referral_bonus_new_customer,
                first_order_bonus: pointsSettings.first_order_bonus !== undefined ? Number(pointsSettings.first_order_bonus) : (pointsSettings.referral_bonus_new_customer !== undefined ? Number(pointsSettings.referral_bonus_new_customer) : defaultConfig.first_order_bonus), // Backward compatibility: use referral_bonus_new_customer if first_order_bonus not set
                first_order_bonus_enabled: pointsSettings.first_order_bonus_enabled !== undefined ? Boolean(pointsSettings.first_order_bonus_enabled) : defaultConfig.first_order_bonus_enabled
            };

            return settings;
        } catch (error) {
            console.error('Error in PointsSettingsService.getSettings:', error);
            throw error;
        }
    }

    static async updateSettings(tenant_id, pointsSettings) {
        try {
            const tenant = await TenantRepository.getById(tenant_id);
            
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Get existing settings or create new object
            // Parse settings if it's a string (JSON)
            let currentSettings = {};
            if (tenant.settings) {
                if (typeof tenant.settings === 'string') {
                    try {
                        currentSettings = JSON.parse(tenant.settings);
                    } catch (e) {
                        console.error('Error parsing tenant.settings:', e);
                        currentSettings = {};
                    }
                } else {
                    currentSettings = tenant.settings;
                }
            }
            
            console.log('💾 [BE] Saving points settings for tenant:', tenant_id);
            console.log('💾 [BE] Received data:', JSON.stringify(pointsSettings, null, 2));

            // Update points settings
            currentSettings.points = {
                enabled: pointsSettings.enabled !== undefined ? Boolean(pointsSettings.enabled) : false,
                earn_rate: parseInt(pointsSettings.earn_rate) || 1000,
                redeem_rate: parseInt(pointsSettings.redeem_rate) || 50,
                min_redeem: parseInt(pointsSettings.min_redeem) || 100,
                recalculate_on_enable: pointsSettings.recalculate_on_enable !== undefined ? Boolean(pointsSettings.recalculate_on_enable) : false,
                referral_bonus_referrer: pointsSettings.referral_bonus_referrer !== undefined ? Number(pointsSettings.referral_bonus_referrer) : 10,
                referral_bonus_new_customer: pointsSettings.referral_bonus_new_customer !== undefined ? Number(pointsSettings.referral_bonus_new_customer) : 10,
                first_order_bonus: pointsSettings.first_order_bonus !== undefined ? Number(pointsSettings.first_order_bonus) : 10,
                first_order_bonus_enabled: pointsSettings.first_order_bonus_enabled !== undefined ? Boolean(pointsSettings.first_order_bonus_enabled) : true
            };

            console.log('💾 [BE] Will save:', JSON.stringify(currentSettings.points, null, 2));

            // Update tenant settings
            await TenantRepository.update(tenant_id, { settings: currentSettings });

            console.log('✅ [BE] Points settings saved successfully');

            // TODO: If enabled and recalculate_on_enable is true, trigger recalculate process
            // This should be done asynchronously to avoid blocking the response
            if (currentSettings.points.enabled && currentSettings.points.recalculate_on_enable) {
                console.log('🔄 [BE] Recalculate flag is set, but recalculate process not yet implemented');
                // TODO: Implement recalculate process
                // This should:
                // 1. Find all paid orders for this tenant
                // 2. Calculate points based on new earn_rate
                // 3. Create PointTransaction records
                // 4. Update customer points
            }

            return currentSettings.points;
        } catch (error) {
            console.error('Error in PointsSettingsService.updateSettings:', error);
            throw error;
        }
    }
}

module.exports = PointsSettingsService;

