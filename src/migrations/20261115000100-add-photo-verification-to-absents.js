'use strict';

/**
 * Foto bukti absen masuk/pulang + hasil verifikasi AI-nya.
 *
 * Foto diambil lewat aplikasi GPS Camera, jadi koordinat & waktu foto sudah
 * "dibakar" ke piksel sebagai watermark. EXIF tidak dipakai karena
 * uploadHelper me-resize lewat canvas (EXIF hilang).
 *
 * Kolom dipisah `clock_in_*` dan `clock_out_*` supaya satu baris absen
 * menyimpan kedua bukti sekaligus tanpa join.
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const columns = await queryInterface.describeTable('absents');

        const additions = [
            // Foto pulang (foto masuk sudah ada di photo_clock_in)
            { name: 'photo_clock_out', spec: { type: Sequelize.STRING(500), allowNull: true } },

            // Hasil ekstrak watermark untuk foto masuk
            { name: 'clock_in_lat', spec: { type: Sequelize.DECIMAL(11, 8), allowNull: true } },
            { name: 'clock_in_lng', spec: { type: Sequelize.DECIMAL(11, 8), allowNull: true } },
            { name: 'clock_in_distance_m', spec: { type: Sequelize.INTEGER, allowNull: true } },
            { name: 'clock_in_photo_at', spec: { type: Sequelize.DATE, allowNull: true } },

            // Hasil ekstrak watermark untuk foto pulang
            { name: 'clock_out_lat', spec: { type: Sequelize.DECIMAL(11, 8), allowNull: true } },
            { name: 'clock_out_lng', spec: { type: Sequelize.DECIMAL(11, 8), allowNull: true } },
            { name: 'clock_out_distance_m', spec: { type: Sequelize.INTEGER, allowNull: true } },
            { name: 'clock_out_photo_at', spec: { type: Sequelize.DATE, allowNull: true } },

            // Verifikasi AI foto masuk
            { name: 'ai_clock_in_status', spec: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'skipped', comment: 'pending | processing | done | failed | skipped' } },
            { name: 'ai_clock_in_score', spec: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true } },
            { name: 'ai_clock_in_verdict', spec: { type: Sequelize.STRING(20), allowNull: true, comment: 'verified | review | reject' } },
            { name: 'ai_clock_in_reason', spec: { type: Sequelize.TEXT, allowNull: true } },
            { name: 'ai_clock_in_raw', spec: { type: Sequelize.JSON, allowNull: true } },
            { name: 'ai_clock_in_at', spec: { type: Sequelize.DATE, allowNull: true } },

            // Verifikasi AI foto pulang
            { name: 'ai_clock_out_status', spec: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'skipped', comment: 'pending | processing | done | failed | skipped' } },
            { name: 'ai_clock_out_score', spec: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true } },
            { name: 'ai_clock_out_verdict', spec: { type: Sequelize.STRING(20), allowNull: true, comment: 'verified | review | reject' } },
            { name: 'ai_clock_out_reason', spec: { type: Sequelize.TEXT, allowNull: true } },
            { name: 'ai_clock_out_raw', spec: { type: Sequelize.JSON, allowNull: true } },
            { name: 'ai_clock_out_at', spec: { type: Sequelize.DATE, allowNull: true } },
        ];

        for (const column of additions) {
            if (!columns[column.name]) {
                await queryInterface.addColumn('absents', column.name, column.spec);
                console.log(`✅ Column absents.${column.name} added`);
            }
        }
    },

    down: async (queryInterface) => {
        const columns = await queryInterface.describeTable('absents');

        for (const name of [
            'photo_clock_out',
            'clock_in_lat', 'clock_in_lng', 'clock_in_distance_m', 'clock_in_photo_at',
            'clock_out_lat', 'clock_out_lng', 'clock_out_distance_m', 'clock_out_photo_at',
            'ai_clock_in_status', 'ai_clock_in_score', 'ai_clock_in_verdict', 'ai_clock_in_reason', 'ai_clock_in_raw', 'ai_clock_in_at',
            'ai_clock_out_status', 'ai_clock_out_score', 'ai_clock_out_verdict', 'ai_clock_out_reason', 'ai_clock_out_raw', 'ai_clock_out_at',
        ]) {
            if (columns[name]) await queryInterface.removeColumn('absents', name);
        }
    }
};
