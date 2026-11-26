const TopTenantRepository = require('../repositories/topTenantRepository');

class TopTenantService {
    /**
     * Get top tenants by omzet for a specific month/year
     * @param {Object} params - Query parameters
     * @param {number} params.month - Month (1-12)
     * @param {number} params.year - Year (e.g., 2026)
     * @param {number} params.limit - Max number of results
     * @returns {Promise<Object>} Top tenants with summary
     */
    static async getTopTenantsByOmzet({ month, year, limit = 50 }) {
        // Validate month and year
        const currentDate = new Date();
        const parsedMonth = parseInt(month, 10);
        const parsedYear = parseInt(year, 10);

        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
            throw new Error('Invalid month. Must be between 1 and 12.');
        }

        if (isNaN(parsedYear) || parsedYear < 2020 || parsedYear > currentDate.getFullYear() + 1) {
            throw new Error('Invalid year.');
        }

        // Get summary statistics
        const summary = await TopTenantRepository.getOmzetSummary(parsedMonth, parsedYear);

        // Get top tenants
        const tenants = await TopTenantRepository.getTopTenantsByOmzet(parsedMonth, parsedYear, limit);

        // Format numbers
        const formattedTenants = tenants.map((tenant, index) => ({
            rank: index + 1,
            tenant_id: tenant.tenant_id,
            business_name: tenant.business_name,
            owner_name: tenant.owner_name,
            phone: tenant.phone,
            city: tenant.city,
            status: tenant.status,
            subscription_status: tenant.subscription_status,
            total_orders: parseInt(tenant.total_orders, 10) || 0,
            total_omzet: parseFloat(tenant.total_omzet) || 0,
            total_pemasukan: parseFloat(tenant.total_pemasukan) || 0,
            total_branches: parseInt(tenant.total_branches, 10) || 0
        }));

        return {
            period: {
                month: parsedMonth,
                year: parsedYear,
                month_name: new Date(parsedYear, parsedMonth - 1).toLocaleDateString('id-ID', { month: 'long' })
            },
            summary: {
                total_tenants: parseInt(summary.total_tenants, 10) || 0,
                total_orders: parseInt(summary.total_orders, 10) || 0,
                total_omzet: parseFloat(summary.total_omzet) || 0,
                total_pemasukan: parseFloat(summary.total_pemasukan) || 0,
                avg_order_value: parseFloat(summary.avg_order_value) || 0
            },
            tenants: formattedTenants
        };
    }

    /**
     * Get branch breakdown for a specific tenant
     * @param {Object} params - Query parameters
     * @param {number} params.tenantId - Tenant ID
     * @param {number} params.month - Month (1-12)
     * @param {number} params.year - Year (e.g., 2026)
     * @returns {Promise<Object>} Branches with omzet data
     */
    static async getTenantBranchesOmzet({ tenantId, month, year }) {
        const parsedTenantId = parseInt(tenantId, 10);
        const parsedMonth = parseInt(month, 10);
        const parsedYear = parseInt(year, 10);

        if (isNaN(parsedTenantId) || parsedTenantId <= 0) {
            throw new Error('Invalid tenant ID.');
        }

        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
            throw new Error('Invalid month. Must be between 1 and 12.');
        }

        if (isNaN(parsedYear) || parsedYear < 2020) {
            throw new Error('Invalid year.');
        }

        const branches = await TopTenantRepository.getTenantBranchesOmzet(
            parsedTenantId,
            parsedMonth,
            parsedYear
        );

        // Calculate total for this tenant
        const totalOmzet = branches.reduce((sum, b) => sum + (parseFloat(b.total_omzet) || 0), 0);
        const totalPemasukan = branches.reduce((sum, b) => sum + (parseFloat(b.total_pemasukan) || 0), 0);
        const totalOrders = branches.reduce((sum, b) => sum + (parseInt(b.total_orders, 10) || 0), 0);

        const formattedBranches = branches.map((branch, index) => ({
            rank: index + 1,
            branch_id: branch.branch_id,
            branch_name: branch.branch_name,
            address: branch.address,
            city: branch.city,
            status: branch.status,
            branch_type: branch.branch_type,
            total_orders: parseInt(branch.total_orders, 10) || 0,
            total_omzet: parseFloat(branch.total_omzet) || 0,
            total_pemasukan: parseFloat(branch.total_pemasukan) || 0,
            percentage: totalOmzet > 0 ? ((parseFloat(branch.total_omzet) || 0) / totalOmzet * 100).toFixed(1) : 0
        }));

        return {
            tenant_id: parsedTenantId,
            period: {
                month: parsedMonth,
                year: parsedYear,
                month_name: new Date(parsedYear, parsedMonth - 1).toLocaleDateString('id-ID', { month: 'long' })
            },
            summary: {
                total_branches: branches.length,
                total_orders: totalOrders,
                total_omzet: totalOmzet,
                total_pemasukan: totalPemasukan
            },
            branches: formattedBranches
        };
    }
}

module.exports = TopTenantService;
