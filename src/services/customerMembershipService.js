const CustomerMembershipRepository = require('../repositories/customerMembershipRepository');
const { Customer } = require('../models');
const sequelize = require('../config/database');

class CustomerMembershipService {
    static async create(data, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            // Add tenant_id and branch_id for data isolation
            if (user_tenant_id) {
                data.tenant_id = user_tenant_id;
            }
            if (user_branch_id) {
                data.branch_id = user_branch_id;
            }

            const result = await CustomerMembershipRepository.create(data);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const result = await CustomerMembershipRepository.getAll(search, user_tenant_id, user_branch_id, user_role, page, limit);
            
            return {
                customer_memberships: result.customer_memberships,
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const result = await CustomerMembershipRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data, user_tenant_id = null, user_branch_id = null, user_role = null) {
        const transaction = await sequelize.transaction();
        try {
            const { CustomerMembership, Op } = require('../models');
            
            // Build where clause for data isolation
            let whereClause = { id };
            if (user_role === 'superapp-superadmin') {
                // Super App Super Admin bisa lihat semua data
            } else if (user_role === 'superadmin') {
                whereClause.tenant_id = user_tenant_id;
            } else if (user_role) {
                whereClause.tenant_id = user_tenant_id;
            }

            // Get current membership data before update (with transaction)
            const currentMembership = await CustomerMembership.findOne({
                where: whereClause,
                transaction
            });
            
            if (!currentMembership) {
                throw new Error('Customer membership not found');
            }

            // Update membership
            await CustomerMembershipRepository.update(id, data, user_tenant_id, user_branch_id, user_role, transaction);

            // ✅ OPTION C: Handle cancel membership (hanya untuk paid membership)
            if (data.status === 'cancelled') {
                // Validasi: Hanya paid membership yang bisa di-cancel
                if (currentMembership.payment_id === null || currentMembership.payment_id === undefined) {
                    throw new Error('Tier-based membership (via lifetime points) tidak dapat dibatalkan. Membership akan otomatis berubah sesuai lifetime points customer.');
                }

                // 1. Update customer's current_membership_id to null if this is the current membership
                const customer = await Customer.findByPk(currentMembership.customer_id, { transaction });
                if (customer && customer.current_membership_id === id) {
                    await Customer.update(
                        { current_membership_id: null },
                        { where: { id: currentMembership.customer_id }, transaction }
                    );
                    console.log(`✅ CustomerMembershipService.update - Reset current_membership_id for customer ${currentMembership.customer_id}`);
                }

                // 2. Re-evaluate tier (paid membership selalu punya payment_id)
                if (currentMembership.payment_id !== null && currentMembership.payment_id !== undefined) {
                    try {
                        const MembershipTierService = require('./membershipTierService');
                        
                        // Re-evaluate tier berdasarkan lifetime_points saat ini
                        await MembershipTierService.upgradeTier(
                            currentMembership.customer_id,
                            currentMembership.tenant_id,
                            transaction
                        );
                        console.log(`✅ CustomerMembershipService.update - Re-evaluated tier for customer ${currentMembership.customer_id} after paid membership cancelled`);
                    } catch (tierError) {
                        console.error(`⚠️ CustomerMembershipService.update - Error re-evaluating tier for customer ${currentMembership.customer_id}:`, tierError.message);
                        // Don't throw - tier re-evaluation is not critical for membership cancellation
                    }
                } else {
                    console.log(`ℹ️ CustomerMembershipService.update - Membership ${id} is tier-based (no payment_id), skipping tier re-evaluation`);
                }
            }

            await transaction.commit();
            return await CustomerMembershipRepository.getById(id, user_tenant_id, user_branch_id, user_role);
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const check = await CustomerMembershipRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            if (!check) {
                throw new Error('Customer membership not found');
            }
            await CustomerMembershipRepository.delete(id);
            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async checkAndUpdateExpiredMemberships() {
        try {
            console.log('🔍 CustomerMembershipService.checkAndUpdateExpiredMemberships');
            
            const expiredMemberships = await CustomerMembershipRepository.getExpiredMemberships();
            console.log(`📊 Found ${expiredMemberships.length} expired memberships`);

            const results = [];

            for (const membership of expiredMemberships) {
                try {
                    const transaction = await sequelize.transaction();
                    
                    // Update membership status to expired
                    await CustomerMembershipRepository.update(
                        membership.id,
                        { status: 'expired' },
                        null,
                        null,
                        null,
                        transaction
                    );

                    // Update customer's current_membership_id if this is the current membership
                    if (membership.customer?.current_membership_id === membership.id) {
                        await Customer.update(
                            { current_membership_id: null },
                            { where: { id: membership.customer_id }, transaction }
                        );
                    }

                    // ✅ OPTION C: Re-evaluate tier setelah paid membership expire
                    // Hanya re-evaluate jika ini adalah paid membership (payment_id IS NOT NULL)
                    if (membership.payment_id !== null && membership.payment_id !== undefined) {
                        try {
                            const MembershipTierService = require('./membershipTierService');
                            
                            // Re-evaluate tier berdasarkan lifetime_points saat ini
                            await MembershipTierService.upgradeTier(
                                membership.customer_id,
                                membership.tenant_id,
                                transaction
                            );
                            console.log(`✅ CustomerMembershipService.checkAndUpdateExpiredMemberships - Re-evaluated tier for customer ${membership.customer_id} after paid membership expired`);
                        } catch (error) {
                            console.error(`⚠️ CustomerMembershipService.checkAndUpdateExpiredMemberships - Error re-evaluating tier for customer ${membership.customer_id}:`, error.message);
                            // Don't throw - tier re-evaluation is not critical for membership expiration
                        }
                    }

                    await transaction.commit();

                    results.push({
                        membership_id: membership.id,
                        customer_id: membership.customer_id,
                        action: 'expired'
                    });

                    console.log(`✅ Updated membership ${membership.id} to expired`);
                } catch (error) {
                    console.error(`❌ Error updating membership ${membership.id}:`, error.message);
                    results.push({
                        membership_id: membership.id,
                        customer_id: membership.customer_id,
                        action: 'error',
                        error: error.message
                    });
                }
            }

            return {
                processed: expiredMemberships.length,
                results: results
            };
        } catch (error) {
            console.error('❌ CustomerMembershipService.checkAndUpdateExpiredMemberships - Error:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = CustomerMembershipService;
