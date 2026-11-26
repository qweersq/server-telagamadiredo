const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CampaignCustomer = sequelize.define('campaign_customers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    campaign_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'campaigns',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID campaign'
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'customers',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID customer'
    },
    customer_phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nomor telepon customer'
    },
    status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status pengiriman ke customer'
    },
    retry_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah percobaan kirim pesan'
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Waktu pesan berhasil terkirim'
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Pesan error jika gagal kirim'
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
    tableName: 'campaign_customers',
    indexes: [
        {
            fields: ['campaign_id', 'status'],
            name: 'idx_campaign_customers_campaign_status'
        },
        {
            fields: ['customer_id'],
            name: 'idx_campaign_customers_customer'
        },
        {
            unique: true,
            fields: ['campaign_id', 'customer_id'],
            name: 'unique_campaign_customer'
        }
    ]
});

CampaignCustomer.associate = (models) => {
    // CampaignCustomer belongs to campaign
    CampaignCustomer.belongsTo(models.Campaign, { 
        foreignKey: 'campaign_id', 
        as: 'campaign', 
        onDelete: 'CASCADE' 
    });
    
    // CampaignCustomer belongs to customer
    CampaignCustomer.belongsTo(models.Customer, { 
        foreignKey: 'customer_id', 
        as: 'customer', 
        onDelete: 'CASCADE' 
    });
};

module.exports = CampaignCustomer;
