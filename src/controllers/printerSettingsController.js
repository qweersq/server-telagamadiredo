const PrinterSettingsService = require('../services/printerSettingsService');
const { ResponseHelper } = require('../helpers');

class PrinterSettingsController {
    static async getSettings(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            const settings = await PrinterSettingsService.getSettings(tenant_id);
            return res.status(200).send(ResponseHelper.successResponse(settings, 200));
        } catch (error) {
            console.error('Error getting printer settings:', error);
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

            // Hanya ambil atribut yang digunakan: hapus ascii_font, header_style, show_tagline, custom_tagline, custom_business_name, qr_code_url
            const printerSettings = {
                show_logo: req.body.show_logo !== undefined ? req.body.show_logo : false,
                logo_url: req.body.logo_url || null,
                show_qr_code: req.body.show_qr_code !== undefined ? req.body.show_qr_code : false,
                custom_thank_you: req.body.custom_thank_you || null,
                footer_notes: req.body.footer_notes || null,
                instagram: req.body.instagram || null,
                website: req.body.website || null,
                promo_text: req.body.promo_text || null
            };

            console.log('📤 [Controller] Passing to service:', printerSettings);

            const updatedSettings = await PrinterSettingsService.updateSettings(tenant_id, printerSettings);
            return res.status(200).send(ResponseHelper.successResponse(updatedSettings, 200));
        } catch (error) {
            console.error('Error updating printer settings:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = PrinterSettingsController;

