const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Printer = sequelize.define('printers', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama printer (contoh: Printer Kasir 1, Printer Kitchen)'
    },
    device_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama device Bluetooth (contoh: RPP02, POS-58)'
    },
    device_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID unik device Bluetooth'
    },
    service_uuid: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Service UUID untuk koneksi Bluetooth'
    },
    characteristic_uuid: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Characteristic UUID untuk koneksi Bluetooth'
    },
    paper_width: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 58,
        comment: 'Lebar kertas dalam mm (58mm, 80mm)'
    },
    encoding: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'CP437',
        comment: 'Encoding untuk printer (CP437, UTF-8, etc)'
    },
    printer_type: {
        type: DataTypes.ENUM('thermal', 'inkjet', 'laser'),
        allowNull: false,
        defaultValue: 'thermal',
        comment: 'Tipe printer'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'disconnected'),
        allowNull: false,
        defaultValue: 'inactive',
        comment: 'Status printer'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Apakah printer ini default untuk cabang'
    },
    print_capabilities: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Kemampuan printer (invoice, checklist, receipt, etc)'
    },
    connection_settings: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Pengaturan koneksi tambahan'
    },
    last_connected: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Terakhir kali terhubung'
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID tenant pemilik printer'
    },
    branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID cabang tempat printer berada'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID user yang membuat printer'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'printers'
});

Printer.associate = (models) => {
    // Printer belongs to Tenant
    Printer.belongsTo(models.Tenant, { 
        foreignKey: 'tenant_id', 
        as: 'tenant', 
        onDelete: 'CASCADE' 
    });
    
    // Printer belongs to Branch
    Printer.belongsTo(models.Branch, { 
        foreignKey: 'branch_id', 
        as: 'branch', 
        onDelete: 'CASCADE' 
    });
    
    // Printer created by User
    Printer.belongsTo(models.User, { 
        foreignKey: 'created_by', 
        as: 'creator', 
        onDelete: 'SET NULL' 
    });
};

module.exports = Printer;
