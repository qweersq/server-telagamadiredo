const axios = require('axios');
const WAVerificationRepository = require('../repositories/waVerificationRepository');
const TenantOrderRepository = require('../repositories/tenantOrderRepository');
const WaConnectionService = require('./waConnectionService');
const { cleanPhoneNumber } = require('../helpers/phoneHelper');

class WAService {
    // Generate random OTP (6 digits)
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Generate random password (8 characters: letters + numbers)
    static generatePassword() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const allChars = letters + numbers;
        
        let password = '';
        // Ensure at least one letter and one number
        password += letters.charAt(Math.floor(Math.random() * letters.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        
        // Fill remaining 6 characters
        for (let i = 2; i < 8; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    // Send OTP via WhatsApp API using SuperApp connection
    static async sendOTP(whatsappNumber, otpCode, ownerName) {
        try {
            const message = `*🔐 Kode Verifikasi Katsikat*

Halo Kak ${ownerName},

Kode verifikasi Anda: *${otpCode}*

Kode berlaku selama 5 menit.

*Jangan bagikan kode ini kepada siapapun.*

Terima kasih,
Tim Katsikat`;

            // Get active SuperApp connection
            const activeConnection = await WaConnectionService.getActiveConnection('superapp');
            
            if (!activeConnection || !activeConnection.success) {
                return {
                    success: false,
                    message: 'WhatsApp SuperApp tidak terhubung. Silakan hubungkan terlebih dahulu.'
                };
            }

            // Clean and format phone number to 628xxxxxxxxx
            const formattedNumber = cleanPhoneNumber(whatsappNumber);

            // Send message using SuperApp connection
            const sendResult = await WaConnectionService.sendMessage(
                activeConnection.data.connection_id,
                formattedNumber,
                message
            );

            if (sendResult.success) {
                return {
                    success: true,
                    message: 'OTP berhasil dikirim ke WhatsApp',
                    response: sendResult.data
                };
            } else {
                return {
                    success: false,
                    message: sendResult.message || 'Gagal mengirim OTP ke WhatsApp'
                };
            }
        } catch (error) {
            console.error('Error sending OTP to WhatsApp:', error);
            return {
                success: false,
                message: 'Gagal mengirim OTP ke WhatsApp',
                error: error.message
            };
        }
    }

    // Send credentials via WhatsApp API using SuperApp connection
    static async sendCredentials(whatsappNumber, ownerName, businessName, email, password, trialEndDate) {
        try {
            const message = `*Akun Katsikat Berhasil Dibuat!*

Halo Kak ${ownerName},

Akun untuk bisnis *"${businessName}"* telah berhasil dibuat.

*🔑 Informasi Login:*
Email: *${email}*
Password: *${password}*

⏰ Trial Period: *7 hari gratis*
📅 Berakhir: *${trialEndDate}*

🔗 Login: https://app.katsikat.com/login

*⚠️ Segera ganti password setelah login pertama.*

Selamat menggunakan Katsikat!
`;

            // Get active SuperApp connection
            const activeConnection = await WaConnectionService.getActiveConnection('superapp');
            
            if (!activeConnection || !activeConnection.success) {
                return {
                    success: false,
                    message: 'WhatsApp SuperApp tidak terhubung. Silakan hubungkan terlebih dahulu.'
                };
            }

            // Clean and format phone number to 628xxxxxxxxx
            const formattedNumber = cleanPhoneNumber(whatsappNumber);

            // Send message using SuperApp connection
            const sendResult = await WaConnectionService.sendMessage(
                activeConnection.data.connection_id,
                formattedNumber,
                message
            );

            if (sendResult.success) {
                return {
                    success: true,
                    message: 'Kredensial berhasil dikirim ke WhatsApp',
                    response: sendResult.data
                };
            } else {
                return {
                    success: false,
                    message: sendResult.message || 'Gagal mengirim kredensial ke WhatsApp'
                };
            }
        } catch (error) {
            console.error('Error sending credentials to WhatsApp:', error);
            return {
                success: false,
                message: 'Gagal mengirim kredensial ke WhatsApp',
                error: error.message
            };
        }
    }

    // Create and send OTP
    static async createAndSendOTP(orderId, whatsappNumber, ownerName) {
        try {
            // Generate OTP
            const otpCode = this.generateOTP();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Create verification record (only store in wa_verifications table)
            await WAVerificationRepository.create({
                order_id: orderId,
                whatsapp_number: whatsappNumber,
                otp_code: otpCode,
                otp_expires_at: expiresAt,
                status: 'sent'
            });

            // Send OTP via WhatsApp
            const sendResult = await this.sendOTP(whatsappNumber, otpCode, ownerName);

            if (sendResult.success) {
                return {
                    success: true,
                    message: 'OTP berhasil dikirim ke WhatsApp',
                    otp_expires_at: expiresAt,
                    expires_in_seconds: 300
                };
            } else {
                // Update verification status to failed
                await WAVerificationRepository.updateStatus(orderId, 'failed');
                return {
                    success: false,
                    message: sendResult.message
                };
            }
        } catch (error) {
            console.error('Error creating and sending OTP:', error);
            return {
                success: false,
                message: 'Gagal membuat dan mengirim OTP'
            };
        }
    }

    // Verify OTP
    static async verifyOTP(orderId, otpCode) {
        try {
            // Get active OTP
            const verification = await WAVerificationRepository.getActiveOTP(orderId);
            
            if (!verification) {
                return {
                    success: false,
                    message: 'OTP tidak ditemukan atau sudah kadaluarsa'
                };
            }

            // Check if OTP matches
            if (verification.otp_code !== otpCode) {
                // Increment attempts
                const attempts = await WAVerificationRepository.incrementAttempts(orderId);
                
                if (attempts >= 3) {
                    await WAVerificationRepository.updateStatus(orderId, 'failed');
                    return {
                        success: false,
                        message: 'Terlalu banyak percobaan verifikasi. Silakan request OTP baru.'
                    };
                }

                return {
                    success: false,
                    message: 'Kode OTP tidak valid'
                };
            }

            // OTP is valid
            await WAVerificationRepository.updateStatus(orderId, 'verified');
            await TenantOrderRepository.updateStatus(orderId, 'verified');

            return {
                success: true,
                message: 'OTP berhasil diverifikasi'
            };
        } catch (error) {
            console.error('Error verifying OTP:', error);
            return {
                success: false,
                message: 'Gagal memverifikasi OTP'
            };
        }
    }
}

module.exports = WAService;
