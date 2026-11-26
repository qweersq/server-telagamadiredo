const { Op, sequelize, TenantOnboarding } = require('../models');

class TenantOnboardingRepository {
    static async create(data, transaction = null) {
        const shouldCreateTransaction = !transaction;
        if (shouldCreateTransaction) {
            transaction = await sequelize.transaction();
        }
        
        try {
            const result = await TenantOnboarding.create(data, { transaction });
            
            
            if (shouldCreateTransaction) {
                await transaction.commit();
            }

            return result;
        } catch (error) {
            if (shouldCreateTransaction) {
                await transaction.rollback();
            }
            throw new Error(error.message);
        }
    }

    static async getByTenantId(tenantId) {
        try {
            const onboarding = await TenantOnboarding.findOne({
                where: { tenant_id: tenantId },
                include: [
                    {
                        model: require('../models').Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    },
                    {
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'role']
                    }
                ]
            });

            return onboarding;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByUserId(userId) {
        try {
            const onboarding = await TenantOnboarding.findOne({
                where: { user_id: userId },
                include: [
                    {
                        model: require('../models').Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email']
                    },
                    {
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'role']
                    }
                ]
            });

            return onboarding;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateStep(tenantId, currentStep, completedSteps = null, onboardingData = null) {
        const transaction = await sequelize.transaction();
        try {
            const onboarding = await TenantOnboarding.findOne({
                where: { tenant_id: tenantId }
            });

            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            const updateData = { current_step: currentStep };
            
            if (completedSteps !== null) {
                updateData.completed_steps = completedSteps;
            }
            
            if (onboardingData !== null) {
                updateData.onboarding_data = onboardingData;
            }

            // If completing onboarding
            if (currentStep === 'completed') {
                updateData.is_completed = true;
                updateData.completed_at = new Date();
            }

            await onboarding.update(updateData, { transaction });
            await transaction.commit();

            return onboarding;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async addCompletedStep(tenantId, step) {
        const transaction = await sequelize.transaction();
        try {
            const onboarding = await TenantOnboarding.findOne({
                where: { tenant_id: tenantId }
            });

            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            const completedSteps = onboarding.completed_steps || [];
            if (!completedSteps.includes(step)) {
                completedSteps.push(step);
            }

            await onboarding.update({ completed_steps: completedSteps }, { transaction });
            await transaction.commit();

            return onboarding;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateOnboardingData(tenantId, data) {
        const transaction = await sequelize.transaction();
        try {
            const onboarding = await TenantOnboarding.findOne({
                where: { tenant_id: tenantId }
            });

            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            const currentData = onboarding.onboarding_data || {};
            const updatedData = { ...currentData, ...data };

            await onboarding.update({ onboarding_data: updatedData }, { transaction });
            await transaction.commit();

            return onboarding;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async completeOnboarding(tenantId, userId) {
        const transaction = await sequelize.transaction();
        try {
            const onboarding = await TenantOnboarding.findOne({
                where: { tenant_id: tenantId }
            });

            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            // Mark onboarding as completed
            await onboarding.update({
                current_step: 'completed',
                is_completed: true,
                completed_at: new Date(),
                completed_steps: ['branch_setup', 'user_creation', 'service_setup', 'printer_setup', 'wa_setup']
            }, { transaction });

            await transaction.commit();
            return onboarding;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getAll(search = null, status = null) {
        try {
            const whereClause = {};

            if (search) {
                whereClause[Op.or] = [
                    { '$tenant.business_name$': { [Op.substring]: search } },
                    { '$tenant.owner_name$': { [Op.substring]: search } },
                    { '$user.name$': { [Op.substring]: search } }
                ];
            }

            if (status) {
                if (status === 'completed') {
                    whereClause.is_completed = true;
                } else if (status === 'in_progress') {
                    whereClause.is_completed = false;
                } else {
                    whereClause.current_step = status;
                }
            }

            const onboardings = await TenantOnboarding.findAll({
                where: whereClause,
                include: [
                    {
                        model: require('../models').Tenant,
                        as: 'tenant',
                        attributes: ['id', 'business_name', 'owner_name', 'email', 'status']
                    },
                    {
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'role']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return onboardings;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = TenantOnboardingRepository;
