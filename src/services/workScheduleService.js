const moment = require('moment');
const { Op } = require('sequelize');
const { WorkSchedule, WorkScheduleDay, Holiday, User, Branch } = require('../models');

/**
 * Jadwal kerja karyawan (pola mingguan) + perhitungan keterlambatan.
 *
 * Satu karyawan punya satu `work_schedules` aktif berisi 7 `work_schedule_days`.
 * Jam kerja tidak dipakai untuk memblokir absen — hanya untuk menghitung
 * `is_late` / `late_minutes`, hasilnya di-snapshot ke baris `absents`.
 */
class WorkScheduleService {
    static toTime(value) {
        if (!value) return null;
        // Sequelize mengembalikan TIME sebagai "08:00:00".
        return String(value).slice(0, 8);
    }

    static serializeSchedule(schedule) {
        if (!schedule) return null;
        const plain = typeof schedule.toJSON === 'function' ? schedule.toJSON() : schedule;
        return {
            id: plain.id,
            tenant_id: plain.tenant_id,
            employee_id: plain.employee_id,
            branch_id: plain.branch_id,
            employment_type: plain.employment_type,
            effective_from: plain.effective_from,
            effective_to: plain.effective_to,
            is_active: Boolean(plain.is_active),
            note: plain.note,
            employee: plain.employee
                ? { id: plain.employee.id, name: plain.employee.name, position: plain.employee.position || null }
                : null,
            days: (plain.days || [])
                .map((day) => ({
                    id: day.id,
                    day_of_week: Number(day.day_of_week),
                    is_rest_day: Boolean(day.is_rest_day),
                    clock_in_target: WorkScheduleService.toTime(day.clock_in_target),
                    clock_out_target: WorkScheduleService.toTime(day.clock_out_target),
                    break_minutes: Number(day.break_minutes || 0),
                    tolerance_minutes: Number(day.tolerance_minutes || 0),
                }))
                .sort((a, b) => a.day_of_week - b.day_of_week),
        };
    }

    static async findActive(employeeId, tenantId, date) {
        const day = moment(date || undefined).format('YYYY-MM-DD');

        return WorkSchedule.findOne({
            where: {
                employee_id: employeeId,
                tenant_id: tenantId,
                is_active: true,
                effective_from: { [Op.lte]: day },
                [Op.or]: [{ effective_to: null }, { effective_to: { [Op.gte]: day } }],
            },
            include: [
                { model: WorkScheduleDay, as: 'days' },
                { model: User, as: 'employee', attributes: ['id', 'name', 'position'] },
            ],
            order: [['effective_from', 'DESC'], ['id', 'DESC']],
        });
    }

    /**
     * Cari jadwal yang berlaku untuk karyawan pada tanggal tertentu,
     * lalu kembalikan target jam masuk/pulang hari itu.
     *
     * @returns {Promise<null|{schedule, target, isRestDay, holiday}>}
     */
    static async resolve(employeeId, tenantId, date, branchId = null) {
        const schedule = await WorkScheduleService.findActive(employeeId, tenantId, date);
        if (!schedule) return null;

        const day = moment(date || undefined);
        const isoDay = day.isoWeekday();
        const target = (schedule.days || []).find((item) => Number(item.day_of_week) === isoDay) || null;

        const holiday = await Holiday.findOne({
            where: {
                tenant_id: tenantId,
                date: day.format('YYYY-MM-DD'),
                [Op.or]: [{ branch_id: null }, { branch_id: branchId }],
            },
        });

        return {
            schedule: WorkScheduleService.serializeSchedule(schedule),
            target: target
                ? {
                    day_of_week: isoDay,
                    is_rest_day: Boolean(target.is_rest_day),
                    clock_in_target: WorkScheduleService.toTime(target.clock_in_target),
                    clock_out_target: WorkScheduleService.toTime(target.clock_out_target),
                    break_minutes: Number(target.break_minutes || 0),
                    tolerance_minutes: Number(target.tolerance_minutes || 0),
                }
                : null,
            isRestDay: !target || Boolean(target.is_rest_day) || Boolean(holiday),
            holiday: holiday ? { id: holiday.id, name: holiday.name } : null,
        };
    }

    /**
     * Hitung keterlambatan dari jam masuk aktual.
     * Tidak memakai AI — murni selisih jam terhadap jadwal + toleransi.
     */
    static computeLateness(clockIn, target, date) {
        const empty = { expected_clock_in: null, expected_clock_out: null, late_minutes: 0, is_late: false };

        if (!target || target.is_rest_day) return empty;
        if (!target.clock_in_target || !clockIn) {
            return { ...empty, expected_clock_in: target.clock_in_target, expected_clock_out: target.clock_out_target };
        }

        const day = moment(date || undefined).format('YYYY-MM-DD');
        const actual = moment(`${day} ${String(clockIn).slice(0, 8)}`, 'YYYY-MM-DD HH:mm:ss');
        const expected = moment(`${day} ${target.clock_in_target}`, 'YYYY-MM-DD HH:mm:ss');

        if (!actual.isValid() || !expected.isValid()) {
            return { ...empty, expected_clock_in: target.clock_in_target, expected_clock_out: target.clock_out_target };
        }

        const diffMinutes = Math.round(actual.diff(expected, 'minutes'));
        const lateMinutes = Math.max(0, diffMinutes - Number(target.tolerance_minutes || 0));

        return {
            expected_clock_in: target.clock_in_target,
            expected_clock_out: target.clock_out_target,
            late_minutes: lateMinutes,
            is_late: lateMinutes > 0,
        };
    }

    static async list({ tenantId, branchId = null, employmentType = null, activeOnly = true }) {
        const where = { tenant_id: tenantId };
        if (branchId) where.branch_id = branchId;
        if (employmentType) where.employment_type = employmentType;
        if (activeOnly) where.is_active = true;

        const rows = await WorkSchedule.findAll({
            where,
            include: [
                { model: WorkScheduleDay, as: 'days' },
                { model: User, as: 'employee', attributes: ['id', 'name', 'position'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
            ],
            order: [['employee_id', 'ASC'], ['id', 'DESC']],
        });

        return rows.map(WorkScheduleService.serializeSchedule);
    }

    static async getByEmployee(employeeId, tenantId) {
        const schedule = await WorkScheduleService.findActive(employeeId, tenantId);
        return WorkScheduleService.serializeSchedule(schedule);
    }

    static validateDays(days) {
        if (!Array.isArray(days) || days.length === 0) {
            throw new Error('Jadwal minimal harus punya satu hari');
        }

        const seen = new Set();
        for (const day of days) {
            const isoDay = parseInt(day.day_of_week, 10);
            if (isNaN(isoDay) || isoDay < 1 || isoDay > 7) {
                throw new Error('Hari tidak valid (1=Senin ... 7=Minggu)');
            }
            if (seen.has(isoDay)) throw new Error('Hari tidak boleh dobel');
            seen.add(isoDay);

            if (!day.is_rest_day) {
                if (!day.clock_in_target || !day.clock_out_target) {
                    throw new Error('Jam masuk dan jam pulang wajib diisi untuk hari kerja');
                }
            }
        }
    }

    /**
     * Buat / ganti jadwal karyawan. Jadwal aktif lama dinonaktifkan supaya
     * hanya ada satu jadwal aktif per karyawan.
     */
    static async upsert(employeeId, tenantId, payload) {
        const { employment_type, effective_from, note, days, branch_id } = payload;

        WorkScheduleService.validateDays(days);

        const employee = await User.findOne({ where: { id: employeeId, tenant_id: tenantId } });
        if (!employee) throw new Error('Karyawan tidak ditemukan');
        if (!['fulltime', 'parttime'].includes(employment_type)) {
            throw new Error('Tipe kerja harus fulltime atau parttime');
        }

        return sequelizeTransaction(async (transaction) => {
            await WorkSchedule.update(
                { is_active: false, effective_to: moment().format('YYYY-MM-DD') },
                { where: { employee_id: employeeId, tenant_id: tenantId, is_active: true }, transaction }
            );

            const schedule = await WorkSchedule.create({
                tenant_id: tenantId,
                employee_id: employeeId,
                branch_id: branch_id || employee.branch_id || null,
                employment_type,
                effective_from: effective_from || moment().format('YYYY-MM-DD'),
                effective_to: null,
                is_active: true,
                note: note || null,
            }, { transaction });

            await WorkScheduleDay.bulkCreate(
                days.map((day) => ({
                    schedule_id: schedule.id,
                    day_of_week: parseInt(day.day_of_week, 10),
                    is_rest_day: Boolean(day.is_rest_day),
                    clock_in_target: day.is_rest_day ? null : day.clock_in_target,
                    clock_out_target: day.is_rest_day ? null : day.clock_out_target,
                    break_minutes: Number(day.break_minutes ?? 60),
                    tolerance_minutes: Number(day.tolerance_minutes ?? 15),
                })),
                { transaction }
            );

            const created = await WorkSchedule.findByPk(schedule.id, {
                include: [
                    { model: WorkScheduleDay, as: 'days' },
                    { model: User, as: 'employee', attributes: ['id', 'name', 'position'] },
                ],
                transaction,
            });

            return WorkScheduleService.serializeSchedule(created);
        });
    }
}

async function sequelizeTransaction(handler) {
    const sequelize = require('../config/database');
    return sequelize.transaction(handler);
}

module.exports = WorkScheduleService;
