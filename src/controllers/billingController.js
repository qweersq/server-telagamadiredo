const BillingService = require('../services/billingService');
const ResponseHelper = require('../helpers/responseHelper');

class BillingController {
    /**
     * Generate manual billing untuk subscription
     */
    static async generateManualBilling(req, res) {
        try {
            const { subscription_id, custom_amount, custom_due_date } = req.body;

            if (!subscription_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Subscription ID is required'));
            }

            const billing = await BillingService.generateManualBilling(
                subscription_id, 
                custom_amount, 
                custom_due_date ? new Date(custom_due_date) : null
            );

            return res.status(201).send(ResponseHelper.successResponse(billing, 'Manual billing generated successfully'));
        } catch (error) {
            console.error('❌ BillingController.generateManualBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Record payment dari tenant
     */
    static async recordPayment(req, res) {
        try {
            const { billing_id } = req.params;
            const { payment_method, payment_reference, payment_gateway, receipt_url, notes } = req.body;

            if (!billing_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing ID is required'));
            }

            const paymentData = {
                payment_method,
                payment_reference,
                payment_gateway,
                receipt_url,
                notes
            };

            const billing = await BillingService.recordPayment(billing_id, paymentData);

            return res.status(200).send(ResponseHelper.successResponse(billing, 'Payment recorded successfully'));
        } catch (error) {
            console.error('❌ BillingController.recordPayment - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Admin confirm payment
     */
    static async confirmPayment(req, res) {
        try {
            const { billing_id } = req.params;
            const { admin_notes } = req.body;

            if (!billing_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing ID is required'));
            }

            const billing = await BillingService.confirmPayment(billing_id, admin_notes);

            return res.status(200).send(ResponseHelper.successResponse(billing, 'Payment confirmed successfully'));
        } catch (error) {
            console.error('❌ BillingController.confirmPayment - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Get billing statistics
     */
    static async getBillingStats(req, res) {
        try {
            const stats = await BillingService.getBillingStats();

            return res.status(200).send(ResponseHelper.successResponse(stats));
        } catch (error) {
            console.error('❌ BillingController.getBillingStats - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Generate initial billing (untuk subscription baru)
     */
    static async generateInitialBilling(req, res) {
        try {
            const { subscription_id } = req.body;

            if (!subscription_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Subscription ID is required'));
            }

            const billing = await BillingService.generateInitialBilling(subscription_id);

            return res.status(201).send(ResponseHelper.successResponse(billing, 'Initial billing generated successfully'));
        } catch (error) {
            console.error('❌ BillingController.generateInitialBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    /**
     * Check and update expired subscriptions
     */
    static async checkExpiredSubscriptions(req, res) {
        try {
            console.log('🔍 BillingController.checkExpiredSubscriptions');
            const result = await BillingService.checkAndUpdateExpiredSubscriptions();
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ BillingController.checkExpiredSubscriptions - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Generate billing for expiring subscriptions
     */
    static async generateBillingForExpiringSubscriptions(req, res) {
        try {
            console.log('🔍 BillingController.generateBillingForExpiringSubscriptions');
            const result = await BillingService.generateBillingForExpiringSubscriptions();
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ BillingController.generateBillingForExpiringSubscriptions - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Generate billing for trial tenants (day 3)
     */
    static async generateBillingForTrialTenants(req, res) {
        try {
            console.log('🔍 BillingController.generateBillingForTrialTenants');
            const result = await BillingService.generateBillingForTrialTenants();
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ BillingController.generateBillingForTrialTenants - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }

    /**
     * Check and update expired trial tenants
     */
    static async checkExpiredTrials(req, res) {
        try {
            console.log('🔍 BillingController.checkExpiredTrials');
            const result = await BillingService.checkAndUpdateExpiredTrials();
            return res.status(200).send(ResponseHelper.successResponse(result));
        } catch (error) {
            console.error('❌ BillingController.checkExpiredTrials - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message, 500));
        }
    }
}

module.exports = BillingController;
