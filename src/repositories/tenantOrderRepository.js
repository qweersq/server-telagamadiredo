const TenantOrder = require('../models/TenantOrder');
const { Op } = require('sequelize');

class TenantOrderRepository {
    static async create(orderData) {
        try {
            const order = await TenantOrder.create(orderData);
            return order;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const order = await TenantOrder.findByPk(id);
            return order;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateStatus(id, status) {
        try {
            console.log('🔍 TenantOrderRepository - Updating status:', {
                id,
                status,
                statusType: typeof status,
                statusLength: status?.length
            });

            // Validate status value against ENUM
            const validStatuses = ['pending_verification', 'verified', 'account_created', 'failed', 'account_created_no_wa'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
            }

            const [updatedRowsCount] = await TenantOrder.update(
                { status },
                { where: { id } }
            );
            
            console.log('✅ TenantOrderRepository - Status updated:', {
                id,
                status,
                updatedRowsCount
            });
            
            return updatedRowsCount > 0;
        } catch (error) {
            console.error('❌ TenantOrderRepository - Error updating status:', {
                error: error.message,
                stack: error.stack,
                id,
                status
            });
            throw new Error(error.message);
        }
    }

    static async updateOTP(id, otpCode, expiresAt) {
        try {
            const [updatedRowsCount] = await TenantOrder.update(
                { 
                    otp_code: otpCode,
                    otp_expires_at: expiresAt
                },
                { where: { id } }
            );
            return updatedRowsCount > 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async incrementVerificationAttempts(id) {
        try {
            const order = await TenantOrder.findByPk(id);
            if (order) {
                await order.increment('verification_attempts');
                return order.verification_attempts + 1;
            }
            return 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByStatus(status) {
        try {
            const orders = await TenantOrder.findAll({
                where: { status },
                order: [['created_at', 'DESC']]
            });
            return orders;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByEmail(email) {
        try {
            const order = await TenantOrder.findOne({
                where: { email },
                order: [['created_at', 'DESC']] // Get the most recent order for this email
            });
            return order;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getPendingVerification() {
        try {
            const orders = await TenantOrder.findAll({
                where: {
                    status: 'pending_verification',
                    otp_expires_at: {
                        [Op.gt]: new Date()
                    }
                },
                order: [['created_at', 'DESC']]
            });
            return orders;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getExpiredOTP() {
        try {
            const orders = await TenantOrder.findAll({
                where: {
                    status: 'pending_verification',
                    otp_expires_at: {
                        [Op.lt]: new Date()
                    }
                }
            });
            return orders;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async checkWhatsAppExists(whatsappNumber) {
        try {
            // Check if WhatsApp number already exists in tenant_orders with successful status
            const existingOrder = await TenantOrder.findOne({
                where: {
                    whatsapp: whatsappNumber,
                    status: { [Op.in]: ['verified', 'account_created', 'account_created_no_wa'] }
                }
            });

            if (existingOrder) {
                return {
                    exists: true,
                    order_id: existingOrder.id,
                    business_name: existingOrder.business_name,
                    owner_name: existingOrder.owner_name,
                    status: existingOrder.status,
                    created_at: existingOrder.created_at
                };
            }

            return { exists: false };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async checkEmailExists(email) {
        try {
            // Check if email already exists in tenant_orders with successful status
            const existingOrder = await TenantOrder.findOne({
                where: {
                    email: email,
                    status: { [Op.in]: ['verified', 'account_created', 'account_created_no_wa'] }
                }
            });

            if (existingOrder) {
                return {
                    exists: true,
                    order_id: existingOrder.id,
                    business_name: existingOrder.business_name,
                    owner_name: existingOrder.owner_name,
                    status: existingOrder.status,
                    created_at: existingOrder.created_at
                };
            }

            return { exists: false };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByVerificationToken(token) {
        try {
            const order = await TenantOrder.findOne({
                where: {
                    verification_token: token
                }
            });
            return order;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateVerificationToken(id, token, expiresAt) {
        try {
            const [updatedRows] = await TenantOrder.update({
                verification_token: token,
                verification_expires_at: expiresAt
            }, {
                where: { id }
            });
            return updatedRows > 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async markAsVerified(id) {
        try {
            const [updatedRows] = await TenantOrder.update({
                verified_at: new Date(),
                status: 'verified'
            }, {
                where: { id }
            });
            return updatedRows > 0;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = TenantOrderRepository;
