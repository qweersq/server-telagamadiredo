const DailyTaskRepository = require('../repositories/dailyTaskRepository');
const TaskTemplateRepository = require('../repositories/taskTemplateRepository');
const DailyTaskVerificationService = require('./dailyTaskVerificationService');

const VALID_STATUS = ['pending', 'done', 'incomplete'];
const VALID_VERDICT = ['verified', 'review', 'reject'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

class DailyTaskService {
    /**
     * Tanggal lokal (bukan UTC) supaya "hari ini" tidak bergeser 7 jam.
     */
    static today() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    static resolveDate(value, { required = false } = {}) {
        if (value === undefined || value === null || value === '') {
            if (required) throw new Error('Parameter date (YYYY-MM-DD) wajib diisi');
            return DailyTaskService.today();
        }

        if (!DATE_REGEX.test(value)) throw new Error('Format tanggal harus YYYY-MM-DD');

        const parsed = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) throw new Error('Tanggal tidak valid');

        return value;
    }

    static progressOf(done, total) {
        if (!total) return 0;
        return Math.round((done / total) * 100);
    }

    static serializeTask(task) {
        return {
            id: task.id,
            task_template_id: task.task_template_id,
            title: task.title,
            area: task.area,
            status: task.status,
            requires_photo: Boolean(task.requires_photo || (task.template && task.template.requires_photo)),
            completed_at: task.completed_at,
            photo_url: task.photo_url,
            photo_lat: task.photo_lat !== null && task.photo_lat !== undefined ? Number(task.photo_lat) : null,
            photo_lng: task.photo_lng !== null && task.photo_lng !== undefined ? Number(task.photo_lng) : null,
            distance_m: task.distance_m,
            photo_taken_at: task.photo_taken_at,
            ai_status: task.ai_status,
            ai_score: task.ai_score,
            ai_verdict: task.ai_verdict,
            ai_reason: task.ai_reason,
            ai_checked_at: task.ai_checked_at,
            note: task.note,
            created_by: task.created_by,
        };
    }

    static summarizeTasks(tasks) {
        const summary = { total_tasks: tasks.length, done: 0, pending: 0, incomplete: 0 };

        tasks.forEach((task) => {
            if (summary[task.status] !== undefined) summary[task.status] += 1;
        });

        summary.progress = DailyTaskService.progressOf(summary.done, summary.total_tasks);

        return summary;
    }

    /**
     * Susun tugas flat menjadi per-karyawan, plus daftar karyawan yang belum
     * dapat tugas supaya supervisor bisa langsung menugaskan.
     */
    static groupByEmployee(tasks, employees = []) {
        const map = new Map();

        tasks.forEach((task) => {
            const key = task.user_id;
            if (!map.has(key)) {
                map.set(key, {
                    user_id: key,
                    name: task.employee ? task.employee.name : null,
                    position: task.employee ? task.employee.position : null,
                    tasks: [],
                });
            }
            map.get(key).tasks.push(DailyTaskService.serializeTask(task));
        });

        const grouped = Array.from(map.values())
            .map((group) => {
                const summary = DailyTaskService.summarizeTasks(group.tasks);
                return { ...group, ...summary };
            })
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

        const assignedIds = new Set(grouped.map((group) => group.user_id));
        const without_tasks = employees
            .filter((employee) => !assignedIds.has(employee.id))
            .map((employee) => ({
                user_id: employee.id,
                name: employee.name,
                position: employee.position,
            }));

        return { employees: grouped, employees_without_tasks: without_tasks };
    }

    /**
     * Rekap status verifikasi AI untuk satu hari.
     */
    static summarizeAi(tasks) {
        const summary = { pending: 0, processing: 0, done: 0, failed: 0, skipped: 0, verified: 0, review: 0, reject: 0 };

        tasks.forEach((task) => {
            if (summary[task.ai_status] !== undefined) summary[task.ai_status] += 1;
            if (task.ai_verdict && summary[task.ai_verdict] !== undefined) summary[task.ai_verdict] += 1;
        });

        summary.needs_review = summary.review + summary.reject + summary.failed + summary.pending;

        return summary;
    }

    static async createManual(body, user) {
        try {
            const user_id = parseInt(body.user_id, 10);
            if (isNaN(user_id) || user_id <= 0) throw new Error('user_id wajib diisi');

            const title = body.title ? String(body.title).trim() : '';
            if (!title) throw new Error('Nama tugas wajib diisi');

            const task_date = DailyTaskService.resolveDate(body.date);

            const employees = await DailyTaskRepository.getEmployees({
                tenant_id: user.tenant_id,
                user_ids: [user_id],
            });

            if (!employees.length) throw new Error('Karyawan tidak ditemukan pada tenant ini');

            const employee = employees[0];
            const branch_id = body.branch_id ? parseInt(body.branch_id, 10) : employee.branch_id;

            if (!branch_id) throw new Error('Karyawan belum terdaftar pada cabang mana pun');

            return await DailyTaskRepository.create({
                tenant_id: user.tenant_id,
                branch_id,
                user_id,
                task_template_id: body.task_template_id ? parseInt(body.task_template_id, 10) : null,
                title,
                area: body.area ? String(body.area).trim() : null,
                requires_photo: Boolean(body.requires_photo),
                task_date,
                status: 'pending',
                note: body.note || null,
                created_by: user.id,
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Generate massal dari template aktif. Aman dipanggil berkali-kali
     * (idempotent) berkat unique (user_id, task_date, task_template_id).
     */
    static async generate(body, user) {
        try {
            const task_date = DailyTaskService.resolveDate(body.date);
            const branch_id = body.branch_id ? parseInt(body.branch_id, 10) : parseInt(user.branch_id, 10);

            if (isNaN(branch_id) || branch_id <= 0) {
                throw new Error('branch_id wajib diisi (cabang aktif tidak terdeteksi)');
            }

            const position = body.position ? String(body.position).trim().toLowerCase() : null;
            const user_ids = Array.isArray(body.user_ids)
                ? body.user_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0)
                : null;

            const employees = await DailyTaskRepository.getEmployees({
                tenant_id: user.tenant_id,
                branch_id,
                position,
                user_ids,
            });

            if (!employees.length) {
                return {
                    date: task_date,
                    branch_id,
                    position,
                    total_employees: 0,
                    created: 0,
                    skipped: 0,
                    employees: [],
                };
            }

            // Kumpulkan baris yang akan dibuat, sekaligus catat yang sudah ada
            // agar angka created/skipped akurat.
            const rows = [];
            const perEmployee = [];

            for (const employee of employees) {
                const templates = await TaskTemplateRepository.findActiveForPosition({
                    tenant_id: user.tenant_id,
                    branch_id,
                    position: employee.position,
                });

                const existing = await DailyTaskRepository.getByUserDate({
                    tenant_id: user.tenant_id,
                    user_id: employee.id,
                    task_date,
                });

                const existingKeys = new Set(
                    existing
                        .filter((task) => task.task_template_id)
                        .map((task) => `${task.task_template_id}`)
                );

                const fresh = templates.filter((template) => !existingKeys.has(`${template.id}`));

                fresh.forEach((template) => {
                    rows.push({
                        tenant_id: user.tenant_id,
                        branch_id,
                        user_id: employee.id,
                        task_template_id: template.id,
                        title: template.title,
                        area: template.area,
                        requires_photo: Boolean(template.requires_photo),
                        task_date,
                        status: 'pending',
                        created_by: user.id,
                    });
                });

                perEmployee.push({
                    user_id: employee.id,
                    name: employee.name,
                    position: employee.position,
                    templates: templates.length,
                    created: fresh.length,
                    skipped: templates.length - fresh.length,
                });
            }

            const { inserted } = await DailyTaskRepository.bulkCreate(rows);

            const without_position = employees
                .filter((employee) => !employee.position)
                .map((employee) => ({ user_id: employee.id, name: employee.name }));

            return {
                date: task_date,
                branch_id,
                position,
                total_employees: employees.length,
                created: inserted,
                skipped: rows.length - inserted,
                employees_without_position: without_position,
                employees: perEmployee,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Tampilan supervisor: semua tugas satu cabang pada satu tanggal.
     */
    static async listForBranch(query, user) {
        try {
            const task_date = DailyTaskService.resolveDate(query.date);
            const branch_id = query.branch_id ? parseInt(query.branch_id, 10) : parseInt(user.branch_id, 10);
            const position = query.position ? String(query.position).trim().toLowerCase() : null;
            const status = query.status && VALID_STATUS.includes(query.status) ? query.status : null;
            const verdict = VALID_VERDICT.includes(query.ai_verdict) ? query.ai_verdict : null;

            if (isNaN(branch_id) || branch_id <= 0) throw new Error('branch_id wajib diisi');

            const [tasks, employees] = await Promise.all([
                DailyTaskRepository.getByBranchDate({
                    tenant_id: user.tenant_id,
                    branch_id,
                    task_date,
                    position,
                    status,
                    ai_verdict: verdict,
                }),
                DailyTaskRepository.getEmployees({
                    tenant_id: user.tenant_id,
                    branch_id,
                    position,
                }),
            ]);

            const grouped = DailyTaskService.groupByEmployee(tasks, employees);

            const overall = grouped.employees.reduce(
                (acc, group) => {
                    acc.total_tasks += group.total_tasks;
                    acc.done += group.done;
                    acc.pending += group.pending;
                    acc.incomplete += group.incomplete;
                    return acc;
                },
                { total_tasks: 0, done: 0, pending: 0, incomplete: 0 }
            );

            return {
                date: task_date,
                branch_id,
                summary: {
                    ...overall,
                    progress: DailyTaskService.progressOf(overall.done, overall.total_tasks),
                    total_employees: employees.length,
                    employees_with_tasks: grouped.employees.length,
                    employees_without_tasks: grouped.employees_without_tasks.length,
                },
                ai_summary: DailyTaskService.summarizeAi(tasks),
                employees: grouped.employees,
                employees_without_tasks: grouped.employees_without_tasks,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Tampilan karyawan: tugas miliknya sendiri pada satu tanggal.
     */
    static async listForUser(query, user) {
        try {
            const task_date = DailyTaskService.resolveDate(query.date);
            const tasks = await DailyTaskRepository.getByUserDate({
                tenant_id: user.tenant_id,
                user_id: user.id,
                task_date,
            });

            const summary = DailyTaskService.summarizeTasks(tasks);

            return {
                date: task_date,
                user_id: user.id,
                ...summary,
                tasks: tasks.map(DailyTaskService.serializeTask),
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async complete(id, body, user) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('ID tidak valid');

            const task = await DailyTaskRepository.getById(id, user.tenant_id);
            if (!task) throw new Error('Tugas tidak ditemukan');

            const isEmployee = user.role === 'employee';
            if (isEmployee && task.user_id !== user.id) {
                throw new Error('Anda hanya dapat mengubah tugas milik sendiri');
            }

            if (task.status === 'done') throw new Error('Tugas ini sudah ditandai selesai');

            const requiresPhoto = Boolean(task.requires_photo || (task.template && task.template.requires_photo));
            const photo_url = body.photo_url ? String(body.photo_url).trim() : null;

            if (requiresPhoto && !photo_url) {
                throw new Error('Foto bukti wajib diunggah untuk tugas ini');
            }

            const finalPhotoUrl = photo_url || task.photo_url || null;

            // Foto baru (bukan foto lama yang dipakai ulang) → perlu dinilai ulang.
            const isNewPhoto = Boolean(photo_url) && photo_url !== task.photo_url;

            const payload = {
                status: 'done',
                completed_at: new Date(),
                photo_url: finalPhotoUrl,
                note: body.note !== undefined ? body.note : task.note,
            };

            if (isNewPhoto || !finalPhotoUrl) {
                // Foto baru menunggu dinilai AI; tanpa foto tidak ada yang diverifikasi.
                // Foto lama yang sudah punya hasil biarkan apa adanya (tidak buang kredit AI).
                Object.assign(payload, {
                    ai_status: finalPhotoUrl ? 'pending' : 'skipped',
                    ai_score: null,
                    ai_verdict: null,
                    ai_reason: null,
                    ai_raw: null,
                    ai_checked_at: null,
                    photo_lat: null,
                    photo_lng: null,
                    distance_m: null,
                    photo_taken_at: null,
                });
            }

            const updated = await DailyTaskRepository.update(id, payload);

            // Nilai AI di latar belakang. Kegagalan AI tidak pernah menggagalkan
            // penyimpanan — tugas tetap tersimpan sebagai selesai dengan foto.
            if (isNewPhoto) DailyTaskVerificationService.autoVerify(id, user);

            return updated;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async reopen(id, user) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('ID tidak valid');

            const task = await DailyTaskRepository.getById(id, user.tenant_id);
            if (!task) throw new Error('Tugas tidak ditemukan');

            const isEmployee = user.role === 'employee';
            if (isEmployee && task.user_id !== user.id) {
                throw new Error('Anda hanya dapat mengubah tugas milik sendiri');
            }

            if (task.status === 'pending') throw new Error('Tugas ini masih berstatus pending');

            return await DailyTaskRepository.update(id, {
                status: 'pending',
                completed_at: null,
                ai_status: 'skipped',
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('ID tidak valid');

            const task = await DailyTaskRepository.getById(id, user.tenant_id);
            if (!task) throw new Error('Tugas tidak ditemukan');

            await DailyTaskRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Salin daftar tugas dari hari sebelumnya ke tanggal target.
     * Karyawan tidak perlu menyusun ulang tugas yang berulang tiap hari.
     * Tanpa `source_date`, dipakai tanggal terakhir yang punya tugas.
     */
    static async copyFromPrevious(body, user) {
        try {
            const task_date = DailyTaskService.resolveDate(body.date, { required: true });
            const branch_id = body.branch_id ? parseInt(body.branch_id, 10) : parseInt(user.branch_id, 10);

            if (isNaN(branch_id) || branch_id <= 0) {
                throw new Error('branch_id wajib diisi (cabang aktif tidak terdeteksi)');
            }

            const source_date = body.source_date
                ? DailyTaskService.resolveDate(body.source_date, { required: true })
                : await DailyTaskRepository.findLatestDateBefore({
                    tenant_id: user.tenant_id,
                    branch_id,
                    before: task_date,
                });

            if (!source_date) throw new Error('Belum ada tugas sebelumnya untuk disalin');
            if (source_date >= task_date) throw new Error('Tanggal sumber harus sebelum tanggal tujuan');

            const [sourceTasks, targetTasks, employees] = await Promise.all([
                DailyTaskRepository.getByBranchDate({
                    tenant_id: user.tenant_id,
                    branch_id,
                    task_date: source_date,
                }),
                DailyTaskRepository.getByBranchDate({
                    tenant_id: user.tenant_id,
                    branch_id,
                    task_date,
                }),
                DailyTaskRepository.getEmployees({ tenant_id: user.tenant_id, branch_id }),
            ]);

            if (!sourceTasks.length) {
                throw new Error(`Tidak ada tugas pada ${source_date} untuk disalin`);
            }

            // Hanya karyawan yang masih aktif di cabang ini yang ikut disalin.
            const activeIds = new Set(employees.map((employee) => employee.id));

            const existingKeys = new Set(
                targetTasks.map((task) => DailyTaskService.copyKey(task))
            );

            const rows = [];
            const skippedEmployees = new Set();

            sourceTasks.forEach((task) => {
                if (!activeIds.has(task.user_id)) {
                    skippedEmployees.add(task.user_id);
                    return;
                }

                const key = DailyTaskService.copyKey(task);
                if (existingKeys.has(key)) return;

                existingKeys.add(key);
                rows.push({
                    tenant_id: user.tenant_id,
                    branch_id,
                    user_id: task.user_id,
                    task_template_id: task.task_template_id,
                    title: task.title,
                    area: task.area,
                    requires_photo: Boolean(task.requires_photo),
                    task_date,
                    status: 'pending',
                    created_by: user.id,
                });
            });

            const { inserted } = rows.length
                ? await DailyTaskRepository.bulkCreate(rows)
                : { inserted: 0 };

            return {
                date: task_date,
                source_date,
                branch_id,
                total_source: sourceTasks.length,
                created: inserted,
                skipped: sourceTasks.length - inserted,
                skipped_employees: [...skippedEmployees],
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Kunci pembanding saat menyalin tugas: template untuk tugas template,
     * judul untuk tugas manual (task_template_id NULL tidak dijaga unique index).
     */
    static copyKey(task) {
        return task.task_template_id
            ? `tpl:${task.task_template_id}`
            : `manual:${String(task.title).trim().toLowerCase()}`;
    }

    /**
     * Tugas yang belum dikerjakan sampai absen pulang dianggap tidak selesai.
     * Tidak pernah melempar error ke pemanggil absensi (best effort).
     */
    static async closeDay({ tenant_id, user_id = null, branch_id = null, date = null }) {
        try {
            const task_date = DailyTaskService.resolveDate(date);
            const affected = await DailyTaskRepository.markPendingIncomplete({
                tenant_id,
                user_id,
                branch_id,
                task_date,
            });

            return { date: task_date, affected };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = DailyTaskService;
