const { Absent, Branch, Op, sequelize, User } = require('../models');

class AbsentRepository {
    static async create(data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Absent.create(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async getAll({ page, pageSize, startDate, endDate, search }) {
        try {
            const dateFilter = startDate && endDate ? { date: { [Op.between]: [startDate, endDate] } } : {};
            const searchFilter = search
                ? {
                    [Op.or]: [
                        { '$employee_absent.name$': { [Op.substring]: search } },
                    ],
                }
                : {};
            const whereFilter = { ...dateFilter, ...searchFilter };

            const offset = (page - 1) * pageSize;
            const pageSizeInt = parseInt(pageSize, 10);

            const absents = await Absent.findAll({
                include: [
                    {
                        model: User,
                        as: 'employee_absent',
                        required: true,
                    },
                ],
                where: whereFilter,
                offset: offset,
                limit: pageSizeInt,
                order: [['date', 'DESC']],
            });

            const totalCount = absents.length;

            const pagination = {
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
                currentPage: page,
            };

            const employees = await User.findAll({
                where: {
                    role: ['admin', 'employee', 'supervisor'],
                    status: 'active'
                }
            });

            const rekap_karyawan = await Promise.all(employees.map(async (employee) => {
                const absences = await Absent.findAll({
                    where: {
                        employee_id: employee.id,
                        ...dateFilter
                    }
                });

                const total_days = absences.length;
                const total_present = absences.filter(a => a.status.toLowerCase() === 'present').length;
                const total_absent = absences.filter(a => a.status.toLowerCase() === 'absent').length;
                const total_sick = absences.filter(a => a.status.toLowerCase() === 'sick').length;
                const total_day_off_personal = absences.filter(a => a.status.toLowerCase() === 'dayoffpersonal').length;
                const total_day_off_general = absences.filter(a => a.status.toLowerCase() === 'dayoffgeneral').length;
                const total_annual_leave = absences.filter(a => a.status.toLowerCase() === 'annualleave').length;
                const total_personal_leave = absences.filter(a => a.status.toLowerCase() === 'personalleave').length;
                const total_emergency_leave = absences.filter(a => a.status.toLowerCase() === 'emergencyleave').length;

                const total_work_duration = absences
                    .filter(a => a.status === 'Present' && a.work_duration)
                    .reduce((total, current) => {
                        const [hours, minutes, seconds] = current.work_duration.split(':').map(Number);
                        return total + hours + (minutes / 60) + (seconds / 3600);
                    }, 0).toFixed(2);

                return {
                    employee_id: employee.id,
                    name: employee.name,
                    total_days,
                    total_present,
                    total_absent,
                    total_sick,
                    total_day_off_personal,
                    total_day_off_general,
                    total_annual_leave,
                    total_personal_leave,
                    total_emergency_leave,
                    total_work_duration: `${total_work_duration} hours`
                };
            }));

            return { absents, pagination, rekap_karyawan };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Daftar absensi untuk halaman Monitoring Absensi (supervisor/owner).
     *
     * Diurutkan dari skor AI TERENDAH ke tertinggi supaya baris yang paling
     * perlu dicek manusia muncul di atas. Baris tanpa skor AI (belum ada foto /
     * verifikasi dilewati) ditaruh paling bawah karena dianggap tidak mendesak.
     *
     * @param {object} params
     * @param {string} [params.date]      'YYYY-MM-DD' — satu tanggal
     * @param {number} [params.branchId]  filter cabang
     * @param {number} [params.tenantId]  batas tenant
     * @param {string} [params.search]    cari nama karyawan
     */
    static async getMonitor({ date, branchId, tenantId, search }) {
        try {
            const where = {};
            if (date) where.date = date;
            if (branchId) where.branch_id = branchId;
            if (search) where['$employee_absent.name$'] = { [Op.substring]: search };

            const branchWhere = {};
            if (tenantId) branchWhere.tenant_id = tenantId;

            const rows = await Absent.findAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'employee_absent',
                        required: true,
                        attributes: ['id', 'name', 'role', 'branch_id'],
                    },
                    {
                        model: Branch,
                        required: true,
                        attributes: ['id', 'name'],
                        where: branchWhere,
                    },
                ],
                order: [
                    [
                        sequelize.literal(
                            'LEAST(IFNULL(absents.ai_clock_in_score, 101), IFNULL(absents.ai_clock_out_score, 101))'
                        ),
                        'ASC',
                    ],
                    ['id', 'ASC'],
                ],
            });

            return rows;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id) {
        try {
            const result = await Absent.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getByUserId(id, month, year) {
        try {
            const result = await Absent.findAll({ where: { employee_id: id, date: { [Op.between]: [new Date(year, month - 1, 1), new Date(year, month, 0)] } }, order: [['date', 'DESC']] });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(id, data) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Absent.findByPk(id);

            await result.update(data, { transaction });
            await transaction.commit();

            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async delete(id) {
        const transaction = await sequelize.transaction();
        try {
            const result = await Absent.findByPk(id);

            await result.destroy({ transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async findUnfinishedAbsent(employee_id, threeDaysAgo) {
        try {
            const result = await Absent.findOne({
                where: {
                    employee_id: employee_id,
                    date: {
                        [Op.gte]: threeDaysAgo
                    },
                    clock_out: null
                },
                order: [['date', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async findUnfinishedAbsentByDateRange(employee_id, startDate, endDate) {
        try {
            const result = await Absent.findOne({
                where: {
                    employee_id: employee_id,
                    date: {
                        [Op.between]: [startDate, endDate]
                    },
                    clock_out: null
                },
                order: [['date', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async findTodayAbsent(employee_id, today) {
        try {
            const result = await Absent.findOne({
                where: {
                    employee_id: employee_id,
                    date: today
                }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async findPermissions(userId) {
        try {
            const result = await Absent.findAll({
                where: {
                    employee_id: userId,
                    status: ['Sick', 'Absent', 'DayOffPersonal', 'DayOffGeneral', 'AnnualLeave', 'PersonalLeave', 'EmergencyLeave']
                },
                order: [['date', 'DESC']]
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async findById(id) {
        try {
            const result = await Absent.findByPk(id);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async findTodayPermission(userId, today) {
        try {
            const result = await Absent.findOne({
                where: {
                    employee_id: userId,
                    date: today,
                    status: ['Sick', 'Absent', 'DayOffPersonal', 'DayOffGeneral', 'AnnualLeave', 'PersonalLeave', 'EmergencyLeave']
                }
            });

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

}

module.exports = AbsentRepository;