const TenantRepository = require('../repositories/tenantRepository');

class PrinterSettingsService {
    static async getSettings(tenant_id) {
        try {
            const tenant = await TenantRepository.getById(tenant_id);

            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Return printer settings or default values
            // Hanya atribut yang digunakan: hapus ascii_font, header_style, show_tagline, custom_tagline, custom_business_name, qr_code_url
            const defaultSettings = {
                show_logo: false,
                logo_url: null,
                show_qr_code: false,
                custom_thank_you: null,
                footer_notes: null,
                instagram: null,
                website: null,
                promo_text: null
            };

            // Parse settings if it's a string (from DB JSON column)
            let settings = tenant.settings || {};
            if (typeof settings === 'string') {
                try {
                    settings = JSON.parse(settings);
                } catch (e) {
                    settings = {};
                }
            }
            const rawPrinterSettings = settings.printer || defaultSettings;

            // Filter: hanya return atribut yang digunakan (hapus atribut lama yang tidak dipakai)
            const printerSettings = {
                show_logo: rawPrinterSettings.show_logo !== undefined ? rawPrinterSettings.show_logo : false,
                logo_url: rawPrinterSettings.logo_url || null,
                show_qr_code: rawPrinterSettings.show_qr_code !== undefined ? rawPrinterSettings.show_qr_code : false,
                custom_thank_you: rawPrinterSettings.custom_thank_you || null,
                footer_notes: rawPrinterSettings.footer_notes || null,
                instagram: rawPrinterSettings.instagram || null,
                website: rawPrinterSettings.website || null,
                promo_text: rawPrinterSettings.promo_text || null
            };

            console.log('📥 [BE] Fetching settings for tenant:', tenant_id);
            console.log('📥 [BE] Logo URL:', printerSettings.logo_url || 'NO');

            return printerSettings;
        } catch (error) {
            console.error('Error in PrinterSettingsService.getSettings:', error);
            throw error;
        }
    }

    static async updateSettings(tenant_id, printerSettings) {
        try {
            const tenant = await TenantRepository.getById(tenant_id);

            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Get existing settings or create new object
            // Parse settings if it's a string (from DB JSON column)
            let currentSettings = tenant.settings || {};
            if (typeof currentSettings === 'string') {
                try {
                    currentSettings = JSON.parse(currentSettings);
                } catch (e) {
                    currentSettings = {};
                }
            }

            console.log('💾 [BE] Saving settings for tenant:', tenant_id);
            console.log('💾 [BE] Received data:', JSON.stringify(printerSettings, null, 2));
            console.log('💾 [BE] Logo URL:', printerSettings.logo_url || 'NO');
            console.log('💾 [BE] Show Logo:', printerSettings.show_logo);

            // Update printer settings
            // Hanya simpan atribut yang digunakan: hapus ascii_font, header_style, show_tagline, custom_tagline, custom_business_name, qr_code_url
            currentSettings.printer = {
                show_logo: printerSettings.show_logo !== undefined ? printerSettings.show_logo : false,
                logo_url: printerSettings.logo_url || null,
                show_qr_code: printerSettings.show_qr_code !== undefined ? printerSettings.show_qr_code : false,
                custom_thank_you: printerSettings.custom_thank_you || null,
                footer_notes: printerSettings.footer_notes || null,
                instagram: printerSettings.instagram || null,
                website: printerSettings.website || null,
                promo_text: printerSettings.promo_text || null
            };

            console.log('💾 [BE] Will save:', JSON.stringify(currentSettings.printer, null, 2));

            // Update tenant settings
            await TenantRepository.update(tenant_id, { settings: currentSettings });

            console.log('✅ [BE] Settings saved successfully');

            return currentSettings.printer;
        } catch (error) {
            console.error('Error in PrinterSettingsService.updateSettings:', error);
            throw error;
        }
    }
}

module.exports = PrinterSettingsService;

