const { Branch } = require('../models');

class LocationValidationService {
    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in meters
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    /**
     * Validate GPS accuracy
     * @param {number} accuracy - GPS accuracy in meters
     * @param {number} maxAccuracy - Toleransi akurasi (meter)
     * @returns {boolean} Whether accuracy is acceptable
     */
    static validateAccuracy(accuracy, maxAccuracy = 150) {
        return Boolean(accuracy) && Number(accuracy) <= maxAccuracy;
    }

    /**
     * Validate employee location against branch location
     * @param {number} employeeLat - Employee latitude
     * @param {number} employeeLon - Employee longitude
     * @param {number} accuracy - GPS accuracy
     * @param {number} branchId - Branch ID
     * @param {number} maxDistance - Maximum allowed distance in meters (default: 100)
     * @returns {Object} Validation result
     */
    static async validateLocation(employeeLat, employeeLon, accuracy, branchId, maxDistance = null) {
        try {
            // 1. Validate GPS accuracy
            if (!this.validateAccuracy(accuracy)) {
                return {
                    isValid: false,
                    error: `Akurasi GPS terlalu rendah (${Math.round(Number(accuracy) || 0)}m). Aktifkan GPS presisi tinggi lalu coba lagi.`,
                    code: 'GPS_INACCURATE'
                };
            }

            // 2. Get branch location
            const branch = await Branch.findByPk(branchId);
            if (!branch) {
                return {
                    isValid: false,
                    error: 'Cabang tidak ditemukan.',
                    code: 'BRANCH_NOT_FOUND'
                };
            }

            if (!branch.latitude || !branch.longitude) {
                return {
                    isValid: false,
                    error: 'Lokasi kantor belum dikonfigurasi. Silakan hubungi Owner/Admin.',
                    code: 'BRANCH_LOCATION_NOT_SET'
                };
            }

            // Radius mengikuti pengaturan cabang (checkin_radius_m), default 150m
            const radius = maxDistance || Number(branch.checkin_radius_m) || 150;
            maxDistance = radius;

            // 3. Calculate distance
            const distance = this.calculateDistance(
                employeeLat, employeeLon,
                branch.latitude, branch.longitude
            );

            // 4. Validate within radius
            if (distance > maxDistance) {
                return {
                    isValid: false,
                    error: `Anda berada ${Math.round(distance)}m dari kantor. Maksimal ${maxDistance}m.`,
                    code: 'TOO_FAR_FROM_BRANCH',
                    distance: Math.round(distance),
                    maxDistance
                };
            }

            // 5. Success
            return {
                isValid: true,
                distance: Math.round(distance),
                maxDistance,
                branch: {
                    id: branch.id,
                    name: branch.name,
                    latitude: branch.latitude,
                    longitude: branch.longitude
                }
            };

        } catch (error) {
            console.error('Location validation error:', error);
            return {
                isValid: false,
                error: 'Gagal memvalidasi lokasi. Silakan coba lagi.',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    /**
     * Get branch location info
     * @param {number} branchId - Branch ID
     * @returns {Object} Branch location info
     */
    static async getBranchLocation(branchId) {
        try {
            const branch = await Branch.findByPk(branchId);
            if (!branch) {
                return {
                    success: false,
                    error: 'Cabang tidak ditemukan.'
                };
            }

            if (!branch.latitude || !branch.longitude) {
                return {
                    success: false,
                    error: 'Lokasi kantor belum dikonfigurasi.'
                };
            }

            return {
                success: true,
                data: {
                    id: branch.id,
                    name: branch.name,
                    address: branch.address,
                    latitude: branch.latitude,
                    longitude: branch.longitude
                }
            };

        } catch (error) {
            console.error('Get branch location error:', error);
            return {
                success: false,
                error: 'Gagal mendapatkan lokasi kantor.'
            };
        }
    }
}

module.exports = LocationValidationService;
