const { User, Tenant, Subscription, SubscriptionPlan, TenantPayment } = require('../models');
const ResponseHelper = require('../helpers/responseHelper');

class BillingTenantController {
    /**
     * Get active tenant status (no middleware required)
     * GET /billing-tenant/active-status/:tenant_id
     */
    static async getActiveTenantStatus(req, res) {
        try {
            const { tenant_id } = req.params;
            
            console.log('🔍 BillingTenantController.getActiveTenantStatus - tenant_id:', tenant_id);

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get latest active or trial subscription
            const subscription = await Subscription.findOne({
                where: {
                    tenant_id: tenant.id,
                    status: { [Op.in]: ['trial', 'active'] } // ✅ Include both trial and active
                },
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan'
                }],
                order: [['createdAt', 'DESC']]
            });

            // Calculate days remaining for trial
            let daysRemaining = 0;
            if (tenant.trial_end_date && tenant.subscription_status === 'trial') {
                const now = new Date();
                const trialEnd = new Date(tenant.trial_end_date);
                const diffTime = trialEnd - now;
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const data = {
                tenant: {
                    id: tenant.id,
                    business_name: tenant.business_name,
                    status: tenant.status,
                    subscription_status: tenant.subscription_status,
                    trial_end_date: tenant.trial_end_date,
                    days_remaining: daysRemaining
                },
                subscription: subscription ? {
                    id: subscription.id,
                    status: subscription.status,
                    start_date: subscription.start_date,
                    end_date: subscription.end_date,
                    plan: subscription.plan ? {
                        id: subscription.plan.id,
                        name: subscription.plan.name,
                        price: subscription.plan.price,
                        max_orders_per_month: subscription.plan.max_orders_per_month,
                        duration_days: subscription.plan.duration_days
                    } : null
                } : null,
                is_active: tenant.subscription_status === 'active' && tenant.status === 'active',
                message: tenant.subscription_status === 'trial' 
                    ? `Trial berakhir dalam ${daysRemaining} hari` 
                    : tenant.subscription_status === 'active' 
                        ? 'Subscription aktif' 
                        : 'Subscription tidak aktif'
            };

            console.log('✅ BillingTenantController.getActiveTenantStatus - Success:', {
                tenant_id: tenant.id,
                tenant_status: tenant.status,
                subscription_status: tenant.subscription_status,
                is_active: data.is_active
            });

            return res.status(200).send(ResponseHelper.successResponse(data, 'Operation successful'));

        } catch (error) {
            console.error('❌ BillingTenantController.getActiveTenantStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get active tenant billing history (no middleware required)
     * GET /billing-tenant/active-history/:tenant_id
     */
    static async getActiveTenantBillingHistory(req, res) {
        try {
            const { tenant_id } = req.params;
            
            console.log('🔍 BillingTenantController.getActiveTenantBillingHistory - tenant_id:', tenant_id);

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get billing history
            const billings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenant.id
                },
                include: [{
                    model: Subscription,
                    as: 'subscription',
                    include: [{
                        model: SubscriptionPlan,
                        as: 'plan'
                    }]
                }],
                order: [['createdAt', 'DESC']]
            });

            // Calculate stats
            const stats = {
                unpaid: { count: 0, total_amount: 0 },
                pending: { count: 0, total_amount: 0 },
                paid: { count: 0, total_amount: 0 },
                failed: { count: 0, total_amount: 0 }
            };

            billings.forEach(billing => {
                const amount = parseFloat(billing.amount);
                if (stats[billing.status]) {
                    stats[billing.status].count++;
                    stats[billing.status].total_amount += amount;
                }
            });

            const data = {
                billings: billings,
                stats: stats
            };

            console.log('✅ BillingTenantController.getActiveTenantBillingHistory - Success:', {
                tenant_id: tenant.id,
                billing_count: billings.length,
                stats: stats
            });

            return res.status(200).send(ResponseHelper.successResponse(data, 'Operation successful'));

        } catch (error) {
            console.error('❌ BillingTenantController.getActiveTenantBillingHistory - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get active tenant upcoming billings (no middleware required)
     * GET /billing-tenant/active-upcoming/:tenant_id
     */
    static async getActiveTenantUpcomingBillings(req, res) {
        try {
            const { tenant_id } = req.params;
            
            console.log('🔍 BillingTenantController.getActiveTenantUpcomingBillings - tenant_id:', tenant_id);

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get upcoming billings (unpaid and pending - user is waiting for admin confirmation)
            const upcomingBillings = await TenantPayment.findAll({
                where: {
                    tenant_id: tenant.id,
                    status: ['unpaid', 'pending']
                },
                include: [{
                    model: Subscription,
                    as: 'subscription',
                    include: [{
                        model: SubscriptionPlan,
                        as: 'plan'
                    }]
                }],
                order: [['due_date', 'ASC']]
            });

            console.log('✅ BillingTenantController.getActiveTenantUpcomingBillings - Success:', {
                tenant_id: tenant.id,
                upcoming_count: upcomingBillings.length
            });

            return res.status(200).send(ResponseHelper.successResponse(upcomingBillings, 'Operation successful'));

        } catch (error) {
            console.error('❌ BillingTenantController.getActiveTenantUpcomingBillings - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Check payment status for specific billing (no middleware required)
     * GET /billing-tenant/check-payment/:tenant_id/:billing_id
     */
    static async checkPaymentStatus(req, res) {
        try {
            const { tenant_id, billing_id } = req.params;
            
            console.log('🔍 BillingTenantController.checkPaymentStatus - tenant_id:', tenant_id, 'billing_id:', billing_id);

            // Get tenant data
            const tenant = await Tenant.findByPk(tenant_id);

            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Get specific billing
            const billing = await TenantPayment.findOne({
                where: {
                    id: billing_id,
                    tenant_id: tenant.id
                },
                include: [{
                    model: Subscription,
                    as: 'subscription',
                    include: [{
                        model: SubscriptionPlan,
                        as: 'plan'
                    }]
                }]
            });

            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            // Prepare response based on status
            let message = '';
            let needsAction = false;

            switch (billing.status) {
                case 'unpaid':
                    message = 'Billing belum dibayar. Silakan lakukan pembayaran.';
                    needsAction = true;
                    break;
                case 'pending':
                    message = 'Pembayaran sedang diverifikasi oleh admin. Silakan tunggu konfirmasi.';
                    needsAction = false;
                    break;
                case 'paid':
                    message = 'Pembayaran telah dikonfirmasi dan diterima.';
                    needsAction = false;
                    break;
                case 'failed':
                    message = 'Pembayaran gagal. Silakan coba lagi.';
                    needsAction = true;
                    break;
                case 'cancelled':
                    message = 'Billing telah dibatalkan.';
                    needsAction = false;
                    break;
                default:
                    message = 'Status pembayaran tidak diketahui.';
                    needsAction = true;
            }

            const responseData = {
                billing: {
                    id: billing.id,
                    invoice_number: billing.invoice_number,
                    amount: billing.amount,
                    status: billing.status,
                    due_date: billing.due_date,
                    paid_at: billing.paid_at,
                    payment_method: billing.payment_method,
                    payment_code: billing.payment_code,
                    notes: billing.notes
                },
                message: message,
                needs_action: needsAction,
                last_checked: new Date().toISOString()
            };

            console.log('✅ BillingTenantController.checkPaymentStatus - Success:', {
                tenant_id: tenant.id,
                billing_id: billing.id,
                status: billing.status,
                message: message
            });

            return res.status(200).send(ResponseHelper.successResponse(responseData, 'Payment status checked successfully'));

        } catch (error) {
            console.error('❌ BillingTenantController.checkPaymentStatus - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }
}

module.exports = BillingTenantController;