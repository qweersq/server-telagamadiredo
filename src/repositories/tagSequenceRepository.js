const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

class TagSequenceRepository {
    /**
     * Ambil nomor antrian berikutnya secara atomik.
     * Wajib dipanggil di dalam transaction yang sama dengan pembuatan order_details,
     * supaya kalau order gagal disimpan nomornya ikut rollback (tidak hangus).
     *
     * @param {number} tenantId
     * @param {number} branchId
     * @param {string} seqDate format YYYY-MM-DD (tanggal masuk order)
     * @param {Transaction} transaction
     * @returns {Promise<number>} nomor antrian (mulai dari 1 setiap hari)
     */
    static async allocate(tenantId, branchId, seqDate, transaction = null) {
        if (!tenantId) throw new Error('tenant_id wajib diisi untuk penomoran antrian');
        if (!branchId) throw new Error('branch_id wajib diisi untuk penomoran antrian');
        if (!seqDate) throw new Error('seq_date wajib diisi untuk penomoran antrian');

        await sequelize.query(
            `INSERT INTO tag_sequences (tenant_id, branch_id, seq_date, last_number, createdAt, updatedAt)
             VALUES (:tenantId, :branchId, :seqDate, 1, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                last_number = last_number + 1,
                updatedAt = NOW()`,
            {
                replacements: { tenantId, branchId, seqDate },
                type: QueryTypes.INSERT,
                transaction,
            }
        );

        const rows = await sequelize.query(
            `SELECT last_number FROM tag_sequences
             WHERE tenant_id = :tenantId AND branch_id = :branchId AND seq_date = :seqDate
             LIMIT 1`,
            {
                replacements: { tenantId, branchId, seqDate },
                type: QueryTypes.SELECT,
                transaction,
            }
        );

        return parseInt(rows[0]?.last_number || 1, 10);
    }

    /**
     * Ambil nomor antrian berikutnya sekaligus banyak (sequential, tanpa lubang).
     * Lebih efisien dibanding allocate() berulang kali untuk 1 order banyak item.
     *
     * @returns {Promise<number[]>} array nomor antrian berurutan
     */
    static async allocateBatch(tenantId, branchId, seqDate, count, transaction = null) {
        if (!count || count <= 0) return [];

        await sequelize.query(
            `INSERT INTO tag_sequences (tenant_id, branch_id, seq_date, last_number, createdAt, updatedAt)
             VALUES (:tenantId, :branchId, :seqDate, :count, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                last_number = last_number + :count,
                updatedAt = NOW()`,
            {
                replacements: { tenantId, branchId, seqDate, count },
                type: QueryTypes.INSERT,
                transaction,
            }
        );

        const rows = await sequelize.query(
            `SELECT last_number FROM tag_sequences
             WHERE tenant_id = :tenantId AND branch_id = :branchId AND seq_date = :seqDate
             LIMIT 1`,
            {
                replacements: { tenantId, branchId, seqDate },
                type: QueryTypes.SELECT,
                transaction,
            }
        );

        const lastNumber = parseInt(rows[0]?.last_number || count, 10);
        const start = lastNumber - count + 1;
        return Array.from({ length: count }, (_, i) => start + i);
    }

    static async getCurrentNumber(tenantId, branchId, seqDate) {
        const rows = await sequelize.query(
            `SELECT last_number FROM tag_sequences
             WHERE tenant_id = :tenantId AND branch_id = :branchId AND seq_date = :seqDate
             LIMIT 1`,
            {
                replacements: { tenantId, branchId, seqDate },
                type: QueryTypes.SELECT,
            }
        );

        return parseInt(rows[0]?.last_number || 0, 10);
    }
}

module.exports = TagSequenceRepository;
