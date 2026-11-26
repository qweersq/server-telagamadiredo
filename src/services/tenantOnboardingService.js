const TenantOnboardingRepository = require('../repositories/tenantOnboardingRepository');
const BranchRepository = require('../repositories/branchRepository');
const UserRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');

class TenantOnboardingService {
    // Start onboarding process for new tenant
    static async startOnboarding(tenantId, userId) {
        try {
            // Check if onboarding already exists
            const existingOnboarding = await TenantOnboardingRepository.getByTenantId(tenantId);
            if (existingOnboarding) {
                return existingOnboarding;
            }

            // Create new onboarding record
            const onboardingData = {
                tenant_id: tenantId,
                user_id: userId,
                current_step: 'branch_setup',
                completed_steps: [],
                onboarding_data: {},
                is_completed: false
            };

            const onboarding = await TenantOnboardingRepository.create(onboardingData);
            return onboarding;
        } catch (error) {
            throw new Error('Gagal memulai proses onboarding: ' + error.message);
        }
    }

    // Complete branch setup step (branch already created, just update onboarding)
    static async completeBranchSetup(tenantId, branchData) {
        try {
            // Get existing branch for this tenant
            const existingBranch = await BranchRepository.getByTenantId(tenantId);
            
            if (!existingBranch) {
                throw new Error('Branch tidak ditemukan untuk tenant ini');
            }

            // Update branch data if provided
            if (branchData.name || branchData.address || branchData.phone) {
                await BranchRepository.update(existingBranch.id, {
                    name: branchData.name || existingBranch.name,
                    address: branchData.address || existingBranch.address,
                    phone: branchData.phone || existingBranch.phone
                });
            }

            // Update onboarding data
            await TenantOnboardingRepository.updateOnboardingData(tenantId, {
                branch: {
                    id: existingBranch.id,
                    name: existingBranch.name,
                    address: existingBranch.address,
                    phone: existingBranch.phone
                }
            });

            // Move to next step
            await TenantOnboardingRepository.updateStep(tenantId, 'user_creation', ['branch_setup']);

            return {
                success: true,
                branch: existingBranch,
                next_step: 'user_creation',
                message: 'Branch sudah tersedia, silakan buat user admin dan teknisi'
            };
        } catch (error) {
            throw new Error('Gagal mengupdate branch: ' + error.message);
        }
    }

    // Complete user creation step
    static async completeUserCreation(tenantId, usersData) {
        try {
            const onboarding = await TenantOnboardingRepository.getByTenantId(tenantId);
            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            const branchId = onboarding.onboarding_data.branch.id;
            const createdUsers = [];

            // Create admin user
            if (usersData.admin) {
                const adminPassword = await bcrypt.hash(usersData.admin.password, 10);
                const adminUser = await UserRepository.create({
                    name: usersData.admin.name,
                    email: usersData.admin.email,
                    phone: usersData.admin.phone,
                    password: adminPassword,
                    role: 'admin',
                    status: 'active',
                    tenant_id: tenantId,
                    branch_id: branchId
                });
                createdUsers.push({ ...adminUser.toJSON(), role: 'admin' });
            }

            // Create teknisi user
            if (usersData.teknisi) {
                const teknisiPassword = await bcrypt.hash(usersData.teknisi.password, 10);
                const teknisiUser = await UserRepository.create({
                    name: usersData.teknisi.name,
                    email: usersData.teknisi.email,
                    phone: usersData.teknisi.phone,
                    password: teknisiPassword,
                    role: 'employee',
                    status: 'active',
                    tenant_id: tenantId,
                    branch_id: branchId
                });
                createdUsers.push({ ...teknisiUser.toJSON(), role: 'teknisi' });
            }

            // Update onboarding data
            await TenantOnboardingRepository.updateOnboardingData(tenantId, {
                users: createdUsers
            });

            // Move to next step
            await TenantOnboardingRepository.updateStep(tenantId, 'service_setup', ['branch_setup', 'user_creation']);

            return {
                success: true,
                users: createdUsers,
                next_step: 'service_setup',
                message: 'User admin dan teknisi berhasil dibuat, silakan setup layanan'
            };
        } catch (error) {
            throw new Error('Gagal membuat user: ' + error.message);
        }
    }

    // Complete service setup step
    static async completeServiceSetup(tenantId, servicesData) {
        try {
            // Update onboarding data with services
            await TenantOnboardingRepository.updateOnboardingData(tenantId, {
                services: servicesData
            });

            // Move to next step
            await TenantOnboardingRepository.updateStep(tenantId, 'printer_setup', ['branch_setup', 'user_creation', 'service_setup']);

            return {
                success: true,
                next_step: 'printer_setup',
                message: 'Layanan berhasil disetup, silakan setup printer'
            };
        } catch (error) {
            throw new Error('Gagal setup layanan: ' + error.message);
        }
    }

    // Complete printer setup step
    static async completePrinterSetup(tenantId, printerData) {
        try {
            // Update onboarding data with printer info
            await TenantOnboardingRepository.updateOnboardingData(tenantId, {
                printer: printerData
            });

            // Move to next step
            await TenantOnboardingRepository.updateStep(tenantId, 'wa_setup', ['branch_setup', 'user_creation', 'service_setup', 'printer_setup']);

            return {
                success: true,
                next_step: 'wa_setup',
                message: 'Printer berhasil disetup, silakan setup WhatsApp'
            };
        } catch (error) {
            throw new Error('Gagal setup printer: ' + error.message);
        }
    }

    // Complete WhatsApp setup step
    static async completeWaSetup(tenantId, waData) {
        try {
            // Update onboarding data with WhatsApp info
            await TenantOnboardingRepository.updateOnboardingData(tenantId, {
                whatsapp: waData
            });

            // Complete onboarding
            await TenantOnboardingRepository.updateStep(tenantId, 'completed', ['branch_setup', 'user_creation', 'service_setup', 'printer_setup', 'wa_setup']);

            return {
                success: true,
                next_step: 'completed',
                message: 'Onboarding berhasil diselesaikan! Sistem siap digunakan.'
            };
        } catch (error) {
            throw new Error('Gagal setup WhatsApp: ' + error.message);
        }
    }

    // Get current onboarding status
    static async getOnboardingStatus(tenantId) {
        try {
            const onboarding = await TenantOnboardingRepository.getByTenantId(tenantId);
            if (!onboarding) {
                return null;
            }

            return {
                id: onboarding.id,
                tenant_id: onboarding.tenant_id,
                user_id: onboarding.user_id,
                current_step: onboarding.current_step,
                completed_steps: onboarding.completed_steps,
                onboarding_data: onboarding.onboarding_data,
                is_completed: onboarding.is_completed,
                completed_at: onboarding.completed_at,
                created_at: onboarding.createdAt,
                updated_at: onboarding.updatedAt
            };
        } catch (error) {
            throw new Error('Gagal mendapatkan status onboarding: ' + error.message);
        }
    }

    // Complete onboarding (mark as finished)
    static async completeOnboarding(tenantId, userId) {
        try {
            const onboarding = await TenantOnboardingRepository.getByTenantId(tenantId);
            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            // Mark onboarding as completed
            await TenantOnboardingRepository.completeOnboarding(tenantId, userId);

            return {
                success: true,
                message: 'Onboarding berhasil diselesaikan! Sistem siap digunakan.',
                completed_at: new Date()
            };
        } catch (error) {
            throw new Error('Gagal menyelesaikan onboarding: ' + error.message);
        }
    }

    // Skip a step (for testing or admin purposes)
    static async skipStep(tenantId, step) {
        try {
            const onboarding = await TenantOnboardingRepository.getByTenantId(tenantId);
            if (!onboarding) {
                throw new Error('Onboarding record not found');
            }

            const completedSteps = onboarding.completed_steps || [];
            if (!completedSteps.includes(step)) {
                completedSteps.push(step);
            }

            // Determine next step
            const allSteps = ['branch_setup', 'user_creation', 'service_setup', 'printer_setup', 'wa_setup'];
            const currentIndex = allSteps.indexOf(step);
            const nextStep = currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : 'completed';

            await TenantOnboardingRepository.updateStep(tenantId, nextStep, completedSteps);

            return {
                success: true,
                skipped_step: step,
                next_step: nextStep,
                message: `Step ${step} berhasil dilewati`
            };
        } catch (error) {
            throw new Error('Gagal melewati step: ' + error.message);
        }
    }
}

module.exports = TenantOnboardingService;
