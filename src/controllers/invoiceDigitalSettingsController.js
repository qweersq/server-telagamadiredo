const InvoiceDigitalSettingsService = require('../services/invoiceDigitalSettingsService');
const { ResponseHelper } = require('../helpers');

class InvoiceDigitalSettingsController {
    static async getSettings(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            const settings = await InvoiceDigitalSettingsService.getSettings(tenant_id);
            return res.status(200).send(ResponseHelper.successResponse(settings, 200));
        } catch (error) {
            console.error('Error getting invoice digital settings:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    static async updateSettings(req, res) {
        try {
            const tenant_id = req.user.tenant_id;
            
            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID not found', 400));
            }

            const invoiceDigitalSettings = {
                show_logo: req.body.show_logo !== undefined ? req.body.show_logo : false,
                logo_url: req.body.logo_url || null,
                show_business_name: req.body.show_business_name !== undefined ? req.body.show_business_name : true,
                show_tagline: req.body.show_tagline !== undefined ? req.body.show_tagline : true,
                header_color: req.body.header_color || '#5096FC',
                footer_color: req.body.footer_color || '#5096FC',
                header_text_color: req.body.header_text_color || '#FFFFFF',
                footer_text_color: req.body.footer_text_color || '#FFFFFF',
                footer_notes: req.body.footer_notes || null,
                custom_thank_you: req.body.custom_thank_you || null,
                promo_text: req.body.promo_text || null,
                instagram: req.body.instagram || null,
                website: req.body.website || null,
                show_progress_photos: req.body.show_progress_photos !== undefined ? req.body.show_progress_photos : false,
                show_technician_info: req.body.show_technician_info !== undefined ? req.body.show_technician_info : false
            };

            const updatedSettings = await InvoiceDigitalSettingsService.updateSettings(tenant_id, invoiceDigitalSettings);
            return res.status(200).send(ResponseHelper.successResponse(updatedSettings, 200));
        } catch (error) {
            console.error('Error updating invoice digital settings:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = InvoiceDigitalSettingsController;

