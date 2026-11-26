const { InvoiceToken, InvoiceAccessLog, Order, Customer, Payment, PaymentDetail, FinanceTransaction, OrderDetail, Item, Treatment, User, ShoePhoto, Discount, Tenant, Branch, OrderDetailStatusLog, ItemStatusPhoto, PointTransaction } = require('../models');
const { Op } = require('sequelize');
const { transformOrderToInvoiceResponse } = require('../helpers/transformInvoiceHelper');
const PrinterSettingsService = require('../services/printerSettingsService');
const InvoiceDigitalSettingsService = require('../services/invoiceDigitalSettingsService');
const PointsSettingsService = require('../services/pointsSettingsService');
const PointService = require('../services/pointService');

class InvoiceRepository {
    static async findByToken(token) {
        const invoiceToken = await InvoiceToken.findOne({
            where: { token },
            include: [
                {
                    model: Order,
                    as: 'order',
                    include: [
                        {
                            model: Customer,
                            as: 'customer',
                            attributes: { exclude: ['password'] },
                            include: [
                                {
                                    model: require('../models').CustomerMembership,
                                    as: 'current_membership',
                                    attributes: ['id', 'status', 'start_date', 'end_date'],
                                    include: [{
                                        model: require('../models').Membership,
                                        as: 'membership',
                                        attributes: ['id', 'name', 'discount_percentage']
                                    }]
                                }
                            ]
                        },
                        {
                            model: Payment,
                            as: 'payment',
                            attributes: {
                                exclude: [] // Include all fields including points_discount and membership_discount
                            },
                            include: [
                                {
                                    model: Discount,
                                    as: 'discount',
                                    attributes: ['id', 'name', 'type', 'discount', 'is_active']
                                },
                                {
                                    model: PaymentDetail,
                                    as: 'payment_details',
                                    include: [
                                        {
                                            model: FinanceTransaction,
                                            as: 'transaction',
                                            attributes: ['id', 'account_id'],
                                            include: [
                                                {
                                                    model: require('../models').FinanceAccount,
                                                    as: 'finance_account',
                                                    attributes: ['id', 'name', 'payment_method_id'],
                                                    include: [
                                                        {
                                                            model: require('../models').PaymentMethod,
                                                            as: 'payment_method',
                                                            attributes: ['id', 'name', 'code', 'type', 'icon']
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: OrderDetail,
                            as: 'order_details',
                            include: [
                                { model: Item, as: 'item' },
                                { model: Treatment, as: 'treatment' },
                                { model: User, as: 'employee' },
                                { model: Discount, as: 'discount' },
                                { model: ShoePhoto, as: 'shoes_photos' },
                                { model: User, as: 'courier', attributes: ['id', 'name'] },
                                {
                                    model: OrderDetailStatusLog,
                                    as: 'status_logs',
                                    attributes: ['id', 'old_status', 'new_status', 'created_at', 'updated_by'],
                                    include: [
                                        {
                                            model: ItemStatusPhoto,
                                            as: 'item_status_photos',
                                            attributes: ['id', 'photo_url', 'createdAt']
                                        },
                                        {
                                            model: User,
                                            as: 'status_updater',
                                            attributes: ['id', 'name']
                                        }
                                    ],
                                    order: [['created_at', 'DESC']]
                                },
                            ],
                        },
                        {
                            model: Tenant,
                            as: 'tenant',
                            attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'address', 'status']
                        },
                        {
                            model: Branch,
                            as: 'branch',
                            attributes: ['id', 'name', 'address', 'phone', 'status']
                        },
                    ],
                },
            ],
        });
        if (!invoiceToken || !invoiceToken.order) return null;
        // Transform order ke format response invoice FE
        const invoiceResponse = transformOrderToInvoiceResponse(invoiceToken.order.toJSON());
        
        // Fetch printer settings untuk footer digital invoice (hanya yang relevan)
        let printerSettings = null;
        try {
            const tenantId = invoiceToken.order.tenant?.id;
            if (tenantId) {
                const fullPrinterSettings = await PrinterSettingsService.getSettings(tenantId);
                // Hanya include atribut yang relevan untuk digital invoice footer (exclude show_logo, logo_url, show_qr_code)
                printerSettings = {
                    custom_thank_you: fullPrinterSettings.custom_thank_you || null,
                    footer_notes: fullPrinterSettings.footer_notes || null,
                    instagram: fullPrinterSettings.instagram || null,
                    website: fullPrinterSettings.website || null,
                    promo_text: fullPrinterSettings.promo_text || null
                };
            }
        } catch (error) {
            console.error('Error fetching printer settings for invoice:', error);
            // Jika error, set ke null (fallback ke default footer)
            printerSettings = null;
        }
        
        // Fetch invoice digital settings untuk logo & warna
        let invoiceDigitalSettings = null;
        try {
            const tenantId = invoiceToken.order.tenant?.id;
            if (tenantId) {
                invoiceDigitalSettings = await InvoiceDigitalSettingsService.getSettings(tenantId);
            }
        } catch (error) {
            console.error('Error fetching invoice digital settings for invoice:', error);
            invoiceDigitalSettings = null;
        }
        
        // Fetch points settings untuk reward poin section (hanya enabled dan earn_rate)
        let pointsSettings = null;
        try {
            const tenantId = invoiceToken.order.tenant?.id;
            if (tenantId) {
                const fullPointsSettings = await PointsSettingsService.getSettings(tenantId);
                // Hanya include atribut yang relevan untuk invoice (enabled dan earn_rate)
                pointsSettings = {
                    enabled: fullPointsSettings.enabled !== undefined ? Boolean(fullPointsSettings.enabled) : false,
                    earn_rate: fullPointsSettings.earn_rate !== undefined ? Number(fullPointsSettings.earn_rate) : 1000
                };
            }
        } catch (error) {
            console.error('Error fetching points settings for invoice:', error);
            // Jika error, set ke null (fallback: poin tidak ditampilkan)
            pointsSettings = null;
        }
        
        // Fetch bonus points dari PointTransaction untuk order ini
        let bonusPoints = { firstOrder: 0, referral: 0 };
        try {
            const orderId = invoiceToken.order.id;
            const customerId = invoiceToken.order.customer?.id;
            if (orderId && customerId) {
                // Query PointTransaction untuk order ini dengan type='bonus'
                // ✅ FIX: Filter berdasarkan customer_id juga, hanya ambil bonus untuk customer yang membuat order ini
                // Jangan ambil bonus untuk referrer (customer lain)
                const bonusTransactions = await PointTransaction.findAll({
                    where: {
                        order_id: orderId,
                        customer_id: customerId, // ✅ Hanya bonus untuk customer yang membuat order ini
                        type: 'bonus',
                        points: { [Op.gt]: 0 }
                    },
                    attributes: ['id', 'points', 'description', 'type', 'customer_id', 'bonus_type']
                });
                
                // ✅ FIX: Prioritaskan bonus_type field, fallback ke description (konsisten dengan InvoiceContentPreview.jsx)
                bonusTransactions.forEach(pt => {
                    const points = Number(pt.points || 0);
                    
                    // Prioritaskan bonus_type field jika ada
                    if (pt.bonus_type) {
                        if (pt.bonus_type === 'first_order') {
                            bonusPoints.firstOrder += points;
                        } else if (pt.bonus_type === 'referral_new_customer') {
                            bonusPoints.referral += points;
                        }
                    } else {
                        // Fallback ke description untuk backward compatibility
                        const description = (pt.description || '').toLowerCase();
                        if (description.includes('first order bonus')) {
                            bonusPoints.firstOrder += points;
                        } else if (description.includes('referral bonus')) {
                            bonusPoints.referral += points;
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching bonus points for invoice:', error);
            // Jika error, set ke default (fallback: tidak ada bonus)
            bonusPoints = { firstOrder: 0, referral: 0 };
        }
        
        // ✅ FIX: Fetch points_discount dari PointTransaction dengan type='redeem' untuk order ini
        let pointsDiscountAmount = 0;
        try {
            const orderId = invoiceToken.order.id;
            const customerId = invoiceToken.order.customer?.id;
            const tenantId = invoiceToken.order.tenant?.id;
            if (orderId && customerId && tenantId) {
                // Query PointTransaction untuk order ini dengan type='redeem'
                const redeemTransactions = await PointTransaction.findAll({
                    where: {
                        order_id: orderId,
                        customer_id: customerId,
                        type: 'redeem',
                        points: { [Op.lt]: 0 } // Redeem adalah negative points
                    },
                    attributes: ['id', 'points', 'description', 'type', 'customer_id']
                });
                
                if (redeemTransactions && redeemTransactions.length > 0) {
                    // Hitung total points yang di-redeem (convert negative to positive)
                    const totalPointsRedeemed = Math.abs(redeemTransactions.reduce((sum, pt) => sum + Number(pt.points || 0), 0));
                    
                    if (totalPointsRedeemed > 0) {
                        // Get redeem_rate dari point config
                        const pointConfig = await PointService.getPointConfig(tenantId);
                        const redeemRateValue = pointConfig.redeem_rate * 100; // Convert to rupiah (e.g., 50 -> 5000)
                        
                        // Calculate discount amount: (points / 100) * (redeem_rate * 100)
                        pointsDiscountAmount = Math.floor((totalPointsRedeemed / 100) * redeemRateValue);
                        
                        console.log(`✅ InvoiceRepository - Points discount calculated: ${totalPointsRedeemed} points = Rp ${pointsDiscountAmount.toLocaleString('id-ID')} (redeem_rate: ${pointConfig.redeem_rate}, value: Rp ${redeemRateValue})`);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching points discount for invoice:', error);
            // Jika error, set ke default (fallback: tidak ada points discount)
            pointsDiscountAmount = 0;
        }
        
        // ✅ FIX: Tambahkan points_discount dan membership_discount ke payment object
        if (invoiceResponse.payment) {
            // Jika payment sudah ada points_discount dari database, gunakan itu
            // Jika tidak, gunakan yang dihitung dari PointTransaction
            if (!invoiceResponse.payment.points_discount && pointsDiscountAmount > 0) {
                invoiceResponse.payment.points_discount = pointsDiscountAmount;
            }
            
            // Membership discount biasanya sudah ada di payment object dari database
            // Jika tidak ada, set ke 0
            if (!invoiceResponse.payment.membership_discount) {
                invoiceResponse.payment.membership_discount = 0;
            }
        }
        
        // Batasi atribut yang di-expose
        return {
            id: invoiceToken.id,
            order_id: invoiceToken.order_id,
            token: invoiceToken.token,
            status: invoiceToken.status,
            createdAt: invoiceToken.createdAt,
            updatedAt: invoiceToken.updatedAt,
            order: invoiceResponse,
            tenant: invoiceToken.order.tenant,
            branch: invoiceToken.order.branch,
            printer_settings: printerSettings,
            invoice_digital_settings: invoiceDigitalSettings,
            points_settings: pointsSettings,
            bonus_points: bonusPoints
        };
    }

    static async createAccessLog(data) {
        return await InvoiceAccessLog.create(data);
    }

    static async getAccessLogsByToken(token) {
        const invoiceToken = await InvoiceToken.findOne({ where: { token } });
        if (!invoiceToken) return [];
        return await InvoiceAccessLog.findAll({
            where: { invoice_token_id: invoiceToken.id },
            include: [{ model: Customer, as: 'customer' }],
            order: [['accessed_at', 'DESC']],
        });
    }
}

module.exports = InvoiceRepository; 