const { User, Tenant, Subscription, SubscriptionPlan, TenantPayment } = require('../models');
const { Op } = require('sequelize');
const ResponseHelper = require('../helpers/responseHelper');
const BillingExpirationService = require('../services/billingExpirationService');
const BillingGenerationService = require('../services/billingGenerationService');
const BillingValidationService = require('../services/billingValidationService');

class BillingValidationController {
    /**
     * Validate billing for specific tenant
     * POST /billing/validate/:tenant_id
     */
    static async validateTenantBilling(req, res) {
        try {
            const { tenant_id } = req.params;
            const user = req.user; // From middleware

            console.log('🔍 BillingValidationController.validateTenantBilling - tenant_id:', tenant_id);

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);
            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get active or trial subscription
            const subscription = await Subscription.findOne({
                where: {
                    tenant_id: tenant.id,
                    status: { [Op.in]: ['trial', 'active'] } // ✅ Include both trial and active
                },
                include: [{
                    association: 'plan',
                    attributes: ['id', 'name', 'price', 'features', 'max_users', 'max_branches', 'max_orders_per_month', 'duration_days']
                }],
                order: [['createdAt', 'DESC']],
                limit: 1
            });

            const validationResults = {
                tenant_id: tenant.id,
                tenant_status: tenant.status,
                subscription_status: tenant.subscription_status,
                validations: []
            };

            // 1. Check active subscription expiration
            try {
                console.log('🔍 BillingValidationController - Checking active subscription expiration');
                const expirationResult = await BillingExpirationService.checkActiveSubscriptionExpiration(tenant.id);
                validationResults.validations.push({
                    type: 'active_subscription_expiration',
                    status: expirationResult.expired ? 'expired' : 'valid',
                    message: expirationResult.message,
                    result: expirationResult
                });
            } catch (error) {
                validationResults.validations.push({
                    type: 'active_subscription_expiration',
                    status: 'error',
                    message: 'Error checking subscription expiration',
                    error: error.message
                });
            }

            // 2. Generate billing for active expired tenant
            // ❌ DISABLED: Causes billing regeneration loop on every validation call
            // Billing generation should only happen via cron jobs (scheduled), not on-demand

            /* DISABLED - billingExpirationService already has safeguards, but this endpoint shouldn't auto-generate
            if (subscription) {
                try {
                    console.log('🔍 BillingValidationController - Generating billing for active expired');
                    const expiredResult = await BillingExpirationService.generateBillingForActiveExpired(tenant.id);
                    validationResults.validations.push({
                        type: 'active_expired_billing',
                        status: expiredResult.success ? 'generated' : 'skipped',
                        message: expiredResult.success ? 
                            `Generated ${expiredResult.count} expired billings` : 
                            'No expired subscriptions found',
                        result: expiredResult
                    });
                } catch (error) {
                    validationResults.validations.push({
                        type: 'active_expired_billing',
                        status: 'error',
                        message: 'Error generating billing for active expired',
                        error: error.message
                    });
                }
            }
            */

            // ✅ Only log check, don't auto-generate
            if (subscription) {
                validationResults.validations.push({
                    type: 'active_expired_billing_check',
                    status: 'disabled',
                    message: 'Auto-generation disabled - billing handled by cron jobs (2:00 AM WIB)'
                });
            }

            // 3. Expired tenant without subscription billing check
            if (tenant.status === 'expired' && !subscription) {
                try {
                    console.log('🔍 BillingValidationController - Checking expired tenant without subscription');

                    // Check if already has unpaid billing
                    const existingBilling = await TenantPayment.findOne({
                        where: {
                            tenant_id: tenant.id,
                            status: {
                                [Op.in]: ['unpaid', 'pending']
                            }
                        }
                    });

                    if (!existingBilling) {
                        // For expired tenant, create new billing directly
                        const { SubscriptionPlan } = require('../models');
                        const TenantPaymentRepository = require('../repositories/tenantPaymentRepository');

                        // Get default plan (plan ID 3 - NotaBusiness)
                        const defaultPlan = await SubscriptionPlan.findByPk(3);
                        if (!defaultPlan) {
                            throw new Error('Default plan not found');
                        }

                        // Generate invoice number
                        const invoiceNumber = `EXPIRED-TENANT-${tenant.id}-${Date.now()}`;

                        // Create expired tenant billing
                        const billingData = {
                            subscription_id: null, // No subscription for expired tenant
                            subscription_plan_id: defaultPlan.id,
                            tenant_id: tenant.id,
                            amount: defaultPlan.price,
                            status: 'unpaid',
                            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                            invoice_number: invoiceNumber,
                            notes: `Expired tenant billing - ${defaultPlan.name}`
                        };

                        const billing = await TenantPaymentRepository.create(billingData);
                        console.log(`✅ BillingValidationController - Created expired tenant billing ${billing.id} for tenant ${tenant.id}`);

                        validationResults.validations.push({
                            type: 'expired_tenant_billing',
                            status: 'generated',
                            message: `Generated expired tenant billing ${billing.id}`,
                            result: {
                                success: true,
                                count: 1,
                                results: [{
                                    tenant_id: tenant.id,
                                    billing_id: billing.id,
                                    amount: billing.amount,
                                    due_date: billing.due_date
                                }]
                            }
                        });
                    } else {
                        validationResults.validations.push({
                            type: 'expired_tenant_billing',
                            status: 'skipped',
                            message: 'Expired tenant already has unpaid billing'
                        });
                    }
                } catch (error) {
                    validationResults.validations.push({
                        type: 'expired_tenant_billing',
                        status: 'error',
                        message: 'Error generating billing for expired tenant',
                        error: error.message
                    });
                }
            }

            // 6. Single billing rule validation
            try {
                console.log('🔍 BillingValidationController - Validating single billing rule');

                // ✅ NEW: Skip billing validation for NotaFree plan
                if (subscription && subscription.plan) {
                    const PlanHelper = require('../helpers/planHelper');
                    if (PlanHelper.isFreePlan(subscription.plan)) {
                        validationResults.validations.push({
                            type: 'single_billing_rule',
                            status: 'valid',
                            message: 'NotaFree plan - no billing validation needed',
                            canGenerate: false // NotaFree doesn't need billing
                        });
                    } else {
                        const canGenerate = await BillingValidationService.canGenerateBilling(tenant.id);
                        validationResults.validations.push({
                            type: 'single_billing_rule',
                            status: canGenerate ? 'valid' : 'invalid',
                            message: canGenerate ? 'Can generate new billing' : 'Unpaid billing exists',
                            canGenerate: canGenerate
                        });
                    }
                } else {
                    const canGenerate = await BillingValidationService.canGenerateBilling(tenant.id);
                    validationResults.validations.push({
                        type: 'single_billing_rule',
                        status: canGenerate ? 'valid' : 'invalid',
                        message: canGenerate ? 'Can generate new billing' : 'Unpaid billing exists',
                        canGenerate: canGenerate
                    });
                }
            } catch (error) {
                validationResults.validations.push({
                    type: 'single_billing_rule',
                    status: 'error',
                    message: 'Error validating single billing rule',
                    error: error.message
                });
            }

            // ✅ Reload tenant data after all validations (in case downgrade happened)
            await tenant.reload();

            // ✅ Also reload subscription to get latest status after downgrade
            const latestSubscription = await Subscription.findOne({
                where: {
                    tenant_id: tenant.id,
                    status: { [Op.in]: ['trial', 'active'] }
                },
                order: [['createdAt', 'DESC']],
                limit: 1
            });

            // Update validation results with latest tenant status
            validationResults.tenant_status = tenant.status;
            validationResults.subscription_status = tenant.subscription_status;

            // ✅ Add info about downgrade if happened
            if (latestSubscription && latestSubscription.plan_id === 4) {
                validationResults.auto_downgraded = true;
                validationResults.current_plan = 'NotaFree';
            }

            console.log('✅ BillingValidationController.validateTenantBilling - Success:', {
                tenant_id: tenant.id,
                tenant_status: tenant.status,
                subscription_status: tenant.subscription_status,
                validations_count: validationResults.validations.length
            });

            return res.status(200).send(ResponseHelper.successResponse(validationResults, 'Billing validation completed'));

        } catch (error) {
            console.error('❌ BillingValidationController.validateTenantBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Validate billing for current user's tenant
     * POST /billing/validate
     */
    static async validateCurrentTenantBilling(req, res) {
        try {
            const user = req.user; // From middleware

            console.log('🔍 BillingValidationController.validateCurrentTenantBilling - user_id:', user.id);

            if (!user.tenant_id) {
                return res.status(400).send(ResponseHelper.errorResponse('User has no associated tenant', 400));
            }

            // Use the same logic as validateTenantBilling but with user's tenant_id
            req.params.tenant_id = user.tenant_id;
            return await this.validateTenantBilling(req, res);

        } catch (error) {
            console.error('❌ BillingValidationController.validateCurrentTenantBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get billing validation status
     * GET /billing/validation-status/:tenant_id
     */
    static async getValidationStatus(req, res) {
        try {
            const { tenant_id } = req.params;

            console.log('🔍 BillingValidationController.getValidationStatus - tenant_id:', tenant_id);

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);
            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get current billing status
            const unpaidBillings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenant.id,
                    status: {
                        [Op.in]: ['unpaid', 'pending']
                    }
                },
                order: [['createdAt', 'DESC']]
            });

            // Get subscription info (active or trial)
            const subscription = await Subscription.findOne({
                where: {
                    tenant_id: tenant.id,
                    status: { [Op.in]: ['trial', 'active'] } // ✅ Include both trial and active
                },
                include: [{
                    association: 'plan',
                    attributes: ['id', 'name', 'price']
                }],
                order: [['createdAt', 'DESC']],
                limit: 1
            });

            const status = {
                tenant_id: tenant.id,
                tenant_status: tenant.status,
                subscription_status: tenant.subscription_status,
                subscription: subscription ? {
                    id: subscription.id,
                    end_date: subscription.end_date,
                    plan: subscription.plan
                } : null,
                billing: {
                    unpaid_count: unpaidBillings.length,
                    unpaid_billings: unpaidBillings.map(b => ({
                        id: b.id,
                        amount: b.amount,
                        status: b.status,
                        due_date: b.due_date,
                        invoice_number: b.invoice_number
                    }))
                },
                last_checked: new Date().toISOString()
            };

            console.log('✅ BillingValidationController.getValidationStatus - Success:', {
                tenant_id: tenant.id,
                unpaid_count: unpaidBillings.length
            });

            return res.status(200).send(ResponseHelper.successResponse(status, 'Validation status retrieved'));

        } catch (error) {
            console.error('❌ BillingValidationController.getValidationStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Force refresh billing validation
     * POST /billing/refresh-validation/:tenant_id
     */
    static async refreshValidation(req, res) {
        try {
            const { tenant_id } = req.params;

            console.log('🔍 BillingValidationController.refreshValidation - tenant_id:', tenant_id);

            // Force re-run all validations
            req.params.tenant_id = tenant_id;
            return await this.validateTenantBilling(req, res);

        } catch (error) {
            console.error('❌ BillingValidationController.refreshValidation - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Validate all tenants and send billing reminders (for cron job)
     * POST /billing/validate-all
     */
    static async validateAllTenantsAndSendReminders(req, res) {
        try {
            console.log('🔔 BillingValidationController.validateAllTenantsAndSendReminders - Starting');

            // 1. Check & downgrade expired subscriptions ke NotaFree
            console.log('⏰ Checking expired subscriptions...');
            const BillingService = require('../services/billingService');
            const expirationResults = await BillingService.checkAndUpdateExpiredSubscriptions();
            console.log(`✅ Expired subscriptions processed: ${expirationResults.processed}`);

            // 2. Generate H-1 Trial Billing (auto-send email)
            console.log('📝 Generating H-1 trial billings...');
            const trialH1Results = await BillingExpirationService.generateBillingForTrialH1();

            // 3. Generate H-7 Active Renewal Billing (auto-send email)
            console.log('📝 Generating H-7 renewal billings...');
            const renewalH7Results = await BillingExpirationService.generateBillingForActiveH7();

            // 4. Send all billing reminders (H-3, H-1, H-0)
            console.log('🔔 Sending billing reminders...');
            const BillingReminderService = require('../services/billingReminderService');
            const reminderResults = await BillingReminderService.sendAllReminders();

            console.log('✅ BillingValidationController.validateAllTenantsAndSendReminders - Complete');

            return res.status(200).send(ResponseHelper.successResponse({
                expiration: expirationResults,
                trial_h1: trialH1Results,
                renewal_h7: renewalH7Results,
                reminders: reminderResults
            }, 'Billing validation and reminders sent successfully'));

        } catch (error) {
            console.error('❌ BillingValidationController.validateAllTenantsAndSendReminders - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }
}

module.exports = BillingValidationController;
