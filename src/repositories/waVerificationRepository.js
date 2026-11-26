const WAVerification = require('../models/WAVerification');
const { Op } = require('sequelize');

class WAVerificationRepository {
    static async create(verificationData) {
        try {
            const verification = await WAVerification.create(verificationData);
            return verification;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByOrderId(orderId) {
        try {
            const verification = await WAVerification.findOne({
                where: { order_id: orderId },
                order: [['created_at', 'DESC']]
            });
            return verification;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateStatus(orderId, status) {
        try {
            const [updatedRowsCount] = await WAVerification.update(
                { status },
                { where: { order_id: orderId } }
            );
            return updatedRowsCount > 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async incrementAttempts(orderId) {
        try {
            const verification = await WAVerification.findOne({
                where: { order_id: orderId }
            });
            if (verification) {
                await verification.increment('verification_attempts');
                return verification.verification_attempts + 1;
            }
            return 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getActiveOTP(orderId) {
        try {
            const verification = await WAVerification.findOne({
                where: {
                    order_id: orderId,
                    status: 'sent',
                    otp_expires_at: {
                        [Op.gt]: new Date()
                    }
                },
                order: [['created_at', 'DESC']]
            });
            return verification;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getExpiredOTPs() {
        try {
            const verifications = await WAVerification.findAll({
                where: {
                    status: 'sent',
                    otp_expires_at: {
                        [Op.lt]: new Date()
                    }
                }
            });
            return verifications;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByWhatsappNumber(whatsappNumber) {
        try {
            const verifications = await WAVerification.findAll({
                where: { whatsapp_number: whatsappNumber },
                order: [['created_at', 'DESC']]
            });
            return verifications;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getActiveOTP(orderId) {
        try {
            const verification = await WAVerification.findOne({
                where: { 
                    order_id: orderId,
                    status: { [Op.in]: ['sent', 'verified'] },
                    otp_expires_at: { [Op.gt]: new Date() }
                },
                order: [['id', 'DESC']] // Use ID instead of created_at to get the latest
            });
            return verification;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async incrementAttempts(orderId) {
        try {
            const verification = await WAVerification.findOne({
                where: { order_id: orderId },
                order: [['created_at', 'DESC']]
            });
            
            if (verification) {
                const newAttempts = (verification.verification_attempts || 0) + 1;
                await verification.update({ verification_attempts: newAttempts });
                return newAttempts;
            }
            
            return 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getRecentOTP(orderId, minutesAgo = 5) {
        try {
            const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
            
            const verification = await WAVerification.findOne({
                where: { 
                    order_id: orderId,
                    status: 'sent',
                    created_at: { [Op.gte]: cutoffTime }
                },
                order: [['created_at', 'DESC']]
            });
            
            return verification;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = WAVerificationRepository;
