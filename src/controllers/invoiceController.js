const invoiceService = require('../services/invoiceService');
const { ResponseHelper } = require('../helpers');
const { encryptAes } = require('../helpers/encryptAesHelper');
const invoiceWaTemplate = require('../templateWa/invoice');
const waGatewayHelper = require('../helpers/waGatewayHelper');
const InvoiceTemplateService = require('../services/invoiceTemplateService');
const { Tenant, Branch } = require('../models');


const getInvoiceUrl = (token) => {
    const baseUrl = process.env.INVOICE_URL || 'http://localhost:5173';
    return `${baseUrl}/invoice/${token}`;
};

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function formatRupiah(amount) {
    if (!amount || isNaN(amount)) return '-';
    return 'Rp' + Number(amount).toLocaleString('id-ID');
}

function cleanPhoneNumber(phone) {
    if (!phone) return '';
    // Hapus semua karakter non-digit
    let cleaned = phone.replace(/[^0-9]/g, '');
    // Jika diawali 08, ganti dengan 628
    if (cleaned.startsWith('08')) {
        cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
}

/**
 * Memastikan session WhatsApp tersedia dan siap untuk branch tertentu
 */
async function ensureWhatsAppSession(branchId = null, tenantId = null) {
    try {
        const { WaSession } = require('../models');

        // Cari session yang ready untuk branch dan tenant ini dari database
        const readySession = await WaSession.findOne({
            where: {
                branch_id: branchId,
                tenant_id: tenantId,
                status: 'READY'
            },
            order: [['updated_at', 'DESC']] // Ambil yang terbaru
        });

        if (readySession) {
            // Cek status session di gateway untuk memastikan masih aktif
            const status = await waGatewayHelper.checkStatus(readySession.session_id, branchId);
            if (status.success && status.status === 'READY') {
                return {
                    success: true,
                    sessionId: readySession.session_id,
                    phone_number: readySession.phone_number
                };
            } else {
                // Session di DB READY tapi di gateway tidak, update status
                await readySession.update({ status: 'DISCONNECTED' });
            }
        }

        // Jika tidak ada session ready, cari session PENDING
        const pendingSession = await WaSession.findOne({
            where: {
                branch_id: branchId,
                tenant_id: tenantId,
                status: 'PENDING'
            },
            order: [['created_at', 'DESC']]
        });

        if (pendingSession) {
            return {
                success: true,
                sessionId: pendingSession.session_id,
                needsQR: true,
                message: 'Session exists but waiting for QR scan'
            };
        }

        // Jika tidak ada session sama sekali, buat session baru
        const createResult = await waGatewayHelper.createSession(branchId, tenantId);
        if (createResult.success) {
            // Simpan session baru ke database
            await WaSession.create({
                session_id: createResult.sessionId,
                tenant_id: tenantId,
                branch_id: branchId,
                status: 'PENDING'
            });

            return {
                success: true,
                sessionId: createResult.sessionId,
                needsQR: true,
                message: 'New session created. Please scan QR code.'
            };
        }

        return {
            success: false,
            message: 'Failed to create WhatsApp session for this branch'
        };
    } catch (error) {
        console.error('Error ensuring WhatsApp session:', error);
        return {
            success: false,
            message: 'Error ensuring WhatsApp session: ' + error.message
        };
    }
}

class InvoiceController {
    // GET /invoice/:token
    static async getInvoiceByToken(req, res) {
        try {
            const { token } = req.params;
            const invoice = await invoiceService.getInvoiceByToken(token);
            if (!invoice) return res.status(404).json(ResponseHelper.errorResponse('Invoice not found'));
            // Log akses invoice
            await invoiceService.logInvoiceAccess({
                invoice_token_id: invoice.id,
                order_id: invoice.order_id,
                accessed_at: new Date(),
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                customer_id: req.user ? req.user.id : null,
                email: req.user ? req.user.email : null,
            });
            // Encrypt response
            const encrypted = encryptAes(JSON.stringify(invoice));
            return res.status(200).json({ data: encrypted });
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // POST /invoice/:token/send
    static async sendInvoice(req, res) {
        try {
            // Implementasi pengiriman invoice (email/wa) di sini
            // Placeholder: return sukses
            return res.status(200).json(ResponseHelper.successResponse({ message: 'Invoice sent (dummy)' }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // GET /invoice/:token/access-logs
    static async getInvoiceAccessLogs(req, res) {
        try {
            const { token } = req.params;
            const logs = await invoiceService.getInvoiceAccessLogs(token);
            return res.status(200).json(ResponseHelper.successResponse(logs));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // PATCH /invoice/:token/status
    static async updateInvoiceStatus(req, res) {
        try {
            const { token } = req.params;
            const { status } = req.body;
            if (!status) return res.status(400).json(ResponseHelper.errorResponse('Status is required'));
            await invoiceService.updateInvoiceTokenStatus(token, status);
            return res.status(200).json(ResponseHelper.successResponse({ message: 'Invoice status updated', status }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // POST /invoice/send-by-order-id
    static async sendInvoiceByOrderId(req, res) {
        try {
            const { order_id, branch_id } = req.body;
            if (!order_id) return res.status(400).json(ResponseHelper.errorResponse('order_id is required'));

            // Get branch_id from request body or user data
            const targetBranchId = branch_id || req.user?.branch_id;
            if (!targetBranchId) {
                return res.status(400).json(ResponseHelper.errorResponse('branch_id is required'));
            }
            // Cari token invoice berdasarkan order_id
            let invoiceToken = await invoiceService.findTokenByOrderId(order_id);
            if (!invoiceToken) {
                invoiceToken = await invoiceService.generateAndSaveInvoiceToken(order_id);
            }
            const invoiceUrl = getInvoiceUrl(invoiceToken.token);
            // Ambil data order untuk dapatkan nomor customer dan info lain
            const order = await invoiceService.getOrderById(order_id);
            if (!order || !order.customer_phone || !order.customer_name) {
                return res.status(404).json(ResponseHelper.errorResponse('Customer phone not found'));
            }
            // Format nomor WA (hanya angka, awalan 62)
            let to = cleanPhoneNumber(order.customer_phone);

            // get tenant id from branch_id
            const branch = await Branch.findOne({
                where: {
                    id: targetBranchId
                }
            });

            const tenant = await Tenant.findOne({
                where: {
                    id: branch.tenant_id
                }
            });

            // Generate pesan dengan template dari database
            let text;
            try {
                // Coba ambil template dari database
                const template = await InvoiceTemplateService.getInvoiceTemplate(
                    branch.tenant_id, 
                    targetBranchId, 
                    order.payment_status
                );
                
                if (template) {
                    // Process template dengan variables
                    const greeting = getGreeting();
                    const variables = {
                        customer_name: order.customer_name,
                        tenant_name: tenant.business_name,
                        order_number: order.payment_code,
                        total_amount: formatRupiah(order.total_amount),
                        paid_amount: formatRupiah(order.total_paid),
                        remaining_amount: formatRupiah(order.remaining_amount),
                        total_payment: formatRupiah(order.total_paid || order.total_amount),
                        invoice_url: invoiceUrl,
                        greeting: greeting
                    };
                    
                    const processedTemplate = await InvoiceTemplateService.processInvoiceTemplate(
                        template.id, 
                        variables
                    );
                    text = processedTemplate.processed_content;
                } else {
                    // Fallback ke template hardcoded
                    text = invoiceWaTemplate({
                        customerName: order.customer_name,
                        orderNumber: order.payment_code,
                        amount: order.payment_final_price,
                        totalAmount: order.total_amount,
                        totalPaid: order.total_paid,
                        remainingAmount: order.remaining_amount,
                        paymentStatus: order.payment_status,
                        invoiceUrl,
                        tenantName: tenant.business_name
                    });
                }
            } catch (templateError) {
                console.error('❌ Template processing error:', templateError);
                // Fallback ke template hardcoded
                text = invoiceWaTemplate({
                    customerName: order.customer_name,
                    orderNumber: order.payment_code,
                    amount: order.payment_final_price,
                    totalAmount: order.total_amount,
                    totalPaid: order.total_paid,
                    remainingAmount: order.remaining_amount,
                    paymentStatus: order.payment_status,
                    invoiceUrl,
                    tenantName: tenant.business_name
                });
            }

            // Pastikan ada session WhatsApp yang aktif untuk branch dan tenant ini
            const tenantId = req.user?.tenant_id;
            const sessionResult = await ensureWhatsAppSession(targetBranchId, tenantId);
            if (!sessionResult.success) {
                return res.status(500).json(ResponseHelper.errorResponse(sessionResult.message));
            }

            const sessionId = sessionResult.sessionId;

            // Jika session baru dibuat, beri tahu user untuk scan QR
            if (sessionResult.needsQR) {
                return res.status(200).json(ResponseHelper.successResponse({
                    message: sessionResult.message,
                    sessionId: sessionId,
                    needsQR: true,
                    invoiceUrl,
                    phone: to,
                    message: text
                }));
            }

            // Kirim ke wa-gateway menggunakan waGatewayHelper
            console.log(`📱 Sending invoice to ${to} for order ${order_id}`);
            const waData = await waGatewayHelper.sendMessage(to, text, sessionId);

            // Update status invoice token menjadi 'sent' jika sukses
            if (waData.success) {
                await invoiceService.updateInvoiceTokenStatus(invoiceToken.token, 'sent');
                console.log(`✅ Invoice sent successfully to ${to}`);
            } else {
                console.error(`❌ Failed to send invoice to ${to}:`, waData.message);
            }

            return res.status(200).json(ResponseHelper.successResponse({
                ...waData,
                invoiceUrl,
                phone: to,
                message: text,
                sessionId: sessionId
            }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // GET /invoice/url-by-order-id?order_id=123
    static async getInvoiceUrlByOrderId(req, res) {
        try {
            const { order_id } = req.query;
            if (!order_id) return res.status(400).json(ResponseHelper.errorResponse('order_id is required'));
            let invoiceToken = await invoiceService.findTokenByOrderId(order_id);
            if (!invoiceToken) {
                invoiceToken = await invoiceService.generateAndSaveInvoiceToken(order_id);
            }
            const invoiceUrl = getInvoiceUrl(invoiceToken.token);
            // Tambahkan status token ke response
            return res.status(200).json(ResponseHelper.successResponse({ invoiceUrl, status: invoiceToken.status }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // GET /invoice/preview-by-order-id?order_id=123
    static async previewInvoiceByOrderId(req, res) {
        try {
            const { order_id } = req.query;
            if (!order_id) return res.status(400).json(ResponseHelper.errorResponse('order_id is required'));

            // Pastikan ada token untuk membangun URL
            let invoiceToken = await invoiceService.findTokenByOrderId(order_id);
            if (!invoiceToken) {
                const token = await invoiceService.generateAndSaveInvoiceToken(order_id);
                invoiceToken = { token };
            }
            const invoiceUrl = getInvoiceUrl(invoiceToken.token);

            // Ambil detail order + status pembayaran
            const order = await invoiceService.getOrderById(order_id);
            if (!order) return res.status(404).json(ResponseHelper.errorResponse('Order not found'));

            // Build text via template
            const text = invoiceWaTemplate({
                customerName: order.customer_name,
                orderNumber: order.payment_code,
                amount: order.payment_final_price,
                totalAmount: order.total_amount,
                totalPaid: order.total_paid,
                remainingAmount: order.remaining_amount,
                paymentStatus: order.payment_status,
                invoiceUrl
            });

            console.log('\n===== INVOICE PREVIEW =====');
            console.log(text);
            console.log('===========================\n');

            return res.status(200).json(ResponseHelper.successResponse({
                text,
                invoiceUrl,
                paymentStatus: order.payment_status,
                totalAmount: order.total_amount,
                totalPaid: order.total_paid,
                remainingAmount: order.remaining_amount,
            }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }
    // POST /invoice/generate-bulk-july-2025
    static async generateBulkInvoiceTokenJuly2025(req, res) {
        try {
            const startDate = '2025-07-01';
            const endDate = '2025-07-31';
            // Ambil semua order di bulan Juli 2025
            const orders = await invoiceService.getOrdersByDateRange(startDate, endDate);
            let updated = 0;
            for (const order of orders) {
                const existing = await invoiceService.findTokenByOrderId(order.id);
                if (!existing) {
                    await invoiceService.generateAndSaveInvoiceToken(order.id);
                    updated++;
                } else {
                    // Update token lama ke token baru (nanoid)
                    await invoiceService.updateInvoiceTokenToShort(order.id);
                    updated++;
                }
            }
            return res.status(200).json(ResponseHelper.successResponse({ message: `Invoice token updated for ${updated} orders in July 2025` }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // GET /invoice/wa-status
    static async getWhatsAppStatus(req, res) {
        try {
            const sessionResult = await ensureWhatsAppSession();

            if (!sessionResult.success) {
                return res.status(500).json(ResponseHelper.errorResponse(sessionResult.message));
            }

            const sessionId = sessionResult.sessionId;
            const status = await waGatewayHelper.checkStatus(sessionId);

            return res.status(200).json(ResponseHelper.successResponse({
                sessionId: sessionId,
                status: status.status,
                needsQR: sessionResult.needsQR || false,
                message: sessionResult.message || 'WhatsApp session is ready'
            }));
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }

    // GET /invoice/wa-qr
    static async getWhatsAppQR(req, res) {
        try {
            const sessionId = waGatewayHelper.getCurrentSessionId();
            if (!sessionId) {
                return res.status(400).json(ResponseHelper.errorResponse('No active WhatsApp session'));
            }

            const qrResult = await waGatewayHelper.getQRCode(sessionId);

            if (qrResult.success) {
                return res.status(200).json(ResponseHelper.successResponse({
                    sessionId: sessionId,
                    qrCode: qrResult.qrCode
                }));
            } else {
                return res.status(500).json(ResponseHelper.errorResponse(qrResult.message));
            }
        } catch (err) {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    }
}

module.exports = InvoiceController; 