const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Penomoran antrian tag sepatu yang di-reset setiap hari.
 * Satu baris = satu kombinasi tenant + cabang + tanggal.
 */
const TagSequence = sequelize.define('tag_sequences', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        },
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'branches',
            key: 'id'
        },
    },
    seq_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Tanggal order masuk (entry_date) sebagai dasar reset harian',
    },
    last_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Nomor antrian terakhir yang sudah dipakai pada tanggal tersebut',
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
}, {
    timestamps: true,
    tableName: 'tag_sequences',
    indexes: [
        {
            unique: true,
            fields: ['tenant_id', 'branch_id', 'seq_date'],
            name: 'uniq_tag_sequences_tenant_branch_date',
        },
    ],
});

TagSequence.associate = (models) => {
    TagSequence.belongsTo(models.Tenant, { foreignKey: 'tenant_id', onDelete: 'CASCADE' });
    TagSequence.belongsTo(models.Branch, { foreignKey: 'branch_id', onDelete: 'CASCADE' });
};

module.exports = TagSequence;
