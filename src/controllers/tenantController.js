const TenantService = require('../services/tenantService');
const TenantOrderRepository = require('../repositories/tenantOrderRepository');
const { ResponseHelper } = require('../helpers');
const crypto = require('crypto');

class TenantController {
    static async create(req, res) {
        try {
            const raw = {
                business_name: req.body.business_name,
                owner_name: req.body.owner_name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address,
                city: req.body.city,
                settings: req.body.settings
            };

            const data = await TenantService.create(raw);

            return res.status(201).send(ResponseHelper.successResponse(data, 201));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getAll(req, res) {
        try {
            const search = req.query.search;
            const status = req.query.status;
            const subscription_status = req.query.subscription_status;
            const tab = req.query.tab; // New: tab filter (unverified, active_trial, expired_trial, active)
            
            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            // Security: Only allow superapp-superadmin to see all tenants, others see only their own
            let tenant_id = null;
            if (req.user.role === 'superapp-superadmin') {
                // SuperApp SuperAdmin can see all tenants or filter by specific tenant_id
                tenant_id = req.query.tenant_id || null; // null means show all tenants
            } else if (req.user.role === 'superadmin') {
                // Tenant SuperAdmin can only see their own tenant
                tenant_id = req.user.tenant_id;
            } else {
                // Other roles can only see their own tenant
                tenant_id = req.user.tenant_id;
            }

            const data = await TenantService.getAll(search, status, subscription_status, tenant_id, page, limit, offset, tab);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            // Security: Validate ownership
            if (req.user.role !== 'superapp-superadmin' && req.user.role !== 'superadmin' && req.user.tenant_id != id) {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied: You can only access your own tenant data', 403));
            }
            
            const data = await TenantService.getById(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    /**
     * Get comprehensive tenant details with analytics for superapp admin
     */
    static async getTenantDetailAnalytics(req, res) {
        try {
            const { id } = req.params;
            
            // Security: Only superapp-superadmin can access detailed analytics
            if (req.user.role !== 'superapp-superadmin') {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied: Only superapp-superadmin can access detailed analytics', 403));
            }
            
            const data = await TenantService.getTenantDetailAnalytics(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async update(req, res) {
        try {
            const { id } = req.params;
            
            // Security: Validate ownership
            if (req.user.role !== 'superapp-superadmin' && req.user.role !== 'superadmin' && req.user.tenant_id != id) {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied: You can only update your own tenant data', 403));
            }
            
            const raw = {
                business_name: req.body.business_name,
                owner_name: req.body.owner_name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address,
                city: req.body.city,
                settings: req.body.settings
            };

            // Only superapp-superadmin can update billing fields
            if (req.user.role === 'superapp-superadmin') {
                raw.status = req.body.status;
                raw.subscription_status = req.body.subscription_status;
                raw.trial_end_date = req.body.trial_end_date;
            }

            // Remove undefined values
            Object.keys(raw).forEach(key => {
                if (raw[key] === undefined) {
                    delete raw[key];
                }
            });

            const data = await TenantService.update(id, raw);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const data = await TenantService.delete(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getTrialTenants(req, res) {
        try {
            const data = await TenantService.getTrialTenants();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async getExpiredSubscriptions(req, res) {
        try {
            const data = await TenantService.getExpiredSubscriptions();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    static async updateSubscriptionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).send(ResponseHelper.errorResponse('Status is required', 400));
            }

            // Only superapp-superadmin can update subscription status
            if (req.user.role !== 'superapp-superadmin') {
                return res.status(403).send(ResponseHelper.errorResponse('Access denied: Only superapp-superadmin can update subscription status', 403));
            }

            const data = await TenantService.updateSubscriptionStatus(id, status);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getTenantStats(req, res) {
        try {
            const { id } = req.params;
            const tenantId = parseInt(id, 10);
            
            if (isNaN(tenantId)) {
                return res.status(400).send(ResponseHelper.errorResponse('Invalid tenant ID', 400));
            }
            
            const data = await TenantService.getTenantStats(tenantId);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async activateTenant(req, res) {
        try {
            const { id } = req.params;
            const data = await TenantService.activateTenant(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async suspendTenant(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const data = await TenantService.suspendTenant(id, reason);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async extendTrial(req, res) {
        try {
            const { id } = req.params;
            const { days } = req.body;

            const data = await TenantService.extendTrial(id, days);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(400).send(ResponseHelper.errorResponse(error.message, 400));
        }
    };

    static async getTenantDashboard(req, res) {
        try {
            const { id } = req.params;
            const data = await TenantService.getTenantDashboard(id);

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(404).send(ResponseHelper.errorResponse(error.message, 404));
        }
    };

    static async getGlobalStats(req, res) {
        try {
            const data = await TenantService.getGlobalStats();

            return res.status(200).send(ResponseHelper.successResponse(data));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    };

    // NEW: Generate verification link for existing tenant
    static async generateVerificationLink(req, res) {
        try {
            const { id } = req.params;
            
            // Get tenant data
            const tenant = await TenantService.getById(id);
            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant tidak ditemukan'));
            }

            // Check if already verified
            if (tenant.is_verified) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant sudah terverifikasi'));
            }

            // Find the original tenant order to get WhatsApp number
            const tenantOrder = await TenantOrderRepository.getByEmail(tenant.email);
            if (!tenantOrder) {
                return res.status(404).send(ResponseHelper.errorResponse('Data order tidak ditemukan'));
            }

            // Generate new verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Update token in tenant_orders table
            await TenantOrderRepository.updateVerificationToken(tenantOrder.id, verificationToken, expiresAt);

            // Generate verification link
            const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${verificationToken}`;
            
            // Generate WhatsApp message
            const whatsappMessage = `🎉 Link Verifikasi Akun - NotaSepatu

Halo ${tenant.owner_name},

Silakan klik link berikut untuk mengaktifkan akun Anda:

👤 Bisnis: ${tenant.business_name}
📧 Email: ${tenant.email}

✅ Link Aktivasi:
${verificationLink}

Link berlaku 24 jam.
Butuh bantuan? Hubungi support kami.

Terima kasih,
Tim NotaSepatu`;

            // Generate WhatsApp URL
            const whatsappUrl = `https://wa.me/${tenantOrder.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

            return res.status(200).send(ResponseHelper.successResponse({
                tenant_id: tenant.id,
                business_name: tenant.business_name,
                owner_name: tenant.owner_name,
                whatsapp: tenantOrder.whatsapp,
                verification_link: verificationLink,
                whatsapp_message: whatsappMessage,
                whatsapp_url: whatsappUrl,
                expires_at: expiresAt
            }));

        } catch (error) {
            console.error('Error generating verification link:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal membuat link verifikasi'));
        }
    };
}

module.exports = TenantController;
