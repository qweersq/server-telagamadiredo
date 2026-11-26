const TenantPayment = require('../models/TenantPayment');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Tenant = require('../models/Tenant');
const { Op } = require('sequelize');
const ResponseHelper = require('../helpers/responseHelper');

class SuperAppBillingController {
    /**
     * Get all billings with filtering and pagination
     * GET /superapp/billings
     */
    static async getAllBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getAllBillings - Fetching all billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                status = '',
                tenant_id = '',
                start_date = '',
                end_date = '',
                sort_by = 'created_at',
                sort_order = 'DESC'
            } = req.query;

            // Build where clause
            const whereClause = {};
            
            if (status) {
                // Support multiple statuses separated by comma
                if (status.includes(',')) {
                    const statuses = status.split(',').map(s => s.trim());
                    whereClause.status = {
                        [Op.in]: statuses
                    };
                } else {
                    whereClause.status = status;
                }
            }
            
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            // Build search conditions
            const searchConditions = [];
            if (search) {
                // Check if search term is numeric (for amount/payment code search)
                const isNumeric = /^\d+$/.test(search.trim());
                const searchTerm = search.trim();
                
                searchConditions.push(
                    { invoice_number: { [Op.like]: `%${searchTerm}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${searchTerm}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${searchTerm}%` } },
                    { '$tenant.email$': { [Op.like]: `%${searchTerm}%` } },
                    { '$tenant.phone$': { [Op.like]: `%${searchTerm}%` } },
                    { notes: { [Op.like]: `%${searchTerm}%` } },
                    { payment_code: { [Op.like]: `%${searchTerm}%` } } // Search by payment code
                );
                
                // Enhanced amount search - support both exact and partial matches
                if (isNumeric) {
                    // Search for exact amount match
                    searchConditions.push({ amount: searchTerm });
                    // Search for amount containing the number
                    searchConditions.push({ amount: { [Op.like]: `%${searchTerm}%` } });
                } else {
                    // Regular amount search for non-numeric terms
                    searchConditions.push({ amount: { [Op.like]: `%${searchTerm}%` } });
                }
                
                console.log('🔍 SuperAppBillingController - Search conditions:', searchConditions);
            }

            // Calculate offset
            const offset = (page - 1) * limit;

            // Fetch billings with pagination
            const { count, rows: billings } = await TenantPayment.findAndCountAll({
                where: {
                    ...whereClause,
                    ...(searchConditions.length > 0 && { [Op.or]: searchConditions })
                },
                attributes: [
                    'id', 'subscription_id', 'tenant_id', 'amount', 'status', 
                    'payment_method', 'payment_reference', 'payment_code', 
                    'due_date', 'paid_at', 'notes', 'invoice_number', 
                    'createdAt', 'updatedAt'
                ],
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['id', 'name', 'price', 'duration_days']
                        }]
                    }
                ],
                order: [[sort_by === 'created_at' ? 'createdAt' : sort_by, sort_order]],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            // Calculate pagination info
            const totalPages = Math.ceil(count / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            const response = {
                success: true,
                data: billings,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit),
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage
                }
            };

            console.log('✅ SuperAppBillingController.getAllBillings - Success:', {
                total_billings: count,
                current_page: page,
                total_pages: totalPages
            });

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getAllBillings - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get overall billing statistics (general stats)
     * GET /superapp/billings/stats
     */
    static async getBillingStats(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getBillingStats - Fetching general billing statistics');

            // Calculate overall stats
            const totalBillings = await TenantPayment.count();
            const totalAmount = await TenantPayment.sum('amount') || 0;
            const paidBillings = await TenantPayment.count({ where: { status: 'paid' } });
            const paidAmount = await TenantPayment.sum('amount', { where: { status: 'paid' } }) || 0;
            const pendingBillings = await TenantPayment.count({ where: { status: 'pending' } });
            const pendingAmount = await TenantPayment.sum('amount', { where: { status: 'pending' } }) || 0;
            const unpaidBillings = await TenantPayment.count({ where: { status: 'unpaid' } });
            const unpaidAmount = await TenantPayment.sum('amount', { where: { status: 'unpaid' } }) || 0;
            const failedBillings = await TenantPayment.count({ where: { status: 'failed' } });
            const failedAmount = await TenantPayment.sum('amount', { where: { status: 'failed' } }) || 0;
            const cancelledBillings = await TenantPayment.count({ where: { status: 'cancelled' } });
            const cancelledAmount = await TenantPayment.sum('amount', { where: { status: 'cancelled' } }) || 0;
            const refundedBillings = await TenantPayment.count({ where: { status: 'refunded' } });
            const refundedAmount = await TenantPayment.sum('amount', { where: { status: 'refunded' } }) || 0;

            // Calculate average per item
            const avgPerItem = paidBillings > 0 ? paidAmount / paidBillings : 0;

            // Get active tenants count
            const activeTenants = await Tenant.count({ 
                where: { 
                    deletedAt: null,
                    is_verified: true 
                } 
            });

            // Calculate growth rate (mock data for now - you can implement real calculation)
            const growthRate = 12.5; // This should be calculated based on previous period

            const response = {
                success: true,
                data: {
                    // General stats that don't change with tabs
                    total_billings: totalBillings,
                    total_amount: totalAmount,
                    paid_billings: paidBillings,
                    paid_amount: paidAmount,
                    pending_billings: pendingBillings,
                    pending_amount: pendingAmount,
                    unpaid_billings: unpaidBillings,
                    unpaid_amount: unpaidAmount,
                    failed_billings: failedBillings,
                    failed_amount: failedAmount,
                    cancelled_billings: cancelledBillings,
                    cancelled_amount: cancelledAmount,
                    refunded_billings: refundedBillings,
                    refunded_amount: refundedAmount,
                    collection_rate: totalBillings > 0 ? (paidBillings / totalBillings * 100).toFixed(2) : 0,
                    avg_per_item: avgPerItem,
                    active_tenants: activeTenants,
                    growth_rate: growthRate
                }
            };

            console.log('✅ SuperAppBillingController.getBillingStats - Success:', response.data);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getBillingStats - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get optimized dashboard statistics (single API call)
     * GET /superapp/billings/dashboard-stats
     */
    static async getDashboardStats(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getDashboardStats - Fetching optimized dashboard statistics');

            // Single optimized query for all billing stats
            const billingStats = await TenantPayment.findAll({
                attributes: [
                    'status',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                    [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total_amount']
                ],
                group: ['status']
            });

            // Transform to object format
            const statsByStatus = {};
            let totalBillings = 0;
            let totalAmount = 0;

            billingStats.forEach(stat => {
                const count = parseInt(stat.dataValues.count);
                const amount = parseFloat(stat.dataValues.total_amount || 0);
                
                statsByStatus[stat.status] = {
                    count: count,
                    total_amount: amount
                };
                
                totalBillings += count;
                totalAmount += amount;
            });

            // Get active tenants count (verified and active)
            const activeTenants = await Tenant.count({
                where: {
                    deletedAt: null,
                    is_verified: true,
                    status: 'active',
                    subscription_status: 'active'
                }
            });

            // Calculate performance metrics
            const paidCount = statsByStatus.paid?.count || 0;
            const paidAmount = statsByStatus.paid?.total_amount || 0;
            const collectionRate = totalBillings > 0 ? (paidCount / totalBillings) * 100 : 0;
            const avgPerItem = paidCount > 0 ? paidAmount / paidCount : 0;

            // Calculate growth rate (mock for now - can be implemented with historical data)
            const growthRate = 15.5; // This can be calculated from historical data

            const response = {
                success: true,
                data: {
                    overview: {
                        total_billings: totalBillings,
                        total_amount: totalAmount,
                        active_tenants: activeTenants,
                        growth_rate: growthRate
                    },
                    billing_breakdown: {
                        paid: statsByStatus.paid || { count: 0, total_amount: 0 },
                        pending: statsByStatus.pending || { count: 0, total_amount: 0 },
                        unpaid: statsByStatus.unpaid || { count: 0, total_amount: 0 },
                        failed: statsByStatus.failed || { count: 0, total_amount: 0 },
                        cancelled: statsByStatus.cancelled || { count: 0, total_amount: 0 },
                        refunded: statsByStatus.refunded || { count: 0, total_amount: 0 }
                    },
                    performance_metrics: {
                        collection_rate: collectionRate,
                        avg_per_item: avgPerItem,
                        pending_ratio: totalBillings > 0 ? ((statsByStatus.pending?.count || 0) / totalBillings) * 100 : 0
                    }
                }
            };

            console.log('✅ SuperAppBillingController.getDashboardStats - Success:', {
                total_billings: totalBillings,
                total_amount: totalAmount,
                active_tenants: activeTenants
            });

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getDashboardStats - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get tab-based statistics
     * GET /superapp/billings/stats/tabs
     */
    static async getTabStats(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getTabStats - Fetching tab statistics');

            // Get stats for each tab
            const unpaidCount = await TenantPayment.count({
                where: { status: 'unpaid' }
            });
            const unpaidAmount = await TenantPayment.sum('amount', {
                where: { status: 'unpaid' }
            });

            const pendingCount = await TenantPayment.count({
                where: { status: 'pending' }
            });
            const pendingAmount = await TenantPayment.sum('amount', {
                where: { status: 'pending' }
            });

            const paidCount = await TenantPayment.count({
                where: { status: 'paid' }
            });
            const paidAmount = await TenantPayment.sum('amount', {
                where: { status: 'paid' }
            });

            const failedCount = await TenantPayment.count({
                where: { status: 'failed' }
            });
            const failedAmount = await TenantPayment.sum('amount', {
                where: { status: 'failed' }
            });

            const cancelledCount = await TenantPayment.count({
                where: { status: 'cancelled' }
            });
            const cancelledAmount = await TenantPayment.sum('amount', {
                where: { status: 'cancelled' }
            });

            const refundedCount = await TenantPayment.count({
                where: { status: 'refunded' }
            });
            const refundedAmount = await TenantPayment.sum('amount', {
                where: { status: 'refunded' }
            });

            const response = {
                success: true,
                data: {
                    unpaid: {
                        count: unpaidCount,
                        total_amount: parseFloat(unpaidAmount || 0)
                    },
                    pending: {
                        count: pendingCount,
                        total_amount: parseFloat(pendingAmount || 0)
                    },
                    paid: {
                        count: paidCount,
                        total_amount: parseFloat(paidAmount || 0)
                    },
                    failed: {
                        count: failedCount,
                        total_amount: parseFloat(failedAmount || 0)
                    },
                    cancelled: {
                        count: cancelledCount,
                        total_amount: parseFloat(cancelledAmount || 0)
                    },
                    refunded: {
                        count: refundedCount,
                        total_amount: parseFloat(refundedAmount || 0)
                    }
                }
            };

            console.log('✅ SuperAppBillingController.getTabStats - Success:', response.data);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getTabStats - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get specific billing by ID
     * GET /superapp/billings/:id
     */
    static async getBillingById(req, res) {
        try {
            const { id } = req.params;
            console.log('🔍 SuperAppBillingController.getBillingById - ID:', id);

            const billing = await TenantPayment.findByPk(id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['id', 'name', 'price', 'duration_days']
                        }]
                    }
                ]
            });

            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            const response = {
                success: true,
                data: billing
            };

            console.log('✅ SuperAppBillingController.getBillingById - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getBillingById - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Generate manual billing
     * POST /superapp/billings/generate
     */
    static async generateBilling(req, res) {
        try {
            const { subscription_id, amount, due_date, notes } = req.body;
            console.log('🔍 SuperAppBillingController.generateBilling - Data:', { subscription_id, amount, due_date });

            // Validate required fields
            if (!subscription_id || !amount) {
                return res.status(400).send(ResponseHelper.errorResponse('Subscription ID and amount are required', 400));
            }

            // Get subscription details
            const subscription = await Subscription.findByPk(subscription_id, {
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan'
                }]
            });

            if (!subscription) {
                return res.status(404).send(ResponseHelper.errorResponse('Subscription not found', 404));
            }

            // Generate invoice number
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

            // Create billing
            const billing = await TenantPayment.create({
                subscription_id,
                tenant_id: subscription.tenant_id,
                amount: parseFloat(amount),
                status: 'pending',
                due_date: due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                invoice_number: invoiceNumber,
                notes: notes || `Manual billing for ${subscription.plan?.name || 'subscription'}`
            });

            const response = {
                success: true,
                message: 'Billing generated successfully',
                data: billing
            };

            console.log('✅ SuperAppBillingController.generateBilling - Success:', billing.id);

            return res.status(201).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.generateBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Generate manual billing with full control
     * POST /superapp/billings/generate-manual
     */
    static async generateManualBilling(req, res) {
        try {
            const { 
                tenant_id, 
                subscription_plan_id, 
                amount, 
                invoice_number, 
                payment_method, 
                due_date, 
                billing_period, 
                notes 
            } = req.body;
            
            console.log('🔍 SuperAppBillingController.generateManualBilling - Data:', { 
                tenant_id, 
                subscription_plan_id, 
                amount, 
                invoice_number 
            });

            // Validate required fields
            if (!tenant_id || !subscription_plan_id || !amount) {
                return res.status(400).send(ResponseHelper.errorResponse('Tenant ID, subscription plan ID, and amount are required', 400));
            }

            // Validate amount
            if (amount <= 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Amount must be greater than 0', 400));
            }

            // Check if tenant exists
            const tenant = await Tenant.findByPk(tenant_id);
            if (!tenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant not found', 404));
            }

            // Check if subscription plan exists
            const subscriptionPlan = await SubscriptionPlan.findByPk(subscription_plan_id);
            if (!subscriptionPlan) {
                return res.status(404).send(ResponseHelper.errorResponse('Subscription plan not found', 404));
            }

            // Generate invoice number if not provided
            let finalInvoiceNumber = invoice_number;
            if (!finalInvoiceNumber) {
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                finalInvoiceNumber = `INV-${dateStr}-${random}`;
            }

            // Check for duplicate invoice number
            const existingBilling = await TenantPayment.findOne({
                where: { invoice_number: finalInvoiceNumber }
            });
            if (existingBilling) {
                return res.status(400).send(ResponseHelper.errorResponse('Invoice number already exists', 400));
            }

            // Set default due date if not provided
            const finalDueDate = due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // Set default billing period if not provided
            const finalBillingPeriod = billing_period || new Date().toISOString().slice(0, 7);

            // Create manual billing
            const billing = await TenantPayment.create({
                tenant_id: parseInt(tenant_id),
                subscription_plan_id: parseInt(subscription_plan_id),
                amount: parseFloat(amount),
                status: 'unpaid',
                invoice_number: finalInvoiceNumber,
                payment_method: payment_method || 'manual_bank_transfer',
                due_date: finalDueDate,
                billing_period: finalBillingPeriod,
                notes: notes || 'Manual billing generated by SuperApp admin',
                is_manual: true,
                created_by: req.user?.id || null
            });

            // Fetch the created billing with relations
            const createdBilling = await TenantPayment.findByPk(billing.id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone']
                    },
                    {
                        model: SubscriptionPlan,
                        as: 'subscription_plan',
                        attributes: ['id', 'name', 'price', 'duration_days']
                    }
                ]
            });

            const response = {
                success: true,
                message: 'Manual billing generated successfully',
                data: createdBilling
            };

            console.log('✅ SuperAppBillingController.generateManualBilling - Success:', billing.id);

            return res.status(201).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.generateManualBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Mark payment as paid
     * PATCH /superapp/billings/:id/mark-paid
     */
    static async markAsPaid(req, res) {
        try {
            const { id } = req.params;
            const { amount, payment_method, payment_reference, paid_at, extend_days } = req.body;
            console.log('🔍 SuperAppBillingController.markAsPaid - ID:', id);

            const billing = await TenantPayment.findByPk(id, {
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

            // Update billing
            await billing.update({
                status: 'paid',
                amount: amount || billing.amount,
                payment_method: payment_method || billing.payment_method,
                payment_reference: payment_reference || billing.payment_reference,
                paid_at: paid_at || new Date(),
                notes: billing.notes || 'Payment recorded by SuperApp admin'
            });

            // If billing has subscription, extend the subscription and activate tenant
            if (billing.subscription) {
                const subscription = billing.subscription;
                const plan = subscription.plan;
                
                // Calculate new end date (default 30 days if not specified)
                const extendDays = extend_days || plan?.duration_days || 30;
                
                // Get current subscription end date
                const currentEndDate = new Date(subscription.end_date);
                const now = new Date();
                
                let newEndDate;
                
                // If subscription hasn't expired yet, extend from current end date
                if (currentEndDate > now) {
                    newEndDate = new Date(currentEndDate);
                    newEndDate.setDate(newEndDate.getDate() + extendDays);
                    console.log('✅ Extending active subscription from current end date');
                } else {
                    // If subscription has expired, extend from payment date (now)
                    newEndDate = new Date(now);
                    newEndDate.setDate(newEndDate.getDate() + extendDays);
                    console.log('✅ Extending expired subscription from payment date');
                }
                
                // Update subscription
                await subscription.update({
                    status: 'active',
                    end_date: newEndDate,
                    updatedAt: new Date()
                });
                
                console.log('✅ Subscription updated:', {
                    subscription_id: subscription.id,
                    new_end_date: newEndDate,
                    extend_days: extendDays
                });
                
                // Activate tenant
                const tenant = await Tenant.findByPk(billing.tenant_id);
                if (tenant) {
                    await tenant.update({
                        status: 'active',
                        subscription_status: 'active'
                    });
                    
                    console.log('✅ Tenant activated:', {
                        tenant_id: tenant.id,
                        status: 'active',
                        subscription_status: 'active'
                    });
                }
            }

            const response = {
                success: true,
                message: 'Payment marked as paid successfully and tenant activated',
                data: {
                    billing: billing,
                    tenant_activated: billing.subscription ? true : false,
                    subscription_extended: billing.subscription ? true : false
                }
            };

            console.log('✅ SuperAppBillingController.markAsPaid - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.markAsPaid - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Confirm payment by admin
     * PATCH /superapp/billings/:id/confirm
     */
    static async confirmPayment(req, res) {
        try {
            const { id } = req.params;
            const { admin_notes } = req.body;
            console.log('🔍 SuperAppBillingController.confirmPayment - ID:', id);

            const billing = await TenantPayment.findByPk(id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            // Update billing status
            await billing.update({
                status: 'paid',
                notes: admin_notes || 'Payment confirmed by admin',
                paid_at: billing.paid_at || new Date()
            });

            const response = {
                success: true,
                message: 'Payment confirmed successfully',
                data: billing
            };

            console.log('✅ SuperAppBillingController.confirmPayment - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.confirmPayment - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Refund payment
     * PATCH /superapp/billings/:id/refund
     */
    static async refundPayment(req, res) {
        try {
            const { id } = req.params;
            const { refund_amount, refund_reason } = req.body;
            console.log('🔍 SuperAppBillingController.refundPayment - ID:', id);

            const billing = await TenantPayment.findByPk(id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            // Update billing status
            await billing.update({
                status: 'refunded',
                refund_amount: refund_amount || billing.amount,
                refund_reason: refund_reason || 'Refunded by admin',
                refunded_at: new Date()
            });

            const response = {
                success: true,
                message: 'Payment refunded successfully',
                data: billing
            };

            console.log('✅ SuperAppBillingController.refundPayment - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.refundPayment - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Delete billing
     * DELETE /superapp/billings/:id
     */
    static async deleteBilling(req, res) {
        try {
            const { id } = req.params;
            console.log('🔍 SuperAppBillingController.deleteBilling - ID:', id);

            const billing = await TenantPayment.findByPk(id);
            if (!billing) {
                return res.status(404).send(ResponseHelper.errorResponse('Billing not found', 404));
            }

            await billing.destroy();

            const response = {
                success: true,
                message: 'Billing deleted successfully'
            };

            console.log('✅ SuperAppBillingController.deleteBilling - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.deleteBilling - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get all tenants for manual billing
     * GET /superapp/tenants
     */
    static async getAllTenants(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getAllTenants - Fetching tenants');

            const tenants = await Tenant.findAll({
                where: {
                    deletedAt: null,
                    is_verified: true
                },
                attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'createdAt'],
                order: [['business_name', 'ASC']]
            });

            const response = {
                success: true,
                data: tenants
            };

            console.log('✅ SuperAppBillingController.getAllTenants - Success:', tenants.length);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getAllTenants - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get tenant's current subscription
     * GET /superapp/tenants/:id/subscription
     */
    static async getTenantSubscription(req, res) {
        try {
            const { id } = req.params;
            console.log('🔍 SuperAppBillingController.getTenantSubscription - Tenant ID:', id);

            const subscription = await Subscription.findOne({
                where: { 
                    tenant_id: id,
                    status: { [Op.in]: ['trial', 'active'] } // ✅ Include both trial and active
                },
                include: [{
                    model: SubscriptionPlan,
                    as: 'plan',
                    attributes: ['id', 'name', 'price', 'duration_days', 'max_branches', 'max_users', 'features']
                }],
                order: [['createdAt', 'DESC']]
            });

            const response = {
                success: true,
                data: subscription
            };

            console.log('✅ SuperAppBillingController.getTenantSubscription - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getTenantSubscription - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get all subscription plans
     * GET /superapp/subscription-plans
     */
    static async getAllSubscriptionPlans(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getAllSubscriptionPlans - Fetching subscription plans');

            const subscriptionPlans = await SubscriptionPlan.findAll({
                where: {
                    is_active: true
                },
                attributes: ['id', 'name', 'price', 'duration_days', 'max_branches', 'max_users', 'features', 'description'],
                order: [['price', 'ASC']]
            });

            const response = {
                success: true,
                data: subscriptionPlans
            };

            console.log('✅ SuperAppBillingController.getAllSubscriptionPlans - Success:', subscriptionPlans.length);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getAllSubscriptionPlans - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get all subscriptions for billing
     * GET /superapp/subscriptions
     */
    static async getSubscriptions(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getSubscriptions - Fetching subscriptions');

            const subscriptions = await Subscription.findAll({
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    },
                    {
                        model: SubscriptionPlan,
                        as: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days', 'max_branches', 'max_users']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            const response = {
                success: true,
                data: subscriptions
            };

            console.log('✅ SuperAppBillingController.getSubscriptions - Success:', subscriptions.length);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getSubscriptions - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get specific subscription by ID
     * GET /superapp/subscriptions/:id
     */
    static async getSubscriptionById(req, res) {
        try {
            const { id } = req.params;
            console.log('🔍 SuperAppBillingController.getSubscriptionById - ID:', id);

            const subscription = await Subscription.findByPk(id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'phone']
                    },
                    {
                        model: SubscriptionPlan,
                        as: 'plan',
                        attributes: ['id', 'name', 'price', 'duration_days', 'max_branches', 'max_users', 'features']
                    }
                ]
            });

            if (!subscription) {
                return res.status(404).send(ResponseHelper.errorResponse('Subscription not found', 404));
            }

            const response = {
                success: true,
                data: subscription
            };

            console.log('✅ SuperAppBillingController.getSubscriptionById - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getSubscriptionById - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    // ========================================
    // BULK OPERATIONS
    // ========================================

    /**
     * Bulk mark payments as paid
     * POST /superapp/billings/bulk-mark-paid
     */
    static async bulkMarkAsPaid(req, res) {
        try {
            const { billing_ids, payment_method, payment_reference } = req.body;
            console.log('🔍 SuperAppBillingController.bulkMarkAsPaid - IDs:', billing_ids);

            if (!billing_ids || !Array.isArray(billing_ids) || billing_ids.length === 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing IDs are required', 400));
            }

            // Update all billings
            const [updatedCount] = await TenantPayment.update({
                status: 'paid',
                payment_method: payment_method || 'bulk_payment',
                payment_reference: payment_reference || `BULK-${Date.now()}`,
                paid_at: new Date()
            }, {
                where: {
                    id: { [Op.in]: billing_ids }
                }
            });

            const response = {
                success: true,
                message: `${updatedCount} payments marked as paid successfully`,
                data: {
                    updated_count: updatedCount,
                    billing_ids: billing_ids
                }
            };

            console.log('✅ SuperAppBillingController.bulkMarkAsPaid - Success:', updatedCount);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.bulkMarkAsPaid - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Bulk confirm payments
     * POST /superapp/billings/bulk-confirm
     */
    static async bulkConfirmPayments(req, res) {
        try {
            const { billing_ids, admin_notes } = req.body;
            console.log('🔍 SuperAppBillingController.bulkConfirmPayments - IDs:', billing_ids);

            if (!billing_ids || !Array.isArray(billing_ids) || billing_ids.length === 0) {
                return res.status(400).send(ResponseHelper.errorResponse('Billing IDs are required', 400));
            }

            // Update all billings
            const [updatedCount] = await TenantPayment.update({
                status: 'paid',
                admin_notes: admin_notes || 'Bulk confirmed by admin',
                confirmed_at: new Date()
            }, {
                where: {
                    id: { [Op.in]: billing_ids }
                }
            });

            const response = {
                success: true,
                message: `${updatedCount} payments confirmed successfully`,
                data: {
                    updated_count: updatedCount,
                    billing_ids: billing_ids
                }
            };

            console.log('✅ SuperAppBillingController.bulkConfirmPayments - Success:', updatedCount);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.bulkConfirmPayments - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Export billings data
     * POST /superapp/billings/export
     */
    static async exportBillings(req, res) {
        try {
            const { format = 'csv', filters = {} } = req.body;
            console.log('🔍 SuperAppBillingController.exportBillings - Format:', format);

            // Build where clause based on filters
            const whereClause = {};
            if (filters.status) whereClause.status = filters.status;
            if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
            if (filters.start_date && filters.end_date) {
                whereClause.created_at = {
                    [Op.between]: [new Date(filters.start_date), new Date(filters.end_date)]
                };
            }

            // Fetch billings for export
            const billings = await TenantPayment.findAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['business_name', 'owner_name', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            // For now, return JSON data
            // In production, you would generate actual CSV/Excel files
            const response = {
                success: true,
                message: 'Export data generated successfully',
                data: {
                    format: format,
                    total_records: billings.length,
                    billings: billings
                }
            };

            console.log('✅ SuperAppBillingController.exportBillings - Success:', billings.length);

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.exportBillings - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    // ========================================
    // ANALYTICS & REPORTING
    // ========================================

    /**
     * Get revenue analytics
     * GET /superapp/billings/analytics/revenue
     */
    static async getRevenueAnalytics(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getRevenueAnalytics - Fetching revenue analytics');

            // Get revenue by month for last 12 months
            const revenueByMonth = await TenantPayment.findAll({
                where: {
                    status: 'paid',
                    paid_at: {
                        [Op.gte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last 12 months
                    }
                },
                attributes: [
                    [TenantPayment.sequelize.fn('DATE_FORMAT', TenantPayment.sequelize.col('paid_at'), '%Y-%m'), 'month'],
                    [TenantPayment.sequelize.fn('SUM', TenantPayment.sequelize.col('amount')), 'revenue'],
                    [TenantPayment.sequelize.fn('COUNT', TenantPayment.sequelize.col('id')), 'count']
                ],
                group: [TenantPayment.sequelize.fn('DATE_FORMAT', TenantPayment.sequelize.col('paid_at'), '%Y-%m')],
                order: [[TenantPayment.sequelize.fn('DATE_FORMAT', TenantPayment.sequelize.col('paid_at'), '%Y-%m'), 'ASC']]
            });

            const response = {
                success: true,
                data: {
                    revenue_by_month: revenueByMonth,
                    total_revenue: revenueByMonth.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0),
                    total_payments: revenueByMonth.reduce((sum, item) => sum + parseInt(item.count || 0), 0)
                }
            };

            console.log('✅ SuperAppBillingController.getRevenueAnalytics - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getRevenueAnalytics - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get tenant performance analytics
     * GET /superapp/billings/analytics/tenants
     */
    static async getTenantAnalytics(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getTenantAnalytics - Fetching tenant analytics');

            // Get tenant performance data
            const tenantPerformance = await TenantPayment.findAll({
                where: { status: 'paid' },
                include: [{
                    model: Tenant,
                    as: 'tenant',
                    attributes: ['id', 'business_name']
                }],
                attributes: [
                    'tenant_id',
                    [TenantPayment.sequelize.fn('COUNT', TenantPayment.sequelize.col('id')), 'payment_count'],
                    [TenantPayment.sequelize.fn('SUM', TenantPayment.sequelize.col('amount')), 'total_paid'],
                    [TenantPayment.sequelize.fn('AVG', TenantPayment.sequelize.col('amount')), 'avg_payment']
                ],
                group: ['tenant_id', 'Tenant.id', 'Tenant.business_name'],
                order: [[TenantPayment.sequelize.fn('SUM', TenantPayment.sequelize.col('amount')), 'DESC']]
            });

            const response = {
                success: true,
                data: {
                    tenant_performance: tenantPerformance,
                    top_tenants: tenantPerformance.slice(0, 10)
                }
            };

            console.log('✅ SuperAppBillingController.getTenantAnalytics - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getTenantAnalytics - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    /**
     * Get billing trends
     * GET /superapp/billings/analytics/trends
     */
    static async getBillingTrends(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getBillingTrends - Fetching billing trends');

            // Get trends for last 30 days
            const trends = await TenantPayment.findAll({
                where: {
                    created_at: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                },
                attributes: [
                    [TenantPayment.sequelize.fn('DATE', TenantPayment.sequelize.col('created_at')), 'date'],
                    'status',
                    [TenantPayment.sequelize.fn('COUNT', TenantPayment.sequelize.col('id')), 'count'],
                    [TenantPayment.sequelize.fn('SUM', TenantPayment.sequelize.col('amount')), 'amount']
                ],
                group: [
                    TenantPayment.sequelize.fn('DATE', TenantPayment.sequelize.col('created_at')),
                    'status'
                ],
                order: [[TenantPayment.sequelize.fn('DATE', TenantPayment.sequelize.col('created_at')), 'ASC']]
            });

            const response = {
                success: true,
                data: {
                    trends: trends,
                    period: 'last_30_days'
                }
            };

            console.log('✅ SuperAppBillingController.getBillingTrends - Success');

            return res.status(200).send(response);
        } catch (error) {
            console.error('❌ SuperAppBillingController.getBillingTrends - Error:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Internal server error', 500));
        }
    }

    // Update billing status
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Validate status
            const validStatuses = ['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
            }

            // Find billing
            const billing = await TenantPayment.findByPk(id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant'
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [
                            {
                                model: SubscriptionPlan,
                                as: 'plan'
                            }
                        ]
                    }
                ]
            });

            if (!billing) {
                return res.status(404).json({
                    success: false,
                    message: 'Billing not found'
                });
            }

            // Update status
            await billing.update({ 
                status: status,
                updatedAt: new Date()
            });

            // Handle different status updates
            if (status === 'paid' && !billing.paid_at) {
                await billing.update({ paid_at: new Date() });
                
                // Activate tenant and subscription when marking as paid
                const TenantService = require('../services/tenantService');
                const SubscriptionRepository = require('../repositories/subscriptionRepository');
                
                try {
                    // Activate tenant
                    await TenantService.activateTenant(billing.tenant_id);
                    console.log(`✅ Activated tenant ${billing.tenant_id} due to paid billing`);
                    
                    // Update subscription status to active if exists
                    if (billing.subscription_id) {
                        await SubscriptionRepository.updateStatus(billing.subscription_id, 'active');
                        console.log(`✅ Updated subscription ${billing.subscription_id} to active`);
                    }
                } catch (error) {
                    console.error('❌ Error activating tenant/subscription:', error);
                    // Continue with response even if tenant update fails
                }
            }

            // If marking as failed, suspend tenant and update subscription status
            if (status === 'failed') {
                const TenantService = require('../services/tenantService');
                const SubscriptionRepository = require('../repositories/subscriptionRepository');
                
                try {
                    // Suspend tenant
                    await TenantService.suspendTenant(billing.tenant_id, 'Manual failed billing');
                    console.log(`✅ Suspended tenant ${billing.tenant_id} due to failed billing`);
                    
                    // Update subscription status to expired if exists
                    if (billing.subscription_id) {
                        await SubscriptionRepository.updateStatus(billing.subscription_id, 'expired');
                        console.log(`✅ Updated subscription ${billing.subscription_id} to expired`);
                    }
                } catch (error) {
                    console.error('❌ Error updating tenant/subscription status:', error);
                    // Continue with response even if tenant update fails
                }
            }

            // Note: cancelled and refunded statuses don't affect tenant status

            res.json({
                success: true,
                message: `Billing status updated to ${status}`,
                data: {
                    id: billing.id,
                    invoice_number: billing.invoice_number,
                    status: billing.status,
                    updated_at: billing.updatedAt
                }
            });

        } catch (error) {
            console.error('Error in updateStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update billing status',
                error: error.message
            });
        }
    }

    /**
     * Get unpaid billings - dedicated endpoint for unpaid tab
     * GET /superapp/billings/unpaid
     */
    static async getUnpaidBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getUnpaidBillings - Fetching unpaid billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                sort_by = 'created_at',
                sort_order = 'DESC',
                start_date = '',
                end_date = ''
            } = req.query;

            const whereClause = {
                status: 'unpaid'
            };
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${search}%` } }
                ];
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const offset = (page - 1) * limit;
            // Fix column name for sorting
            const sortColumn = sort_by === 'created_at' ? 'createdAt' : sort_by;
            const order = [[sortColumn, sort_order]];

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'phone', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order,
                limit: parseInt(limit),
                offset,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);
            const totalAmount = rows.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);

            console.log(`✅ Found ${count} unpaid billings, showing ${rows.length} on page ${page}`);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit)
                },
                stats: {
                    count,
                    total_amount: totalAmount
                }
            });

        } catch (error) {
            console.error('❌ Error fetching unpaid billings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch unpaid billings',
                error: error.message
            });
        }
    }

    /**
     * Get failed billings - dedicated endpoint for failed tab
     * GET /superapp/billings/failed
     */
    static async getFailedBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getFailedBillings - Fetching failed billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                sort_by = 'created_at',
                sort_order = 'DESC',
                start_date = '',
                end_date = ''
            } = req.query;

            const whereClause = {
                status: 'failed'
            };
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${search}%` } }
                ];
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const offset = (page - 1) * limit;
            // Fix column name for sorting
            const sortColumn = sort_by === 'created_at' ? 'createdAt' : sort_by;
            const order = [[sortColumn, sort_order]];

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'phone', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order,
                limit: parseInt(limit),
                offset,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);
            const totalAmount = rows.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);

            console.log(`✅ Found ${count} failed billings, showing ${rows.length} on page ${page}`);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit)
                },
                stats: {
                    count,
                    total_amount: totalAmount
                }
            });

        } catch (error) {
            console.error('❌ Error fetching failed billings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch failed billings',
                error: error.message
            });
        }
    }

    /**
     * Get pending billings - dedicated endpoint for pending tab
     * GET /superapp/billings/pending
     */
    static async getPendingBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getPendingBillings - Fetching pending billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                sort_by = 'created_at',
                sort_order = 'DESC',
                start_date = '',
                end_date = ''
            } = req.query;

            const whereClause = {
                status: 'pending'
            };
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${search}%` } }
                ];
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const offset = (page - 1) * limit;
            // Fix column name for sorting
            const sortColumn = sort_by === 'created_at' ? 'createdAt' : sort_by;
            const order = [[sortColumn, sort_order]];

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'phone', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order,
                limit: parseInt(limit),
                offset,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);
            const totalAmount = rows.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);

            console.log(`✅ Found ${count} pending billings, showing ${rows.length} on page ${page}`);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit)
                },
                stats: {
                    count,
                    total_amount: totalAmount
                }
            });

        } catch (error) {
            console.error('❌ Error fetching pending billings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pending billings',
                error: error.message
            });
        }
    }

    /**
     * Get paid billings - dedicated endpoint for paid tab
     * GET /superapp/billings/paid
     */
    static async getPaidBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getPaidBillings - Fetching paid billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                sort_by = 'created_at',
                sort_order = 'DESC',
                start_date = '',
                end_date = ''
            } = req.query;

            const whereClause = {
                status: 'paid'
            };
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${search}%` } }
                ];
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const offset = (page - 1) * limit;
            // Fix column name for sorting
            const sortColumn = sort_by === 'created_at' ? 'createdAt' : sort_by;
            const order = [[sortColumn, sort_order]];

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'phone', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order,
                limit: parseInt(limit),
                offset,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);
            const totalAmount = rows.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);

            console.log(`✅ Found ${count} paid billings, showing ${rows.length} on page ${page}`);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit)
                },
                stats: {
                    count,
                    total_amount: totalAmount
                }
            });

        } catch (error) {
            console.error('❌ Error fetching paid billings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch paid billings',
                error: error.message
            });
        }
    }

    /**
     * Get cancelled billings - dedicated endpoint for cancelled tab
     * GET /superapp/billings/cancelled
     */
    static async getCancelledBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getCancelledBillings - Fetching cancelled billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                sort_by = 'created_at',
                sort_order = 'DESC',
                start_date = '',
                end_date = ''
            } = req.query;

            const whereClause = {
                status: 'cancelled'
            };
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${search}%` } }
                ];
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const offset = (page - 1) * limit;
            // Fix column name for sorting
            const sortColumn = sort_by === 'created_at' ? 'createdAt' : sort_by;
            const order = [[sortColumn, sort_order]];

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'phone', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order,
                limit: parseInt(limit),
                offset,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);
            const totalAmount = rows.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);

            console.log(`✅ Found ${count} cancelled billings, showing ${rows.length} on page ${page}`);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit)
                },
                stats: {
                    count,
                    total_amount: totalAmount
                }
            });

        } catch (error) {
            console.error('❌ Error fetching cancelled billings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cancelled billings',
                error: error.message
            });
        }
    }

    /**
     * Get refunded billings - dedicated endpoint for refunded tab
     * GET /superapp/billings/refunded
     */
    static async getRefundedBillings(req, res) {
        try {
            console.log('🔍 SuperAppBillingController.getRefundedBillings - Fetching refunded billings');
            
            const {
                page = 1,
                limit = 10,
                search = '',
                sort_by = 'created_at',
                sort_order = 'DESC',
                start_date = '',
                end_date = ''
            } = req.query;

            const whereClause = {
                status: 'refunded'
            };
            
            if (search) {
                whereClause[Op.or] = [
                    { invoice_number: { [Op.like]: `%${search}%` } },
                    { '$tenant.business_name$': { [Op.like]: `%${search}%` } },
                    { '$tenant.owner_name$': { [Op.like]: `%${search}%` } }
                ];
            }
            
            if (start_date && end_date) {
                whereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const offset = (page - 1) * limit;
            // Fix column name for sorting
            const sortColumn = sort_by === 'created_at' ? 'createdAt' : sort_by;
            const order = [[sortColumn, sort_order]];

            const { count, rows } = await TenantPayment.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'phone', 'email']
                    },
                    {
                        model: Subscription,
                        as: 'subscription',
                        include: [{
                            model: SubscriptionPlan,
                            as: 'plan',
                            attributes: ['name', 'price']
                        }]
                    }
                ],
                order,
                limit: parseInt(limit),
                offset,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);
            const totalAmount = rows.reduce((sum, billing) => sum + parseFloat(billing.amount || 0), 0);

            console.log(`✅ Found ${count} refunded billings, showing ${rows.length} on page ${page}`);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: count,
                    items_per_page: parseInt(limit)
                },
                stats: {
                    count,
                    total_amount: totalAmount
                }
            });

        } catch (error) {
            console.error('❌ Error fetching refunded billings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch refunded billings',
                error: error.message
            });
        }
    }
}

module.exports = SuperAppBillingController;
