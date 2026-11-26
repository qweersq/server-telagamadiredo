const TopTenantService = require('../services/topTenantService');

class TopTenantController {
    /**
     * GET /api/super-app/top-tenants
     * Get top tenants by omzet for a specific month/year
     */
    static async getTopTenants(req, res) {
        try {
            const { month, year, limit } = req.query;

            // Default to current month/year if not provided
            const now = new Date();
            const queryMonth = month || (now.getMonth() + 1);
            const queryYear = year || now.getFullYear();

            const result = await TopTenantService.getTopTenantsByOmzet({
                month: queryMonth,
                year: queryYear,
                limit: limit ? parseInt(limit, 10) : 50
            });

            return res.status(200).json({
                success: true,
                message: 'Top tenants retrieved successfully',
                data: result
            });
        } catch (error) {
            console.error('Error getting top tenants:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get top tenants'
            });
        }
    }

    /**
     * GET /api/super-app/top-tenants/:tenantId/branches
     * Get branch breakdown for a specific tenant
     */
    static async getTenantBranches(req, res) {
        try {
            const { tenantId } = req.params;
            const { month, year } = req.query;

            // Default to current month/year if not provided
            const now = new Date();
            const queryMonth = month || (now.getMonth() + 1);
            const queryYear = year || now.getFullYear();

            const result = await TopTenantService.getTenantBranchesOmzet({
                tenantId,
                month: queryMonth,
                year: queryYear
            });

            return res.status(200).json({
                success: true,
                message: 'Tenant branches retrieved successfully',
                data: result
            });
        } catch (error) {
            console.error('Error getting tenant branches:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get tenant branches'
            });
        }
    }
}

module.exports = TopTenantController;
