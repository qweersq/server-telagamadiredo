const { Op } = require('sequelize');
const moment = require('moment');
const WorkScheduleService = require('../services/workScheduleService');
const { Holiday } = require('../models');
const { ResponseHelper } = require('../helpers');

const toInt = (value) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
};

class WorkScheduleController {
    static async list(req, res) {
        try {
            const tenantId = req.user.tenant_id;
            const schedules = await WorkScheduleService.list({
                tenantId,
                branchId: toInt(req.query.branch_id),
                employmentType: req.query.employment_type || null,
                activeOnly: req.query.active_only !== 'false',
            });

            return res.status(200).send(ResponseHelper.successResponse(schedules));
        } catch (error) {
            console.error('❌ WorkScheduleController.list:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async getByEmployee(req, res) {
        try {
            const employeeId = toInt(req.params.employee_id);
            if (!employeeId) {
                return res.status(400).send(ResponseHelper.errorResponse('ID karyawan tidak valid', 400));
            }

            const schedule = await WorkScheduleService.getByEmployee(employeeId, req.user.tenant_id);
            return res.status(200).send(ResponseHelper.successResponse(schedule));
        } catch (error) {
            console.error('❌ WorkScheduleController.getByEmployee:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async upsert(req, res) {
        try {
            const employeeId = toInt(req.params.employee_id);
            if (!employeeId) {
                return res.status(400).send(ResponseHelper.errorResponse('ID karyawan tidak valid', 400));
            }

            const schedule = await WorkScheduleService.upsert(employeeId, req.user.tenant_id, req.body);
            return res.status(200).send(ResponseHelper.successResponse(schedule));
        } catch (error) {
            const status = /tidak ditemukan|wajib|harus|valid|dobel/i.test(error.message) ? 400 : 500;
            console.error('❌ WorkScheduleController.upsert:', error);
            return res.status(status).send(ResponseHelper.errorResponse(error.message, status));
        }
    }

    /**
     * Jadwal efektif karyawan pada satu tanggal, dipakai UI absensi untuk
     * menampilkan "jam masuk 08:00, toleransi 15 menit" sebelum check-in.
     */
    static async resolve(req, res) {
        try {
            const employeeId = toInt(req.query.employee_id) || req.user.id;
            const date = req.query.date || moment().format('YYYY-MM-DD');
            const branchId = toInt(req.query.branch_id);

            const resolved = await WorkScheduleService.resolve(
                employeeId,
                req.user.tenant_id,
                date,
                branchId
            );

            if (!resolved) {
                return res.status(200).send(ResponseHelper.successResponse({
                    date,
                    employee_id: employeeId,
                    has_schedule: false,
                    is_rest_day: false,
                    target: null,
                }));
            }

            return res.status(200).send(ResponseHelper.successResponse({
                date,
                employee_id: employeeId,
                has_schedule: true,
                employment_type: resolved.schedule.employment_type,
                is_rest_day: resolved.isRestDay,
                holiday: resolved.holiday,
                target: resolved.target,
            }));
        } catch (error) {
            console.error('❌ WorkScheduleController.resolve:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async listHolidays(req, res) {
        try {
            const where = { tenant_id: req.user.tenant_id };
            const branchId = toInt(req.query.branch_id);
            if (branchId) where[Op.or] = [{ branch_id: null }, { branch_id: branchId }];
            if (req.query.year) {
                where.date = {
                    [Op.gte]: `${req.query.year}-01-01`,
                    [Op.lte]: `${req.query.year}-12-31`,
                };
            }

            const rows = await Holiday.findAll({ where, order: [['date', 'ASC']] });
            return res.status(200).send(ResponseHelper.successResponse(rows));
        } catch (error) {
            console.error('❌ WorkScheduleController.listHolidays:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async createHoliday(req, res) {
        try {
            const { date, name, branch_id = null, is_paid = true } = req.body;
            if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
                return res.status(400).send(ResponseHelper.errorResponse('Tanggal tidak valid', 400));
            }
            if (!name) {
                return res.status(400).send(ResponseHelper.errorResponse('Nama hari libur wajib diisi', 400));
            }

            const holiday = await Holiday.create({
                tenant_id: req.user.tenant_id,
                branch_id: branch_id ? toInt(branch_id) : null,
                date,
                name,
                is_paid: Boolean(is_paid),
            });

            return res.status(201).send(ResponseHelper.successResponse(holiday, 201));
        } catch (error) {
            console.error('❌ WorkScheduleController.createHoliday:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }

    static async deleteHoliday(req, res) {
        try {
            const id = toInt(req.params.id);
            if (!id) return res.status(400).send(ResponseHelper.errorResponse('ID tidak valid', 400));

            const deleted = await Holiday.destroy({ where: { id, tenant_id: req.user.tenant_id } });
            if (!deleted) {
                return res.status(404).send(ResponseHelper.errorResponse('Hari libur tidak ditemukan', 404));
            }

            return res.status(200).send(ResponseHelper.successResponse({ id }));
        } catch (error) {
            console.error('❌ WorkScheduleController.deleteHoliday:', error);
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }
    }
}

module.exports = WorkScheduleController;
