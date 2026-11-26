const AppVersionRepository = require('../repositories/appVersionRepository');

class AppVersionService {
    static async create(data) {
        try {
            // Set is_active to false for other versions of the same platform
            if (data.is_active) {
                await AppVersionRepository.deactivateByPlatform(data.platform);
            }
            
            const result = await AppVersionRepository.create(data);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAll(platform = null) {
        try {
            const result = await AppVersionRepository.getAll(platform);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await AppVersionRepository.getById(id);
            if (!result) {
                throw new Error('App version not found');
            }
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async checkVersion(platform, currentVersion) {
        try {
            const latest = await AppVersionRepository.getLatest(platform);
            
            if (!latest) {
                return {
                    hasUpdate: false,
                    forceUpdate: false,
                    latestVersion: currentVersion,
                    minRequiredVersion: currentVersion,
                    updateMessage: null,
                    features: []
                };
            }

            const hasUpdate = latest.version !== currentVersion;
            const needsUpdate = this.compareVersion(currentVersion, latest.min_required_version) < 0;

            return {
                hasUpdate,
                forceUpdate: latest.force_update || needsUpdate,
                latestVersion: latest.version,
                minRequiredVersion: latest.min_required_version,
                updateMessage: latest.update_message,
                features: latest.features || [],
                versionCode: latest.version_code
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static compareVersion(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        
        return 0;
    }

    static async update(id, data) {
        try {
            // If setting to active, deactivate other versions of same platform
            if (data.is_active) {
                const existing = await AppVersionRepository.getById(id);
                if (existing && existing.platform) {
                    await AppVersionRepository.deactivateByPlatform(existing.platform, id);
                }
            }
            
            const result = await AppVersionRepository.update(id, data);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        try {
            const result = await AppVersionRepository.delete(id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = AppVersionService;

