const TenantOrderRepository = require('../repositories/tenantOrderRepository');
const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
const WAVerificationRepository = require('../repositories/waVerificationRepository');
const WAService = require('../services/waService');
const AccountCreationService = require('../services/accountCreationService');
const ResponseHelper = require('../helpers/responseHelper');
const { cleanPhoneNumber, validatePhoneNumber } = require('../helpers/phoneHelper');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mailerServices = require('../services/mailerServices');
const EmailNotificationService = require('../services/email/emailNotificationService');

class TenantOrderController {
    // Submit tenant order form
    static async submitOrder(req, res) {
        try {
            const {
                business_name,
                owner_name,
                email,
                business_whatsapp,
                owner_whatsapp,
                address,
                city,
                selected_plan,
                plan_id,
                password,
                confirm_password
            } = req.body;

            // Validate required fields (plan is optional — defaults to NotaPro)
            if (!business_name || !owner_name || !email || !business_whatsapp || !address || !city) {
                return res.status(400).send(ResponseHelper.errorResponse('Semua field harus diisi'));
            }

            // Validate password fields
            if (!password || !confirm_password) {
                return res.status(400).send(ResponseHelper.errorResponse('Password dan konfirmasi password harus diisi'));
            }

            if (password !== confirm_password) {
                return res.status(400).send(ResponseHelper.errorResponse('Password dan konfirmasi password tidak cocok'));
            }

            // Validate password strength
            if (password.length < 8) {
                return res.status(400).send(ResponseHelper.errorResponse('Password minimal 8 karakter'));
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
            if (!passwordRegex.test(password)) {
                return res.status(400).send(ResponseHelper.errorResponse('Password harus mengandung minimal 1 huruf kecil, 1 huruf besar, dan 1 angka'));
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).send(ResponseHelper.errorResponse('Format email tidak valid'));
            }

            // Validate and format WhatsApp numbers
            if (!validatePhoneNumber(business_whatsapp)) {
                return res.status(400).send(ResponseHelper.errorResponse('Format nomor WhatsApp Bisnis tidak valid. Gunakan format: 08xx-xxxx-xxxx atau +62-8xx-xxxx-xxxx'));
            }
            
            // Format WhatsApp numbers for storage
            const formattedBusinessWhatsapp = cleanPhoneNumber(business_whatsapp);
            
            // WA Owner is optional — only validate if provided
            let formattedOwnerWhatsapp = '';
            if (owner_whatsapp && owner_whatsapp.trim()) {
                if (!validatePhoneNumber(owner_whatsapp)) {
                    return res.status(400).send(ResponseHelper.errorResponse('Format nomor WhatsApp Owner tidak valid. Gunakan format: 08xx-xxxx-xxxx atau +62-8xx-xxxx-xxxx'));
                }
                formattedOwnerWhatsapp = cleanPhoneNumber(owner_whatsapp);
            }

            // Check if email already exists
            const emailCheck = await TenantOrderRepository.checkEmailExists(email);
            if (emailCheck.exists) {
                return res.status(400).send(ResponseHelper.errorResponse(
                    `Email ${email} sudah terdaftar untuk bisnis "${emailCheck.business_name}" (${emailCheck.owner_name}). Silakan gunakan email lain.`
                ));
            }

            // Check if Owner WhatsApp number already exists (only if provided)
            if (formattedOwnerWhatsapp) {
                const ownerWhatsappCheck = await TenantOrderRepository.checkWhatsAppExists(formattedOwnerWhatsapp);
                if (ownerWhatsappCheck.exists) {
                    return res.status(400).send(ResponseHelper.errorResponse(
                        `Nomor WhatsApp Owner ${owner_whatsapp} sudah terdaftar untuk bisnis "${ownerWhatsappCheck.business_name}" (${ownerWhatsappCheck.owner_name}). Silakan gunakan nomor WhatsApp lain.`
                    ));
                }
            }

            // Validate selected plan (default to NotaPro id=1 if not provided)
            const planId = plan_id || selected_plan || 1;
            const plan = await SubscriptionPlanRepository.getById(planId);
            if (!plan || !plan.is_active) {
                return res.status(400).send(ResponseHelper.errorResponse('Paket yang dipilih tidak valid atau tidak aktif'));
            }

            // Hash password (consistent with system standard)
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // ✅ COMMENTED OUT: Verification token generation (not needed anymore)
            // const verificationToken = crypto.randomBytes(32).toString('hex');
            // const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Create order (map to model fields for backward compatibility)
            const orderData = {
                business_name,
                owner_name,
                email,
                phone: formattedBusinessWhatsapp, // Map business_whatsapp to phone for TenantOrder model
                whatsapp: formattedOwnerWhatsapp || '-', // Map owner_whatsapp to whatsapp for TenantOrder model
                business_whatsapp: formattedBusinessWhatsapp, // Keep for accountCreationService
                owner_whatsapp: formattedOwnerWhatsapp || null, // Keep for accountCreationService
                address,
                city,
                selected_plan,
                plan_id: planId,
                password: hashedPassword,
                // verification_token: verificationToken, // ✅ COMMENTED OUT
                // verification_expires_at: verificationExpiresAt, // ✅ COMMENTED OUT
                status: 'account_created' // ✅ Changed from 'pending_link_verification' to 'account_created'
            };

            const order = await TenantOrderRepository.create(orderData);

            // 🚀 NEW: Create tenant immediately with is_verified = true (no verification needed)
            console.log('🔄 Creating verified tenant account...');
            const accountResult = await AccountCreationService.createCompleteAccount(orderData, true); // skipWhatsApp = true
            
            // ✅ COMMENTED OUT: No need to set as unverified since accountCreationService now sets is_verified = true
            // const TenantRepository = require('../repositories/tenantRepository');
            // await TenantRepository.updateVerificationStatus(accountResult.tenant_id, false);

            console.log('✅ Verified tenant created:', {
                tenant_id: accountResult.tenant_id,
                business_name: orderData.business_name,
                is_verified: true
            });

            // 📧 Send email notification to admin (non-blocking)
            mailerServices.sendTenantRegistrationNotification({
                business_name,
                owner_name,
                email,
                whatsapp: owner_whatsapp,
                selected_plan,
                city,
                tenant_id: accountResult.tenant_id
            }).catch(err => {
                console.error('⚠️ Email notification to admin failed:', err);
            });

            // 📧 Send welcome email to tenant owner (non-blocking)
            EmailNotificationService.sendTenantAccountCreated({
                tenant_email: email,
                tenant_name: business_name,
                owner_name,
                plan_name: plan.name,
                trial_days: 7
            }).catch(err => {
                console.error('⚠️ Welcome email to tenant failed:', err);
            });

            return res.status(201).send(ResponseHelper.successResponse({
                order_id: order.id,
                tenant_id: accountResult.tenant_id,
                status: order.status,
                // verification_token: verificationToken, // ✅ COMMENTED OUT
                message: 'Order berhasil dibuat, akun tenant sudah aktif dan siap digunakan'
            }));
        } catch (error) {
            console.error('Error submitting order:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal membuat order'));
        }
    }

    // Get tenant order by ID
    static async getOrderById(req, res) {
        try {
            const { id } = req.params;
            const order = await TenantOrderRepository.getById(id);

            if (!order) {
                return res.status(404).send(ResponseHelper.errorResponse('Order tidak ditemukan'));
            }

            return res.status(200).send(ResponseHelper.successResponse(order));
        } catch (error) {
            console.error('Error getting order:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data order'));
        }
    }

    // Get tenant orders by status
    static async getOrdersByStatus(req, res) {
        try {
            const { status } = req.params;
            const orders = await TenantOrderRepository.getByStatus(status);

            return res.status(200).send(ResponseHelper.successResponse(orders));
        } catch (error) {
            console.error('Error getting orders by status:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengambil data orders'));
        }
    }

    // Send OTP to WhatsApp
    static async sendOTP(req, res) {
        try {
            const { order_id, whatsapp_number } = req.body;

            if (!order_id || !whatsapp_number) {
                return res.status(400).send(ResponseHelper.errorResponse('Order ID dan nomor WhatsApp harus diisi'));
            }

            // Get order
            const order = await TenantOrderRepository.getById(order_id);
            if (!order) {
                return res.status(404).send(ResponseHelper.errorResponse('Order tidak ditemukan'));
            }

            if (order.status !== 'pending_verification') {
                return res.status(400).send(ResponseHelper.errorResponse('Order sudah diverifikasi atau tidak valid'));
            }

            // Check if OTP was sent recently (within 5 minutes)
            const recentOTP = await WAVerificationRepository.getRecentOTP(order_id, 5); // 5 minutes
            if (recentOTP) {
                const timeDiff = (new Date() - new Date(recentOTP.created_at)) / (1000 * 60); // minutes
                const remainingTime = Math.ceil(5 - timeDiff);
                
                if (remainingTime > 0) {
                    return res.status(429).send(ResponseHelper.errorResponse(
                        `OTP sudah dikirim baru-baru ini. Silakan tunggu ${remainingTime} menit lagi sebelum mengirim ulang.`,
                        429
                    ));
                }
            }

            // Send OTP
            const result = await WAService.createAndSendOTP(order_id, whatsapp_number, order.owner_name);

            if (result.success) {
                return res.status(200).send(ResponseHelper.successResponse({
                    message: result.message,
                    otp_expires_at: result.otp_expires_at,
                    expires_in_seconds: result.expires_in_seconds
                }));
            } else {
                // If WA OTP fails, create account anyway but mark as unverified
                console.log('WA OTP failed, creating account without verification:', result.message);
                
                try {
                    console.log('🔄 Creating account without WA verification due to WA failure...');
                    
                    // Create account without WA verification
                    const accountResult = await AccountCreationService.createCompleteAccount(order, true);
                    
                    console.log('✅ Account created successfully, updating order status...');
                    
                    // Update order status to indicate account created but WA failed
                    await TenantOrderRepository.updateStatus(order_id, 'account_created_no_wa');
                    
                    console.log('✅ Order status updated to account_created_no_wa');
                    
                    return res.status(200).send(ResponseHelper.successResponse({
                        message: 'Akun berhasil dibuat, namun gagal mengirim OTP ke WhatsApp. Silakan hubungi admin untuk mendapatkan kredensial.',
                        tenant_id: accountResult.tenant_id,
                        user_id: accountResult.user_id,
                        subscription_id: accountResult.subscription_id,
                        credentials: accountResult.credentials,
                        trial_end_date: accountResult.trial_end_date,
                        whatsapp_sent: false,
                        whatsapp_error: result.message,
                        fallback_mode: true
                    }));
                } catch (accountError) {
                    console.error('❌ Error creating account after WA failure:', {
                        error: accountError.message,
                        stack: accountError.stack,
                        order_id,
                        order_data: {
                            business_name: order.business_name,
                            owner_name: order.owner_name,
                            email: order.email,
                            phone: order.phone,
                            whatsapp: order.whatsapp
                        }
                    });
                    return res.status(500).send(ResponseHelper.errorResponse('Gagal mengirim OTP dan membuat akun: ' + accountError.message));
                }
            }
        } catch (error) {
            console.error('❌ Error sending OTP:', {
                error: error.message,
                stack: error.stack,
                order_id,
                whatsapp_number
            });
            
            // Check if it's a rate limit error
            if (error.message && error.message.includes('OTP sudah dikirim baru-baru ini')) {
                return res.status(429).send(ResponseHelper.errorResponse(error.message, 429));
            }
            
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengirim OTP: ' + error.message));
        }
    }

    // ✅ COMMENTED OUT: Verify OTP and create account (not needed anymore)
    /*
    static async verifyOTPAndCreateAccount(req, res) {
        try {
            const { order_id, otp_code } = req.body;

            if (!order_id || !otp_code) {
                return res.status(400).send(ResponseHelper.errorResponse('Order ID dan kode OTP harus diisi'));
            }

            // Get order
            const order = await TenantOrderRepository.getById(order_id);
            if (!order) {
                return res.status(404).send(ResponseHelper.errorResponse('Order tidak ditemukan'));
            }

            if (order.status !== 'pending_verification' && order.status !== 'account_created_no_wa') {
                return res.status(400).send(ResponseHelper.errorResponse('Order sudah diverifikasi atau tidak valid'));
            }

            // If order is already created without WA verification, just update status
            if (order.status === 'account_created_no_wa') {
                await TenantOrderRepository.updateStatus(order_id, 'account_created');
                return res.status(200).send(ResponseHelper.successResponse({
                    message: 'Akun sudah dibuat sebelumnya. Status telah diperbarui.',
                    tenant_id: order.tenant_id || 'N/A',
                    user_id: order.user_id || 'N/A',
                    fallback_mode: true
                }));
            }

            // Verify OTP
            const verifyResult = await WAService.verifyOTP(order_id, otp_code);
            if (!verifyResult.success) {
                return res.status(400).send(ResponseHelper.errorResponse(verifyResult.message));
            }

            // Create account
            const accountResult = await AccountCreationService.createCompleteAccount(order);

            // Update order status
            await TenantOrderRepository.updateStatus(order_id, 'account_created');

            return res.status(200).send(ResponseHelper.successResponse({
                tenant_id: accountResult.tenant_id,
                user_id: accountResult.user_id,
                subscription_id: accountResult.subscription_id,
                credentials: accountResult.credentials,
                trial_end_date: accountResult.trial_end_date,
                whatsapp_sent: accountResult.whatsapp_sent,
                whatsapp_message: accountResult.whatsapp_message,
                message: 'Akun berhasil dibuat, kredensial dikirim ke WhatsApp'
            }));
        } catch (error) {
            console.error('Error verifying OTP and creating account:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal memverifikasi OTP dan membuat akun'));
        }
    }
    */

    // ✅ COMMENTED OUT: Verify link and activate account (not needed anymore)
    /*
    static async verifyLink(req, res) {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).send(ResponseHelper.errorResponse('Token verifikasi tidak valid'));
            }

            // Get order by verification token
            const order = await TenantOrderRepository.getByVerificationToken(token);
            if (!order) {
                return res.status(404).send(ResponseHelper.errorResponse('Link verifikasi tidak ditemukan atau sudah tidak valid'));
            }

            // Check if token is expired
            if (order.verification_expires_at && new Date() > new Date(order.verification_expires_at)) {
                return res.status(400).send(ResponseHelper.errorResponse('Link verifikasi sudah kadaluarsa. Silakan minta link baru.'));
            }

            // Check if already verified
            if (order.verified_at) {
                return res.status(200).send(ResponseHelper.successResponse({
                    message: 'Akun sudah berhasil diverifikasi sebelumnya',
                    verified_at: order.verified_at,
                    already_verified: true
                }));
            }

            // 🚀 UPDATED: Find existing tenant and update verification status
            const TenantRepository = require('../repositories/tenantRepository');
            const existingTenant = await TenantRepository.getByEmail(order.email);
            
            if (!existingTenant) {
                return res.status(404).send(ResponseHelper.errorResponse('Tenant tidak ditemukan. Silakan hubungi support.'));
            }

            // Mark order as verified
            await TenantOrderRepository.markAsVerified(order.id);

            // Update tenant verification status
            await TenantRepository.updateVerificationStatus(existingTenant.id, true);
            
            console.log('✅ Tenant verification updated:', {
                tenant_id: existingTenant.id,
                business_name: existingTenant.business_name,
                is_verified: true
            });

            console.log('✅ Link verification successful:', {
                order_id: order.id,
                business_name: order.business_name,
                email: order.email,
                verified_at: new Date()
            });

            return res.status(200).send(ResponseHelper.successResponse({
                message: 'Verifikasi berhasil! Akun Anda telah diaktifkan.',
                business_name: order.business_name,
                email: order.email,
                verified_at: new Date(),
                account_created: false, // Account was already created during registration
                tenant_id: existingTenant.id,
                user_id: existingTenant.id // Will be updated when we get proper user_id
            }));

        } catch (error) {
            console.error('Error verifying link:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal memverifikasi link. Silakan coba lagi atau hubungi support.'));
        }
    }
    */

    // ✅ COMMENTED OUT: Resend verification link (not needed anymore)
    /*
    static async resendVerificationLink(req, res) {
        try {
            const { order_id } = req.body;

            if (!order_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Order ID harus diisi'));
            }

            // Get order
            const order = await TenantOrderRepository.getById(order_id);
            if (!order) {
                return res.status(404).send(ResponseHelper.errorResponse('Order tidak ditemukan'));
            }

            // Check if already verified
            if (order.verified_at) {
                return res.status(400).send(ResponseHelper.errorResponse('Akun sudah terverifikasi'));
            }

            // Generate new verification token
            const newToken = crypto.randomBytes(32).toString('hex');
            const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Update token in database
            await TenantOrderRepository.updateVerificationToken(order_id, newToken, newExpiry);

            // Send new verification link via WhatsApp
            const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${newToken}`;
            
            const message = `🎉 Link Verifikasi Baru - NotaSepatu

Halo ${order.owner_name},

Berikut link verifikasi baru untuk aktivasi akun Anda:

👤 Bisnis: ${order.business_name}
📧 Email: ${order.email}
🔑 Password: [Password yang Anda buat]

✅ Klik link berikut untuk aktivasi:
${verificationLink}

Link berlaku 24 jam.
Butuh bantuan? Hubungi support kami.

Terima kasih,
Tim NotaSepatu`;

            // Send via WhatsApp (simplified for now)
            console.log('📱 Sending verification link to:', order.whatsapp);
            console.log('🔗 Verification link:', verificationLink);

            return res.status(200).send(ResponseHelper.successResponse({
                message: 'Link verifikasi baru telah dikirim ke WhatsApp Anda',
                order_id: order_id,
                verification_token: newToken, // For development/testing
                expires_at: newExpiry
            }));

        } catch (error) {
            console.error('Error resending verification link:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengirim ulang link verifikasi'));
        }
    }
    */

    // ✅ COMMENTED OUT: Check verification status (not needed anymore)
    /*
    static async checkVerificationStatus(req, res) {
        try {
            const { order_id } = req.params;

            if (!order_id) {
                return res.status(400).send(ResponseHelper.errorResponse('Order ID harus diisi'));
            }

            const order = await TenantOrderRepository.getById(order_id);
            if (!order) {
                return res.status(404).send(ResponseHelper.errorResponse('Order tidak ditemukan'));
            }

            return res.status(200).send(ResponseHelper.successResponse({
                order_id: order.id,
                status: order.status,
                verified_at: order.verified_at,
                is_verified: !!order.verified_at,
                verification_expires_at: order.verification_expires_at,
                business_name: order.business_name,
                email: order.email
            }));

        } catch (error) {
            console.error('Error checking verification status:', error);
            return res.status(500).send(ResponseHelper.errorResponse('Gagal mengecek status verifikasi'));
        }
    }
    */
}

module.exports = TenantOrderController;
