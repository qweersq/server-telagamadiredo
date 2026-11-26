'use strict';

/**
 * Jadwal kerja karyawan (pola mingguan) + hari libur.
 *
 * Satu karyawan punya satu `work_schedules` aktif yang berisi 7 baris
 * `work_schedule_days` (satu per hari). Cukup assign sekali, berlaku terus
 * sampai diubah — bukan assign per tanggal.
 *
 * Nilai jadwal di-snapshot ke `absents` saat check-in supaya rekap absen
 * lama tidak berubah kalau jadwalnya diedit di kemudian hari.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tables = await queryInterface.showAllTables();

        if (!tables.includes('work_schedules')) {
            await queryInterface.createTable('work_schedules', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                tenant_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'tenants', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                employee_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                branch_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                    comment: 'NULL = mengikuti cabang karyawan'
                },
                employment_type: {
                    type: Sequelize.ENUM('fulltime', 'parttime'),
                    allowNull: false,
                    defaultValue: 'fulltime',
                    comment: 'Fulltime / parttime hanya pembeda label, jam tetap per hari'
                },
                effective_from: {
                    type: Sequelize.DATEONLY,
                    allowNull: false,
                    comment: 'Berlaku mulai tanggal ini'
                },
                effective_to: {
                    type: Sequelize.DATEONLY,
                    allowNull: true,
                    comment: 'NULL = berlaku selamanya'
                },
                is_active: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                note: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                deletedAt: {
                    type: Sequelize.DATE,
                    allowNull: true
                }
            });

            await queryInterface.addIndex('work_schedules', ['tenant_id', 'employee_id', 'is_active'], {
                name: 'work_schedules_tenant_employee_active'
            });
            console.log('✅ Table work_schedules created');
        }

        if (!tables.includes('work_schedule_days')) {
            await queryInterface.createTable('work_schedule_days', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                schedule_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'work_schedules', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                day_of_week: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    comment: '1=Senin ... 7=Minggu (ISO)'
                },
                is_rest_day: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                    comment: 'true = hari libur rutin, tidak dihitung telat'
                },
                clock_in_target: {
                    type: Sequelize.TIME,
                    allowNull: true,
                    comment: 'Jam masuk normal, mis. 08:00:00'
                },
                clock_out_target: {
                    type: Sequelize.TIME,
                    allowNull: true,
                    comment: 'Jam pulang normal, mis. 17:00:00'
                },
                break_minutes: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 60,
                    comment: 'Istirahat, dipakai hitung durasi kerja efektif'
                },
                tolerance_minutes: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 15,
                    comment: 'Batas toleransi telat per hari'
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            });

            await queryInterface.addIndex('work_schedule_days', ['schedule_id', 'day_of_week'], {
                name: 'work_schedule_days_unique',
                unique: true
            });
            console.log('✅ Table work_schedule_days created');
        }

        if (!tables.includes('holidays')) {
            await queryInterface.createTable('holidays', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                tenant_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: { model: 'tenants', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                branch_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'branches', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'NULL = libur untuk semua cabang tenant'
                },
                date: {
                    type: Sequelize.DATEONLY,
                    allowNull: false
                },
                name: {
                    type: Sequelize.STRING(150),
                    allowNull: false
                },
                is_paid: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            });

            await queryInterface.addIndex('holidays', ['tenant_id', 'date'], {
                name: 'holidays_tenant_date'
            });
            console.log('✅ Table holidays created');
        }

        const absentColumns = await queryInterface.describeTable('absents');

        const additions = [
            {
                name: 'schedule_id',
                spec: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'work_schedules', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                    comment: 'Jadwal yang dipakai saat check-in'
                }
            },
            {
                name: 'expected_clock_in',
                spec: {
                    type: Sequelize.TIME,
                    allowNull: true,
                    comment: 'Snapshot jam masuk normal hari itu'
                }
            },
            {
                name: 'expected_clock_out',
                spec: {
                    type: Sequelize.TIME,
                    allowNull: true,
                    comment: 'Snapshot jam pulang normal hari itu'
                }
            },
            {
                name: 'late_minutes',
                spec: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Menit keterlambatan setelah dikurangi toleransi, 0 = tepat waktu'
                }
            },
            {
                name: 'is_late',
                spec: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                }
            }
        ];

        for (const column of additions) {
            if (!absentColumns[column.name]) {
                await queryInterface.addColumn('absents', column.name, column.spec);
                console.log(`✅ Column absents.${column.name} added`);
            }
        }
    },

    down: async (queryInterface) => {
        const absentColumns = await queryInterface.describeTable('absents');

        for (const column of ['is_late', 'late_minutes', 'expected_clock_out', 'expected_clock_in', 'schedule_id']) {
            if (absentColumns[column]) {
                await queryInterface.removeColumn('absents', column);
            }
        }

        await queryInterface.dropTable('holidays');
        await queryInterface.dropTable('work_schedule_days');
        await queryInterface.dropTable('work_schedules');
    }
};
