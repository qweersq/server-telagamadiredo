const { Branch } = require('../models');
const BranchMitraRepository = require('../repositories/branchMitraRepository');

/**
 * Get all branch IDs that user can access (including mitra branches for main branch)
 * @param {number} br anchId - User's branch ID
 * @param {number} tenantId - User's tenant ID
 * @returns {Promise<number[]>} Array of accessible branch IDs
 */
async function getAccessibleBranchIds(branchId, tenantId) {
    try {
        if (!branchId) {
            return [];
        }

        // Get branch info
        const branch = await Branch.findByPk(branchId);

        if (!branch) {
            return [branchId];
        }

        // Jika branch type adalah 'main', include semua mitra
        if (branch.branch_type === 'main') {
            const mitraIds = await BranchMitraRepository.getAllMitraBranchIds(branchId, tenantId);
            return [branchId, ...mitraIds];
        }

        // Jika branch type adalah 'mitra', hanya return branch sendiri
        return [branchId];
    } catch (error) {
        console.error('Error getting accessible branch IDs:', error);
        return [branchId]; // Fallback ke branch sendiri jika error
    }
}

module.exports = {
    getAccessibleBranchIds
};
