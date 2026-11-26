const TenantOnboardingService = require('../services/tenantOnboardingService');
const { ResponseHelper } = require('../helpers');

class TenantOnboardingController {
    // Start onboarding process
    static async startOnboarding(req, res) {
        try {
            const { tenant_id } = req.body;
            const user_id = req.user.id;

            if (!tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID diperlukan'));
            }

            const result = await TenantOnboardingService.startOnboarding(tenant_id, user_id);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Onboarding dimulai'));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Get onboarding status
    static async getOnboardingStatus(req, res) {
        try {
            const { tenant_id } = req.params;
            const user_id = req.user.id;

            const result = await TenantOnboardingService.getOnboardingStatus(tenant_id);

            if (!result) {
                return res.status(200).send(ResponseHelper.errorResponse('Onboarding tidak ditemukan'));
            }

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Complete branch setup
    static async completeBranchSetup(req, res) {
        try {
            const { tenant_id } = req.params;
            const branchData = req.body;

            if (!branchData.name || !branchData.address) {
                return res.status(400).send(ResponseHelper.errorResponse('Nama dan alamat branch diperlukan'));
            }

            const result = await TenantOnboardingService.completeBranchSetup(tenant_id, branchData);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Complete user creation
    static async completeUserCreation(req, res) {
        try {
            const { tenant_id } = req.params;
            const usersData = req.body;

            if (!usersData.admin && !usersData.teknisi) {
                return res.status(400).send(ResponseHelper.errorResponse('Minimal satu user (admin atau teknisi) harus dibuat'));
            }

            // Validate admin data
            if (usersData.admin) {
                if (!usersData.admin.name || !usersData.admin.email || !usersData.admin.password) {
                    return res.status(400).send(ResponseHelper.errorResponse('Data admin tidak lengkap (nama, email, password diperlukan)'));
                }
            }

            // Validate teknisi data
            if (usersData.teknisi) {
                if (!usersData.teknisi.name || !usersData.teknisi.email || !usersData.teknisi.password) {
                    return res.status(400).send(ResponseHelper.errorResponse('Data teknisi tidak lengkap (nama, email, password diperlukan)'));
                }
            }

            const result = await TenantOnboardingService.completeUserCreation(tenant_id, usersData);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Complete service setup
    static async completeServiceSetup(req, res) {
        try {
            const { tenant_id } = req.params;
            const servicesData = req.body;

            const result = await TenantOnboardingService.completeServiceSetup(tenant_id, servicesData);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Complete printer setup
    static async completePrinterSetup(req, res) {
        try {
            const { tenant_id } = req.params;
            const printerData = req.body;

            const result = await TenantOnboardingService.completePrinterSetup(tenant_id, printerData);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Complete WhatsApp setup
    static async completeWaSetup(req, res) {
        try {
            const { tenant_id } = req.params;
            const waData = req.body;

            const result = await TenantOnboardingService.completeWaSetup(tenant_id, waData);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Skip step (for testing or admin purposes)
    static async skipStep(req, res) {
        try {
            const { tenant_id } = req.params;
            const { step } = req.body;

            if (!step) {
                return res.status(400).send(ResponseHelper.errorResponse('Step yang akan dilewati harus ditentukan'));
            }

            const result = await TenantOnboardingService.skipStep(tenant_id, step);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Complete onboarding (mark as finished)
    static async completeOnboarding(req, res) {
        try {
            const { tenant_id } = req.params;
            const user_id = req.user.id;

            const result = await TenantOnboardingService.completeOnboarding(tenant_id, user_id);

            return res.status(200).send(ResponseHelper.successResponse(result, 'Onboarding selesai'));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    // Get all onboardings (admin only)
    static async getAllOnboardings(req, res) {
        try {
            const { search, status } = req.query;

            const result = await TenantOnboardingService.getAllOnboardings(search, status);

            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = TenantOnboardingController;
