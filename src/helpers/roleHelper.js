class RoleHelper {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    static getRoles() {
        return [
            new RoleHelper(1, 'superadmin'),
            new RoleHelper(2, 'admin'),
            new RoleHelper(3, 'employee'),
            new RoleHelper(4, 'superapp-superadmin'),
            new RoleHelper(5, 'supervisor')
        ];
    }

    static getRoleByName(name) {
        try {
            return RoleHelper.getRoles().find(role => role.name.toLowerCase() === name.toLowerCase());
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static getRoleId(roleName) {
        try {
            const role = RoleHelper.getRoleByName(roleName);
            return role ? role.id : null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * ID role admin, dipakai sebagai acuan pewarisan izin supervisor.
     */
    static get adminRoleId() {
        return 2;
    }

    /**
     * Supervisor adalah peran turunan admin: menu & izin route-nya sama dengan
     * admin, sedangkan cakupan cabangnya mengikuti owner (semua cabang dalam
     * tenant). Lihat middlewares/authMiddleware.js.
     *
     * @param {string} roleName
     * @returns {number|null} ID admin untuk supervisor, ID role apa adanya untuk role lain.
     */
    static getEffectiveRoleId(roleName) {
        if (RoleHelper.isSupervisor(roleName)) return RoleHelper.adminRoleId;
        return RoleHelper.getRoleId(roleName);
    }

    /**
     * @param {string} roleName
     * @returns {boolean} true bila roleName adalah supervisor.
     */
    static isSupervisor(roleName) {
        return typeof roleName === 'string' && roleName.toLowerCase() === 'supervisor';
    }
}

module.exports = RoleHelper;