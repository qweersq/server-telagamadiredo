const { Customer, Membership, CustomerMembership, Op } = require('../models');
const { sequelize } = require('../models');

class MembershipTierService {
    /**
     * Calculate tier based on lifetime_points
     * @param {number} customer_id - Customer ID
     * @param {number} user_tenant_id - User tenant ID
     * @returns {object} - Membership tier info
     */
    static async calculateTier(customer_id, user_tenant_id = null) {
        try {
            const customer = await Customer.findByPk(customer_id, {
                include: [{
                    model: CustomerMembership,
                    as: 'current_membership',
                    include: [{
                        model: Membership,
                        as: 'membership'
                    }]
                }]
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Validate tenant access
            if (user_tenant_id && customer.tenant_id !== user_tenant_id) {
                throw new Error('Access denied');
            }

            const lifetimePoints = customer.lifetime_points || 0;

            // Find highest tier that customer qualifies for (based on min_points)
            // Filter by tenant_id to get tenant-specific tiers
            const whereClause = {
                is_active: true,
                [Op.or]: [
                    { tenant_id: customer.tenant_id },
                    { tenant_id: null } // Global tiers (if any)
                ]
            };

            const memberships = await Membership.findAll({
                where: whereClause,
                order: [['min_points', 'DESC']] // Highest min_points first
            });

            // Find the highest tier where min_points <= lifetime_points
            let eligibleMembership = null;
            for (const membership of memberships) {
                if (membership.min_points !== null && lifetimePoints >= membership.min_points) {
                    eligibleMembership = membership;
                    break;
                }
            }

            // Get next tier (if any)
            let nextTier = null;
            if (eligibleMembership) {
                // Find tier with higher min_points
                for (const membership of memberships) {
                    if (membership.min_points !== null && 
                        membership.min_points > eligibleMembership.min_points) {
                        nextTier = membership;
                        break;
                    }
                }
            } else {
                // Customer doesn't have any tier yet, get lowest tier
                const lowestTier = memberships.find(m => m.min_points !== null);
                if (lowestTier) {
                    nextTier = lowestTier;
                }
            }

            return {
                current_tier: eligibleMembership ? {
                    id: eligibleMembership.id,
                    name: eligibleMembership.name,
                    discount_percentage: parseFloat(eligibleMembership.discount_percentage),
                    min_points: eligibleMembership.min_points
                } : null,
                next_tier: nextTier ? {
                    id: nextTier.id,
                    name: nextTier.name,
                    discount_percentage: parseFloat(nextTier.discount_percentage),
                    min_points: nextTier.min_points,
                    points_needed: nextTier.min_points - lifetimePoints
                } : null,
                lifetime_points: lifetimePoints,
                current_membership_id: customer.current_membership_id
            };
        } catch (error) {
            throw new Error(`Failed to calculate tier: ${error.message}`);
        }
    }

    /**
     * Auto-upgrade tier based on lifetime_points
     * @param {number} customer_id - Customer ID
     * @param {number} user_tenant_id - User tenant ID
     * @param {object} transaction - Sequelize transaction (optional)
     */
    static async upgradeTier(customer_id, user_tenant_id = null, transaction = null) {
        try {
            const customer = await Customer.findByPk(customer_id, {
                include: [{
                    model: CustomerMembership,
                    as: 'current_membership',
                    required: false
                }],
                transaction
            });
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Validate tenant access
            if (user_tenant_id && customer.tenant_id !== user_tenant_id) {
                throw new Error('Access denied');
            }

            // ✅ OPTION C: Skip auto-upgrade jika customer punya active paid membership
            // Paid membership (payment_id IS NOT NULL) lebih prioritas daripada tier-based membership
            if (customer.current_membership && 
                customer.current_membership.status === 'active' &&
                customer.current_membership.payment_id !== null &&
                customer.current_membership.payment_id !== undefined) {
                console.log(`ℹ️ MembershipTierService.upgradeTier - Customer ${customer_id} has active paid membership (payment_id: ${customer.current_membership.payment_id}), skipping auto-upgrade`);
                return customer.current_membership;
            }

            const lifetimePoints = customer.lifetime_points || 0;

            // Find highest tier that customer qualifies for
            const whereClause = {
                is_active: true,
                [Op.or]: [
                    { tenant_id: customer.tenant_id },
                    { tenant_id: null }
                ]
            };

            const memberships = await Membership.findAll({
                where: whereClause,
                order: [['min_points', 'DESC']]
            });

            // Find eligible membership
            let eligibleMembership = null;
            for (const membership of memberships) {
                if (membership.min_points !== null && lifetimePoints >= membership.min_points) {
                    eligibleMembership = membership;
                    break;
                }
            }

            // If no eligible membership, don't upgrade
            if (!eligibleMembership) {
                console.log(`ℹ️ MembershipTierService.upgradeTier - Customer ${customer_id} doesn't qualify for any tier`);
                return null;
            }

            // Check if customer already has this tier (tier-based, bukan paid)
            if (customer.current_membership_id) {
                const currentMembership = await CustomerMembership.findByPk(
                    customer.current_membership_id,
                    { transaction }
                );
                
                // ✅ OPTION C: Jika current membership adalah paid membership, jangan update
                if (currentMembership && 
                    currentMembership.payment_id !== null &&
                    currentMembership.payment_id !== undefined) {
                    console.log(`ℹ️ MembershipTierService.upgradeTier - Customer ${customer_id} has active paid membership, skipping tier upgrade`);
                    return currentMembership;
                }
                
                // Check if already has this tier AND end_date is already NULL (tier-based, no need to update)
                if (currentMembership && 
                    currentMembership.membership_id === eligibleMembership.id &&
                    currentMembership.end_date === null &&
                    currentMembership.payment_id === null) {
                    console.log(`ℹ️ MembershipTierService.upgradeTier - Customer ${customer_id} already has tier ${eligibleMembership.name} with correct settings`);
                    return currentMembership;
                }
            }

            // Create or update customer membership (tier-based, bukan paid)
            let customerMembership;
            if (customer.current_membership_id) {
                // Update existing membership (hanya jika bukan paid membership)
                customerMembership = await CustomerMembership.findByPk(
                    customer.current_membership_id,
                    { transaction }
                );
                
                // ✅ OPTION C: Jika current membership adalah paid membership, jangan update
                if (customerMembership && 
                    customerMembership.payment_id !== null &&
                    customerMembership.payment_id !== undefined) {
                    console.log(`ℹ️ MembershipTierService.upgradeTier - Customer ${customer_id} has active paid membership, skipping tier upgrade`);
                    return customerMembership;
                }
                
                if (customerMembership) {
                    // Update tier-based membership: preserve start_date, only update membership_id
                    await customerMembership.update({
                        membership_id: eligibleMembership.id,
                        status: 'active',
                        // Preserve original start_date (don't reset on recalculate)
                        end_date: null, // Tier doesn't expire
                        payment_id: null // ✅ Ensure payment_id is null for tier-based membership
                    }, { transaction });
                } else {
                    // Create new if not found
                    customerMembership = await CustomerMembership.create({
                        customer_id,
                        membership_id: eligibleMembership.id,
                        status: 'active',
                        start_date: new Date(),
                        end_date: null, // Tier doesn't expire
                        payment_id: null, // ✅ Tier-based membership has no payment_id
                        tenant_id: customer.tenant_id,
                        branch_id: customer.branch_id
                    }, { transaction });
                }
            } else {
                // Create new membership
                customerMembership = await CustomerMembership.create({
                    customer_id,
                    membership_id: eligibleMembership.id,
                    status: 'active',
                    start_date: new Date(),
                    end_date: null, // Tier doesn't expire
                    payment_id: null, // ✅ Tier-based membership has no payment_id
                    tenant_id: customer.tenant_id,
                    branch_id: customer.branch_id
                }, { transaction });
            }

            // Update customer's current_membership_id
            await customer.update({
                current_membership_id: customerMembership.id
            }, { transaction });

            console.log(`✅ MembershipTierService.upgradeTier - Customer ${customer_id} upgraded to tier ${eligibleMembership.name}`);

            return customerMembership;
        } catch (error) {
            throw new Error(`Failed to upgrade tier: ${error.message}`);
        }
    }

    /**
     * Get membership discount for customer
     * @param {number} customer_id - Customer ID
     * @param {number} user_tenant_id - User tenant ID
     * @returns {object} - Discount info or null
     */
    static async getMembershipDiscount(customer_id, user_tenant_id = null) {
        try {
            const customer = await Customer.findByPk(customer_id, {
                include: [{
                    model: CustomerMembership,
                    as: 'current_membership',
                    include: [{
                        model: Membership,
                        as: 'membership'
                    }]
                }]
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Validate tenant access
            if (user_tenant_id && customer.tenant_id !== user_tenant_id) {
                throw new Error('Access denied');
            }

            // Check if customer has active membership
            if (!customer.current_membership || 
                customer.current_membership.status !== 'active' ||
                !customer.current_membership.membership) {
                return null;
            }

            // ✅ Validasi expired membership (untuk paid membership dengan end_date)
            // Jika membership adalah paid membership (payment_id IS NOT NULL) dan sudah expired
            if (customer.current_membership.payment_id !== null && 
                customer.current_membership.payment_id !== undefined && 
                customer.current_membership.end_date) {
                const now = new Date();
                if (new Date(customer.current_membership.end_date) <= now) {
                    console.log(`ℹ️ MembershipTierService.getMembershipDiscount - Paid membership for customer ${customer_id} has expired (end_date: ${customer.current_membership.end_date}), returning null discount.`);
                    return null; // Membership expired
                }
            }

            const membership = customer.current_membership.membership;
            
            return {
                membership_id: membership.id,
                membership_name: membership.name,
                discount_percentage: parseFloat(membership.discount_percentage),
                is_active: membership.is_active
            };
        } catch (error) {
            throw new Error(`Failed to get membership discount: ${error.message}`);
        }
    }
}

module.exports = MembershipTierService;
