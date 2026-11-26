const TenantRepository = require('../repositories/tenantRepository');
const UserRepository = require('../repositories/userRepository');
const SubscriptionRepository = require('../repositories/subscriptionRepository');
const SubscriptionPlanRepository = require('../repositories/subscriptionPlanRepository');
const TenantOnboardingRepository = require('../repositories/tenantOnboardingRepository');
const BranchRepository = require('../repositories/branchRepository');
const WAService = require('./waService');
const DefaultDataService = require('./defaultDataService');
const PlanHelper = require('../helpers/planHelper');
const { sequelize } = require('../models');
const bcrypt = require('bcrypt');

class AccountCreationService {
    // Generate username from business name
    static generateUsername(businessName) {
        return businessName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20); // Max 20 characters
    }

    // Create default branch for new tenant
    static async createDefaultBranch(tenantId, orderData, transaction = null) {
        try {
            const branchData = {
                name: `${orderData.business_name} - Cabang Utama`,
                address: orderData.address,
                phone: orderData.phone,
                city: orderData.city,
                tenant_id: tenantId,
                status: 'active',
                manager_id: null
            };

            const branch = await BranchRepository.create(branchData, transaction);
            console.log('✅ Default branch created:', {
                id: branch.id,
                name: branch.name,
                tenant_id: branch.tenant_id
            });

            return branch;
        } catch (error) {
            console.error('Error creating default branch:', error);
            throw new Error('Gagal membuat cabang default');
        }
    }

    // Create tenant account from order data
    static async createTenantAccount(orderData, transaction = null) {
        try {
            console.log('🔍 AccountCreationService - Creating tenant account:', {
                business_name: orderData.business_name,
                owner_name: orderData.owner_name,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                city: orderData.city
            });

            // Check if tenant already exists with this email
            const existingTenant = await TenantRepository.getByEmail(orderData.email);
            if (existingTenant) {
                console.log('⚠️ Tenant already exists with this email:', {
                    id: existingTenant.id,
                    business_name: existingTenant.business_name,
                    email: existingTenant.email,
                    status: existingTenant.status
                });
                
                // Return existing tenant instead of creating new one
                return existingTenant;
            }

            // ✅ NEW: Check if NotaFree plan
            const planId = orderData.plan_id || 1;
            const plan = await SubscriptionPlanRepository.getById(planId);
            const isNotaFree = plan && PlanHelper.isFreePlan(plan);

            // Generate trial end date (7 days from now) - only for paid plans
            let trialEndDate = null;
            if (!isNotaFree) {
                trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 7);
            }

            // Create tenant
            const tenantData = {
                business_name: orderData.business_name,
                owner_name: orderData.owner_name,
                email: orderData.email,
                phone: orderData.business_whatsapp, // ✅ Use business WhatsApp for tenant
                address: orderData.address,
                city: orderData.city,
                status: 'active', // ✅ All tenants start as active (trial removed)
                trial_end_date: trialEndDate, // ✅ NULL for NotaFree
                subscription_status: 'active', // ✅ All tenants start as active (trial removed)
                is_verified: true, // ✅ Direct verification - no link needed
                verified_at: new Date(), // ✅ Set verification timestamp
                ai_credit_balance: 20, // ✅ Free 20 AI credits for new tenants
                settings: {}
            };

            console.log('🔍 AccountCreationService - Tenant data before create:', {
                ...tenantData,
                trial_end_date: trialEndDate ? trialEndDate.toISOString() : null
            });

            // Validate data types and lengths
            if (typeof tenantData.business_name !== 'string' || tenantData.business_name.length > 255) {
                throw new Error(`Invalid business_name: ${typeof tenantData.business_name}, length: ${tenantData.business_name?.length}`);
            }
            if (typeof tenantData.owner_name !== 'string' || tenantData.owner_name.length > 255) {
                throw new Error(`Invalid owner_name: ${typeof tenantData.owner_name}, length: ${tenantData.owner_name?.length}`);
            }
            if (typeof tenantData.email !== 'string' || tenantData.email.length > 255) {
                throw new Error(`Invalid email: ${typeof tenantData.email}, length: ${tenantData.email?.length}`);
            }
            if (typeof tenantData.phone !== 'string' || tenantData.phone.length > 255) {
                throw new Error(`Invalid phone: ${typeof tenantData.phone}, length: ${tenantData.phone?.length}`);
            }
            if (typeof tenantData.city !== 'string' || tenantData.city.length > 255) {
                throw new Error(`Invalid city: ${typeof tenantData.city}, length: ${tenantData.city?.length}`);
            }
            if (!['trial', 'active', 'inactive', 'suspended', 'pending_payment'].includes(tenantData.status)) {
                throw new Error(`Invalid status: ${tenantData.status}. Must be one of: trial, active, inactive, suspended, pending_payment`);
            }
            if (!['trial', 'active', 'expired', 'cancelled', 'pending_payment'].includes(tenantData.subscription_status)) {
                throw new Error(`Invalid subscription_status: ${tenantData.subscription_status}. Must be one of: trial, active, expired, cancelled, pending_payment`);
            }

            const tenant = await TenantRepository.create(tenantData, transaction);

            // Create AI credit log for welcome grant
            await sequelize.query(
                `INSERT INTO tenant_ai_credits (tenant_id, type, amount, balance_before, balance_after, source, description, payment_method, createdAt, updatedAt) VALUES (:tenantId, 'CREDIT', 20, 0, 20, 'ADMIN_GRANT', 'Welcome - Free 20 AI credits', 'ADMIN', :now, :now)`,
                {
                    replacements: { tenantId: tenant.id, now: new Date() },
                    transaction
                }
            );
            console.log('✅ Welcome AI credit log created for tenant:', tenant.id);

            console.log('✅ Tenant created successfully:', {
                id: tenant.id,
                business_name: tenant.business_name,
                email: tenant.email,
                status: tenant.status,
                subscription_status: tenant.subscription_status
            });

            return tenant;
        } catch (error) {
            console.error('❌ Error creating tenant:', {
                error: error.message,
                stack: error.stack,
                orderData: {
                    business_name: orderData.business_name,
                    owner_name: orderData.owner_name,
                    email: orderData.email,
                    phone: orderData.phone,
                    address: orderData.address,
                    city: orderData.city
                }
            });
            
            // Handle specific Sequelize errors
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error(`Email ${orderData.email} sudah terdaftar. Silakan gunakan email lain.`);
            }
            if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map(err => `${err.path}: ${err.message}`).join(', ');
                throw new Error(`Validasi data gagal: ${validationErrors}`);
            }
            
            throw new Error('Gagal membuat akun tenant: ' + error.message);
        }
    }

    // Create superadmin user for tenant
    static async createSuperAdminUser(tenantId, branchId, orderData, transaction = null) {
        try {
            console.log('🔍 AccountCreationService - Creating superadmin user:', {
                tenantId,
                branchId,
                ownerName: orderData.owner_name,
                email: orderData.email,
                phone: orderData.phone
            });

            // Check if user already exists with this email
            const existingUser = await UserRepository.getByEmail(orderData.email);
            if (existingUser) {
                console.log('⚠️ User already exists with this email:', {
                    id: existingUser.id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                    tenant_id: existingUser.tenant_id
                });
                
                // Use password from orderData if available, otherwise generate new one
                const plainPassword = orderData.original_password || WAService.generatePassword();
                const hashedPassword = orderData.password || await bcrypt.hash(plainPassword, 10);
                
                // Update existing user's password and tenant_id
                const updatedUser = await UserRepository.update(existingUser.id, {
                    password: hashedPassword,
                    tenant_id: tenantId,
                    branch_id: branchId,
                    status: 'active'
                }, transaction);
                
                console.log('✅ Existing user updated with new credentials');
                
                return {
                    user: { 
                        id: existingUser.id, // Ensure ID is preserved
                        ...existingUser, 
                        tenant_id: tenantId, 
                        branch_id: branchId 
                    },
                    credentials: {
                        email: orderData.email,
                        password: plainPassword
                    }
                };
            }

            // Use password from orderData if available, otherwise generate new one
            const plainPassword = orderData.original_password || WAService.generatePassword();
            
            // Use hashed password from orderData if available, otherwise hash the plain password
            const hashedPassword = orderData.password || await bcrypt.hash(plainPassword, 10);
            
            console.log('🔍 AccountCreationService - Password hashing:');
            console.log('  Plain password:', plainPassword);
            console.log('  Hashed password:', hashedPassword);
            console.log('  Hash length:', hashedPassword.length);

            const userData = {
                name: orderData.owner_name,
                email: orderData.email,
                phone: orderData.owner_whatsapp || orderData.business_whatsapp, // ✅ Fallback to business WhatsApp if owner WA not provided
                password: hashedPassword, // Now properly hashed
                role: 'superadmin',
                status: 'active',
                tenant_id: tenantId,
                branch_id: branchId // Use the newly created branch
            };

            console.log('🔍 AccountCreationService - User data before create:', {
                ...userData,
                password: hashedPassword.substring(0, 20) + '...' // Show only first 20 chars
            });

            // Validate user data
            if (typeof userData.name !== 'string' || userData.name.length > 255) {
                throw new Error(`Invalid name: ${typeof userData.name}, length: ${userData.name?.length}`);
            }
            if (typeof userData.email !== 'string' || userData.email.length > 255) {
                throw new Error(`Invalid email: ${typeof userData.email}, length: ${userData.email?.length}`);
            }
            if (typeof userData.phone !== 'string' || userData.phone.length > 255) {
                throw new Error(`Invalid phone: ${typeof userData.phone}, length: ${userData.phone?.length}`);
            }
            if (typeof userData.password !== 'string' || userData.password.length !== 60) {
                throw new Error(`Invalid password: ${typeof userData.password}, length: ${userData.password?.length}`);
            }
            if (!['superadmin', 'admin', 'technician', 'cashier'].includes(userData.role)) {
                throw new Error(`Invalid role: ${userData.role}. Must be one of: superadmin, admin, technician, cashier`);
            }
            if (!['active', 'inactive'].includes(userData.status)) {
                throw new Error(`Invalid status: ${userData.status}. Must be one of: active, inactive`);
            }
            if (!Number.isInteger(userData.tenant_id) || userData.tenant_id <= 0) {
                throw new Error(`Invalid tenant_id: ${userData.tenant_id}, type: ${typeof userData.tenant_id}`);
            }
            if (!Number.isInteger(userData.branch_id) || userData.branch_id <= 0) {
                throw new Error(`Invalid branch_id: ${userData.branch_id}, type: ${typeof userData.branch_id}`);
            }

            const user = await UserRepository.create(userData, transaction);

            console.log('✅ AccountCreationService - User created successfully:', {
                id: user.id,
                email: user.email,
                tenant_id: user.tenant_id,
                branch_id: user.branch_id,
                password_length: user.password ? user.password.length : 'null'
            });

            return {
                user,
                credentials: {
                    email: orderData.email, // Use email instead of username
                    password: plainPassword // Return plain password for WhatsApp message
                }
            };
        } catch (error) {
            console.error('❌ Error creating superadmin user:', {
                error: error.message,
                stack: error.stack,
                tenantId,
                branchId,
                orderData: {
                    owner_name: orderData.owner_name,
                    email: orderData.email,
                    phone: orderData.phone
                }
            });
            
            // Handle specific Sequelize errors
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error(`Email ${orderData.email} sudah terdaftar sebagai user. Silakan gunakan email lain.`);
            }
            if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map(err => `${err.path}: ${err.message}`).join(', ');
                throw new Error(`Validasi data user gagal: ${validationErrors}`);
            }
            
            throw new Error('Gagal membuat akun pengguna: ' + error.message);
        }
    }

    // Create subscription for tenant
    static async createSubscription(tenantId, orderData, transaction = null) {
        try {
            // Get subscription plan by ID from order data
            const planId = orderData.plan_id || 1; // Default to plan ID 1
            const plan = await SubscriptionPlanRepository.getById(planId);
            if (!plan) {
                throw new Error('Paket subscription tidak ditemukan');
            }

            // ✅ NEW: Check if NotaFree plan
            const isNotaFree = PlanHelper.isFreePlan(plan);

            // Calculate subscription dates
            const startDate = new Date();
            let endDate = null;
            if (!isNotaFree) {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // 7 days trial period
            }

            const subscriptionData = {
                tenant_id: tenantId,
                plan_id: plan.id,
                status: 'active', // ✅ All subscriptions start as active
                start_date: startDate,
                end_date: endDate, // ✅ NULL for NotaFree
                auto_renew: false,
                price: plan.price || 0,
                final_price: plan.price || 0,
                payment_method: isNotaFree ? 'free' : null,
                notes: isNotaFree ? 'NotaFree plan - gratis selamanya' : 'New subscription - NotaPro'
            };

            const subscription = await SubscriptionRepository.create(subscriptionData, transaction);

            // ✅ No need to update tenant subscription_status - already set to 'active' during tenant creation
            console.log('✅ Subscription created successfully:', {
                id: subscription.id,
                tenant_id: tenantId,
                status: subscription.status,
                plan_id: subscription.plan_id
            });

            return subscription;
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw new Error('Gagal membuat subscription');
        }
    }

    // Complete account creation process
    static async createCompleteAccount(orderData, skipWhatsApp = false) {
        const transaction = await sequelize.transaction();
        try {
            console.log('🔄 Starting account creation with transaction...');
            
            // Create tenant
            const tenant = await this.createTenantAccount(orderData, transaction);
            console.log('✅ Tenant created:', tenant.id);

            // Create default branch for the tenant
            const branch = await this.createDefaultBranch(tenant.id, orderData, transaction);
            console.log('✅ Branch created:', branch.id);

            // Create superadmin user with the new branch
            const userResult = await this.createSuperAdminUser(tenant.id, branch.id, orderData, transaction);
            console.log('✅ User created:', userResult.user.id);

            // Create subscription
            const subscription = await this.createSubscription(tenant.id, orderData, transaction);
            console.log('✅ Subscription created:', subscription.id);

            // Create onboarding record
            console.log('📝 Step 5: Creating onboarding record...');
            console.log('🔍 User result for onboarding:', {
                user_id: userResult.user.id,
                user_type: typeof userResult.user.id,
                user_object: userResult.user
            });
            
            if (!userResult.user.id) {
                throw new Error('User ID is required for onboarding record');
            }
            
            await TenantOnboardingRepository.create({
                tenant_id: tenant.id,
                user_id: userResult.user.id,
                current_step: 'branch_setup',
                completed_steps: ['branch_setup'], // Mark branch setup as completed
                onboarding_data: {
                    branch: {
                        id: branch.id,
                        name: branch.name,
                        address: branch.address,
                        phone: branch.phone
                    }
                },
                is_completed: false
            }, transaction);
            console.log('✅ Onboarding record created');

            // Commit transaction before external operations
            await transaction.commit();
            console.log('✅ Transaction committed successfully');

            // 🚀 NEW: Generate default data for new tenant (after transaction commit)
            console.log('📝 Step 6: Generating default data...');
            try {
                const defaultDataResult = await DefaultDataService.generateAllDefaultData(
                    tenant.id, 
                    branch.id, 
                    orderData
                );
                console.log('✅ Default data generation result:', defaultDataResult);
            } catch (defaultDataError) {
                console.error('⚠️ Warning: Failed to generate default data:', defaultDataError.message);
                // Don't throw error here - account creation should still succeed even if default data fails
            }

            let sendResult = { success: false, message: 'WhatsApp skipped' };
            
            // Send credentials to WhatsApp only if not skipped (after transaction commit)
            if (!skipWhatsApp) {
                const trialEndDate = new Date(tenant.trial_end_date).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                sendResult = await WAService.sendCredentials(
                    orderData.owner_whatsapp, // ✅ Send to owner WhatsApp
                    orderData.owner_name,
                    orderData.business_name,
                    orderData.email, // Use email instead of username
                    userResult.credentials.password,
                    trialEndDate
                );
            }

            return {
                success: true,
                tenant_id: tenant.id,
                branch_id: branch.id,
                user_id: userResult.user.id,
                subscription_id: subscription.id,
                credentials: userResult.credentials,
                trial_end_date: tenant.trial_end_date,
                whatsapp_sent: sendResult.success,
                whatsapp_message: sendResult.message,
                branch_info: {
                    id: branch.id,
                    name: branch.name,
                    address: branch.address,
                    phone: branch.phone
                }
            };
        } catch (error) {
            console.error('❌ Error creating complete account:', error);
            await transaction.rollback();
            console.log('🔄 Transaction rolled back due to error');
            throw new Error('Gagal membuat akun lengkap: ' + error.message);
        }
    }
}

module.exports = AccountCreationService;
