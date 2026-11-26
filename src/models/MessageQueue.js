const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageQueue = sequelize.define('MessageQueue', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        }
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'customers',
            key: 'id'
        }
    },
    message_type: {
        type: DataTypes.ENUM('followup', 'broadcast', 'manual'),
        allowNull: false
    },
    template_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'whatsapp_templates',
            key: 'id'
        }
    },
    sequence_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'followup_sequences',
            key: 'id'
        }
    },
    broadcast_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    message_content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    variables: {
        type: DataTypes.JSON,
        allowNull: true
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        comment: '1=highest, 10=lowest'
    },
    scheduled_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    attempt_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    max_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
        defaultValue: 'pending'
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    failed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    whatsapp_message_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'message_queue',
    timestamps: true,
    paranoid: false,
    indexes: [
        {
            name: 'idx_tenant_status',
            fields: ['tenant_id', 'status']
        },
        {
            name: 'idx_scheduled_at',
            fields: ['scheduled_at']
        },
        {
            name: 'idx_message_type',
            fields: ['message_type']
        },
        {
            name: 'idx_priority_scheduled',
            fields: ['priority', 'scheduled_at']
        }
    ]
});

// Associations
MessageQueue.associate = function(models) {
    MessageQueue.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant'
    });
    
    MessageQueue.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
    });
    
    MessageQueue.belongsTo(models.WhatsAppTemplate, {
        foreignKey: 'template_id',
        as: 'template'
    });
    
    MessageQueue.belongsTo(models.FollowupSequence, {
        foreignKey: 'sequence_id',
        as: 'sequence'
    });
};

module.exports = MessageQueue;
