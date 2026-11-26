const TenantRepository = require('../repositories/tenantRepository');

class InvoiceDigitalSettingsService {
    static async getSettings(tenant_id) {
        try {
            const tenant = await TenantRepository.getById(tenant_id);
            
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            const defaultSettings = {
                show_logo: false,
                logo_url: null,
                show_business_name: true,
                show_tagline: true,
                header_color: '#5096FC',
                footer_color: '#5096FC',
                header_text_color: '#FFFFFF',
                footer_text_color: '#FFFFFF',
                footer_notes: null,
                custom_thank_you: null,
                promo_text: null,
                instagram: null,
                website: null,
                show_progress_photos: false,
                show_technician_info: false
            };

            const settings = tenant.settings || {};
            const rawInvoiceDigitalSettings = settings.invoice_digital || defaultSettings;

            const invoiceDigitalSettings = {
                show_logo: rawInvoiceDigitalSettings.show_logo !== undefined ? rawInvoiceDigitalSettings.show_logo : false,
                logo_url: rawInvoiceDigitalSettings.logo_url || null,
                show_business_name: rawInvoiceDigitalSettings.show_business_name !== undefined ? rawInvoiceDigitalSettings.show_business_name : true,
                show_tagline: rawInvoiceDigitalSettings.show_tagline !== undefined ? rawInvoiceDigitalSettings.show_tagline : true,
                header_color: rawInvoiceDigitalSettings.header_color || '#5096FC',
                footer_color: rawInvoiceDigitalSettings.footer_color || '#5096FC',
                header_text_color: rawInvoiceDigitalSettings.header_text_color || '#FFFFFF',
                footer_text_color: rawInvoiceDigitalSettings.footer_text_color || '#FFFFFF',
                footer_notes: rawInvoiceDigitalSettings.footer_notes || null,
                custom_thank_you: rawInvoiceDigitalSettings.custom_thank_you || null,
                promo_text: rawInvoiceDigitalSettings.promo_text || null,
                instagram: rawInvoiceDigitalSettings.instagram || null,
                website: rawInvoiceDigitalSettings.website || null,
                show_progress_photos: rawInvoiceDigitalSettings.show_progress_photos !== undefined ? rawInvoiceDigitalSettings.show_progress_photos : false,
                show_technician_info: rawInvoiceDigitalSettings.show_technician_info !== undefined ? rawInvoiceDigitalSettings.show_technician_info : false
            };

            return invoiceDigitalSettings;
        } catch (error) {
            console.error('Error in InvoiceDigitalSettingsService.getSettings:', error);
            throw error;
        }
    }

    static async updateSettings(tenant_id, invoiceDigitalSettings) {
        try {
            const tenant = await TenantRepository.getById(tenant_id);
            
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            const currentSettings = tenant.settings || {};
            currentSettings.invoice_digital = {
                show_logo: invoiceDigitalSettings.show_logo !== undefined ? invoiceDigitalSettings.show_logo : false,
                logo_url: invoiceDigitalSettings.logo_url || null,
                show_business_name: invoiceDigitalSettings.show_business_name !== undefined ? invoiceDigitalSettings.show_business_name : true,
                show_tagline: invoiceDigitalSettings.show_tagline !== undefined ? invoiceDigitalSettings.show_tagline : true,
                header_color: invoiceDigitalSettings.header_color || '#5096FC',
                footer_color: invoiceDigitalSettings.footer_color || '#5096FC',
                header_text_color: invoiceDigitalSettings.header_text_color || '#FFFFFF',
                footer_text_color: invoiceDigitalSettings.footer_text_color || '#FFFFFF',
                footer_notes: invoiceDigitalSettings.footer_notes || null,
                custom_thank_you: invoiceDigitalSettings.custom_thank_you || null,
                promo_text: invoiceDigitalSettings.promo_text || null,
                instagram: invoiceDigitalSettings.instagram || null,
                website: invoiceDigitalSettings.website || null,
                show_progress_photos: invoiceDigitalSettings.show_progress_photos !== undefined ? invoiceDigitalSettings.show_progress_photos : false,
                show_technician_info: invoiceDigitalSettings.show_technician_info !== undefined ? invoiceDigitalSettings.show_technician_info : false
            };

            await TenantRepository.update(tenant_id, { settings: currentSettings });

            return currentSettings.invoice_digital;
        } catch (error) {
            console.error('Error in InvoiceDigitalSettingsService.updateSettings:', error);
            throw error;
        }
    }
}

module.exports = InvoiceDigitalSettingsService;

