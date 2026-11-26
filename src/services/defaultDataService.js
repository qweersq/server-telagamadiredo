const TreatmentRepository = require('../repositories/treatmentRepository');
const ItemRepository = require('../repositories/itemRepository');
const MembershipRepository = require('../repositories/membershipRepository');
const FinanceAccountRepository = require('../repositories/financeAccountRepository');
const FinanceCategoryRepository = require('../repositories/financeCategoryRepository');
const DiscountRepository = require('../repositories/discountRepository');
const CampaignService = require('./campaignService');

class DefaultDataService {
    
    /**
     * Generate all default data for new tenant
     * @param {number} tenantId - ID of the new tenant
     * @param {number} branchId - ID of the default branch
     * @param {object} orderData - Order data from registration
     */
    static async generateAllDefaultData(tenantId, branchId, orderData) {
        try {
            console.log('🔄 Generating default data for new tenant:', {
                tenant_id: tenantId,
                branch_id: branchId,
                business_name: orderData.business_name
            });
            
            // 1. Generate 5 Default Treatments
            console.log('📝 Step 1: Generating default treatments...');
            await this.generateDefaultTreatments(tenantId);
            
            // 2. Generate 5 Default Items  
            console.log('📝 Step 2: Generating default items...');
            await this.generateDefaultItems(tenantId);
            
            // 3. Generate 1 Default Membership
            console.log('📝 Step 3: Generating default membership...');
            await this.generateDefaultMembership(tenantId, branchId);
            
            // 4. Generate 3 Default Finance Accounts
            console.log('📝 Step 4: Generating default finance accounts...');
            await this.generateDefaultFinanceAccounts(tenantId, branchId, orderData);
            
            // 5. Generate 3 Default Finance Categories
            console.log('📝 Step 5: Generating default finance categories...');
            await this.generateDefaultFinanceCategories(tenantId);
            
            // 6. Generate 2 Default Discounts
            console.log('📝 Step 6: Generating default discounts...');
            await this.generateDefaultDiscounts(tenantId);
            
            // 7. Generate 1 Default Campaign
            console.log('📝 Step 7: Generating default campaign...');
            await this.generateDefaultCampaign(tenantId, branchId, orderData);
            
            console.log('✅ Default data generation completed successfully!');
            
            return {
                success: true,
                message: 'Default data generated successfully',
                data: {
                    treatments: 5,
                    items: 5,
                    memberships: 1,
                    finance_accounts: 3,
                    finance_categories: 3,
                    discounts: 2,
                    campaigns: 1
                }
            };
            
        } catch (error) {
            console.error('❌ Error generating default data:', error);
            throw new Error('Failed to generate default data: ' + error.message);
        }
    }

    /**
     * Generate default treatments (5 items)
     */
    static async generateDefaultTreatments(tenantId) {
        const defaultTreatments = [
            {
                name: "Shoes - Deep Clean",
                price: 40000,
                type_item: "Shoes",
                type_service: "Deep Clean", 
                description: "Mencuci keseluruhan bagian sepatu hingga bersih maksimal",
                is_active: true,
                tenant_id: tenantId
            },
            {
                name: "Shoes - Fast Clean", 
                price: 30000,
                type_item: "Shoes",
                type_service: "Outside Clean",
                description: "Mencuci bagian luar sepatu saja",
                is_active: true,
                tenant_id: tenantId
            },
            {
                name: "Shoes - Reglue",
                price: 100000,
                type_item: "Shoes", 
                type_service: "Reglue Minor",
                description: "Pengeleman sepatu untuk kerusakan kecil",
                is_active: true,
                tenant_id: tenantId
            },
            {
                name: "Bag - Deep Clean",
                price: 35000,
                type_item: "Bag",
                type_service: "Deep Clean", 
                description: "Mencuci keseluruhan tas",
                is_active: true,
                tenant_id: tenantId
            }
        ];

        for (const treatment of defaultTreatments) {
            await TreatmentRepository.create(treatment);
        }

        console.log('✅ Generated 5 default treatments');
    }

    /**
     * Generate default items (5 items)
     */
    static async generateDefaultItems(tenantId) {
        const defaultItems = [
            {
                name: "Air Force 1",
                brand: "Nike", 
                type: "Sneakers",
                color: "Putih",
                material: "Leather",
                tenant_id: tenantId
            },
            {
                name: "All Star",
                brand: "Converse",
                type: "Sneakers", 
                color: "Putih, Hitam",
                material: "Canvas",
                tenant_id: tenantId
            },
            {
                name: "Ultraboost",
                brand: "Adidas",
                type: "Sport",
                color: "Putih", 
                material: "Mesh",
                tenant_id: tenantId
            },
            {
                name: "530 Running",
                brand: "New Balance",
                type: "Running",
                color: "Abu-abu",
                material: "Mesh, Suede",
                tenant_id: tenantId
            },
            {
                name: "Sandal Casual",
                brand: "Generic",
                type: "Sandal",
                color: "Hitam",
                material: "Synthetic Leather",
                tenant_id: tenantId
            }
        ];

        for (const item of defaultItems) {
            await ItemRepository.create(item);
        }

        console.log('✅ Generated 5 default items');
    }

    /**
     * Generate default membership (1 item)
     */
    static async generateDefaultMembership(tenantId, branchId) {
        const defaultMembership = {
            name: "Member 10%",
            description: "Potongan 10% setiap cuci", 
            discount_percentage: 10.00,
            price: 100000, // 100rb
            duration_days: 365,
            min_points: 0, // Default tier untuk semua customer (min_points = 0)
            is_active: true,
            tenant_id: tenantId,
            branch_id: branchId
        };

        await MembershipRepository.create(defaultMembership);
        console.log('✅ Generated 1 default membership');
    }

    /**
     * Generate default finance accounts (3 items)
     */
    static async generateDefaultFinanceAccounts(tenantId, branchId, orderData) {
        const branchName = `${orderData.business_name} - Pusat`;
        
        const defaultFinanceAccounts = [
            // GLOBAL - Bank BCA
            {
                name: "Bank",
                balance: 0,
                description: "Rekening utama perusahaan",
                is_global: true,
                is_branch_specific: false,
                payment_method_id: 6, // Bank Transfer
                tenant_id: tenantId,
                branch_id: null,
                is_active: true
            },
            
            // GLOBAL - QRIS
            {
                name: "QRIS", 
                balance: 0,
                description: "Akun untuk mencatat transaksi melalui QRIS",
                is_global: true,
                is_branch_specific: false, 
                payment_method_id: 2, // QRIS
                tenant_id: tenantId,
                branch_id: null,
                is_active: true
            },
            
            // BRANCH SPECIFIC - Cash
            {
                name: `Cash (Tunai)`,
                balance: 0,
                description: `Kas tunai untuk operasional`,
                is_global: false,
                is_branch_specific: true,
                payment_method_id: 1, // Cash
                tenant_id: tenantId, 
                branch_id: branchId,
                is_active: true
            }
        ];

        for (const account of defaultFinanceAccounts) {
            await FinanceAccountRepository.create(
                account.name,
                account.balance,
                account.description,
                account.tenant_id,
                account.branch_id,
                account.is_active,
                account.payment_method_id
            );
        }

        console.log('✅ Generated 3 default finance accounts');
    }

    /**
     * Generate default finance categories (4 items)
     */
    static async generateDefaultFinanceCategories(tenantId) {
        const defaultFinanceCategories = [
            {
                name: "Pendapatan",
                type: "credit",
                description: "Pemasukan dari layanan cuci sepatu dan membership",
                is_system: true, // TIDAK BISA DIHAPUS
                tenant_id: tenantId
            },
            {
                name: "Beban Operasional",
                type: "debit", 
                description: "Biaya operasional harian",
                is_system: true, // TIDAK BISA DIHAPUS
                tenant_id: tenantId
            },
            {
                name: "Beban Gaji",
                type: "debit",
                description: "Biaya gaji karyawan", 
                is_system: true, // TIDAK BISA DIHAPUS
                tenant_id: tenantId
            },
            {
                name: "Transfer & Penyesuaian",
                type: "neutral",
                description: "Kategori neutral untuk transfer antar akun dan penyesuaian saldo",
                is_system: true, // TIDAK BISA DIHAPUS
                tenant_id: tenantId
            }
        ];

        for (const category of defaultFinanceCategories) {
            await FinanceCategoryRepository.create(category);
        }

        console.log('✅ Generated 4 default finance categories');
    }

    /**
     * Generate default discounts (2 items)
     */
    static async generateDefaultDiscounts(tenantId) {
        const defaultDiscounts = [
            {
                name: "Discount 10%",
                type: "percent",
                discount: 10.00,
                is_active: true,
                tenant_id: tenantId
            },
            {
                name: "Potongan 15rb", 
                type: "nominal",
                discount: 15000.00,
                is_active: true,
                tenant_id: tenantId
            }
        ];

        for (const discount of defaultDiscounts) {
            await DiscountRepository.create(discount);
        }

        console.log('✅ Generated 2 default discounts');
    }

    /**
     * Generate default campaign (1 item)
     */
    static async generateDefaultCampaign(tenantId, branchId, orderData) {
        try {
            // Get the first user (superadmin) from the tenant
            const { User } = require('../models');
            const superadmin = await User.findOne({
                where: { 
                    tenant_id: tenantId,
                    role: 'superadmin'
                }
            });

            if (!superadmin) {
                console.warn('⚠️ No superadmin found for tenant, skipping default campaign creation');
                return;
            }

            await CampaignService.createDefaultCampaign(
                tenantId, 
                superadmin.id
            );

            console.log('✅ Generated 1 default campaign');
        } catch (error) {
            console.error('❌ Error generating default campaign:', error);
            // Don't throw error - campaign creation is optional
        }
    }
}

module.exports = DefaultDataService;
