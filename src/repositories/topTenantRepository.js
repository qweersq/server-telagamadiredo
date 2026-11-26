const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

class TopTenantRepository {
    /**
     * Get top tenants by omzet for a specific month/year
     * Omzet = dari Order.entry_date (Payment.final_price)
     * Pemasukan = dari finance_transactions.date (sama dengan daily-summary)
     * @param {number} month - Month (1-12)
     * @param {number} year - Year (e.g., 2026)
     * @param {number} limit - Max number of results
     * @returns {Promise<Array>} List of tenants with omzet data
     */
    static async getTopTenantsByOmzet(month, year, limit = 50) {
        const query = `
            SELECT 
                t.id as tenant_id,
                t.business_name,
                t.owner_name,
                t.phone,
                t.city,
                t.status,
                t.subscription_status,
                COUNT(DISTINCT b.id) as total_branches,
                -- Omzet: dari order yang entry_date di bulan tersebut
                (
                    SELECT COUNT(DISTINCT o2.id)
                    FROM orders o2
                    WHERE o2.tenant_id = t.id 
                        AND o2.deletedAt IS NULL
                        AND MONTH(o2.entry_date) = :month 
                        AND YEAR(o2.entry_date) = :year
                ) as total_orders,
                (
                    SELECT COALESCE(SUM(p2.final_price), 0)
                    FROM orders o2
                    JOIN payments p2 ON o2.payment_id = p2.id AND p2.deletedAt IS NULL
                    WHERE o2.tenant_id = t.id 
                        AND o2.deletedAt IS NULL
                        AND MONTH(o2.entry_date) = :month 
                        AND YEAR(o2.entry_date) = :year
                ) as total_omzet,
                -- Pemasukan: dari finance_transactions (sama dengan daily-summary)
                (
                    SELECT COALESCE(SUM(ft.final_amount), 0)
                    FROM finance_transactions ft
                    JOIN finance_categories fc ON ft.category_id = fc.id
                    WHERE ft.tenant_id = t.id 
                        AND ft.deletedAt IS NULL
                        AND fc.type = 'credit'
                        AND MONTH(ft.date) = :month 
                        AND YEAR(ft.date) = :year
                ) as total_pemasukan
            FROM tenants t
            LEFT JOIN branches b ON b.tenant_id = t.id AND b.deletedAt IS NULL
            WHERE t.deletedAt IS NULL
            GROUP BY t.id, t.business_name, t.owner_name, t.phone, t.city, t.status, t.subscription_status
            ORDER BY total_omzet DESC
            LIMIT :limit
        `;

        const results = await sequelize.query(query, {
            replacements: { month, year, limit },
            type: QueryTypes.SELECT
        });

        return results;
    }

    /**
     * Get branch breakdown for a specific tenant in a month/year
     * Omzet = dari Order.entry_date
     * Pemasukan = dari finance_transactions.date (sama dengan daily-summary)
     * @param {number} tenantId - Tenant ID
     * @param {number} month - Month (1-12)
     * @param {number} year - Year (e.g., 2026)
     * @returns {Promise<Array>} List of branches with omzet data
     */
    static async getTenantBranchesOmzet(tenantId, month, year) {
        const query = `
            SELECT 
                b.id as branch_id,
                b.name as branch_name,
                b.address,
                b.city,
                b.status,
                b.branch_type,
                -- Omzet: dari order yang entry_date di bulan tersebut
                (
                    SELECT COUNT(DISTINCT o2.id)
                    FROM orders o2
                    WHERE o2.branch_id = b.id 
                        AND o2.deletedAt IS NULL
                        AND MONTH(o2.entry_date) = :month 
                        AND YEAR(o2.entry_date) = :year
                ) as total_orders,
                (
                    SELECT COALESCE(SUM(p2.final_price), 0)
                    FROM orders o2
                    JOIN payments p2 ON o2.payment_id = p2.id AND p2.deletedAt IS NULL
                    WHERE o2.branch_id = b.id 
                        AND o2.deletedAt IS NULL
                        AND MONTH(o2.entry_date) = :month 
                        AND YEAR(o2.entry_date) = :year
                ) as total_omzet,
                -- Pemasukan: dari finance_transactions (sama dengan daily-summary)
                (
                    SELECT COALESCE(SUM(ft.final_amount), 0)
                    FROM finance_transactions ft
                    JOIN finance_categories fc ON ft.category_id = fc.id
                    WHERE ft.branch_id = b.id 
                        AND ft.deletedAt IS NULL
                        AND fc.type = 'credit'
                        AND MONTH(ft.date) = :month 
                        AND YEAR(ft.date) = :year
                ) as total_pemasukan
            FROM branches b
            WHERE b.tenant_id = :tenantId
                AND b.deletedAt IS NULL
            ORDER BY total_omzet DESC
        `;

        const results = await sequelize.query(query, {
            replacements: { tenantId, month, year },
            type: QueryTypes.SELECT
        });

        return results;
    }

    /**
     * Get summary statistics for all tenants in a month/year
     * @param {number} month - Month (1-12)
     * @param {number} year - Year (e.g., 2026)
     * @returns {Promise<Object>} Summary statistics
     */
    static async getOmzetSummary(month, year) {
        const query = `
            SELECT 
                (SELECT COUNT(DISTINCT id) FROM tenants WHERE deletedAt IS NULL) as total_tenants,
                -- Total orders di bulan tersebut (berdasarkan entry_date)
                (
                    SELECT COUNT(DISTINCT o.id)
                    FROM orders o
                    WHERE o.deletedAt IS NULL
                        AND MONTH(o.entry_date) = :month 
                        AND YEAR(o.entry_date) = :year
                ) as total_orders,
                -- Total omzet (dari order entry_date)
                (
                    SELECT COALESCE(SUM(p.final_price), 0)
                    FROM orders o
                    JOIN payments p ON o.payment_id = p.id AND p.deletedAt IS NULL
                    WHERE o.deletedAt IS NULL
                        AND MONTH(o.entry_date) = :month 
                        AND YEAR(o.entry_date) = :year
                ) as total_omzet,
                -- Total pemasukan (dari finance_transactions sama dengan daily-summary)
                (
                    SELECT COALESCE(SUM(ft.final_amount), 0)
                    FROM finance_transactions ft
                    JOIN finance_categories fc ON ft.category_id = fc.id
                    WHERE ft.deletedAt IS NULL
                        AND fc.type = 'credit'
                        AND MONTH(ft.date) = :month 
                        AND YEAR(ft.date) = :year
                ) as total_pemasukan,
                -- Average order value
                (
                    SELECT COALESCE(AVG(p.final_price), 0)
                    FROM orders o
                    JOIN payments p ON o.payment_id = p.id AND p.deletedAt IS NULL
                    WHERE o.deletedAt IS NULL
                        AND MONTH(o.entry_date) = :month 
                        AND YEAR(o.entry_date) = :year
                ) as avg_order_value
        `;

        const results = await sequelize.query(query, {
            replacements: { month, year },
            type: QueryTypes.SELECT
        });

        return results[0] || {
            total_tenants: 0,
            total_orders: 0,
            total_omzet: 0,
            total_pemasukan: 0,
            avg_order_value: 0
        };
    }
}

module.exports = TopTenantRepository;
