const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('campaigns', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID tenant pemilik campaign'
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID branch tempat campaign dibuat'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama campaign'
    },
    message_content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Isi pesan campaign'
    },
    target_audience: {
        type: DataTypes.ENUM('follow_up_15', 'follow_up_30', 'follow_up_60', 'all'),
        allowNull: false,
        defaultValue: 'follow_up_30',
        comment: 'Target audience campaign berdasarkan follow-up days'
    },
    follow_up_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Jumlah hari follow-up untuk customer targeting'
    },
    total_customers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total customer yang akan dikirim'
    },
    sent_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah pesan yang sudah terkirim'
    },
    failed_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah pesan yang gagal terkirim'
    },
    status: {
        type: DataTypes.ENUM('draft', 'running', 'completed', 'error', 'paused', 'cooldown'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Status campaign'
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu campaign dimulai'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu campaign selesai'
    },
    last_started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu terakhir campaign di-start'
    },
    cooldown_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu cooldown berakhir (14 hari setelah selesai/error)'
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Pesan error jika campaign gagal'
    },
    template_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'whatsapp_templates',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID template WhatsApp yang digunakan'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID user yang membuat campaign'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Apakah campaign ini adalah campaign default'
    },
    is_editable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Apakah campaign ini bisa diedit'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'campaigns',
    indexes: [
        {
            fields: ['tenant_id', 'status'],
            name: 'idx_campaigns_tenant_status'
        },
        {
            fields: ['created_by'],
            name: 'idx_campaigns_created_by'
        },
        {
            fields: ['template_id'],
            name: 'idx_campaigns_template'
        },
        {
            fields: ['cooldown_until'],
            name: 'idx_campaigns_cooldown'
        },
        {
            fields: ['tenant_id'],
            name: 'idx_campaigns_tenant_unique',
            unique: true
        }
    ]
});

Campaign.associate = (models) => {
    // Campaign belongs to tenant
    Campaign.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
    
    // Campaign belongs to branch
    Campaign.belongsTo(models.Branch, { 
        foreignKey: 'branch_id', 
        as: 'branch', 
        onDelete: 'CASCADE' 
    });
    
    // Campaign belongs to WhatsApp template
    Campaign.belongsTo(models.WhatsAppTemplate, { 
        foreignKey: 'template_id', 
        as: 'template', 
        onDelete: 'SET NULL' 
    });
    
    // Campaign belongs to user (creator)
    Campaign.belongsTo(models.User, { 
        foreignKey: 'created_by', 
        as: 'creator', 
        onDelete: 'CASCADE' 
    });
    
    // Campaign has many campaign customers
    Campaign.hasMany(models.CampaignCustomer, { 
        foreignKey: 'campaign_id', 
        as: 'campaign_customers', 
        onDelete: 'CASCADE' 
    });
};

module.exports = Campaign;
