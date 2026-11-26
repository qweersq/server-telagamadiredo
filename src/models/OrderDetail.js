const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderDetail = sequelize.define('order_details', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    treatment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'treatment',
            key: 'id'
        }
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
            model: 'items',
            key: 'id'
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    custom_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Harga custom yang di-override (nullable, jika null pakai harga treatment)'
    },
    custom_price_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Alasan/keterangan kenapa custom price diterapkan'
    },
    discount_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'discounts',
            key: 'id'
        }
    },
    process_time: {
        type: DataTypes.STRING,
    },
    process_time_cost: {
        type: DataTypes.DECIMAL(10, 2),
    },
    final_price: {
        type: DataTypes.DECIMAL(10, 2)
    },
    status: {
        type: DataTypes.STRING
    },
    due_date: {
        type: DataTypes.DATEONLY
    },
    description: {
        type: DataTypes.STRING,
        comment: 'Catatan bebas per item, mis. "es dipisah", "alergi kacang"'
    },
    serve_mode: {
        type: DataTypes.ENUM('dine-in', 'takeaway'),
        allowNull: true,
        defaultValue: null,
        comment: 'Dine-in atau bawa pulang per item. Null = ikut orders.order_type'
    },
    options_json: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Opsi terstruktur per item, mis. {"sugar":"less","ice":"normal"}'
    },
    production_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
            model: 'branches',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Cabang tempat item ini diproduksi (outlet penjual atau dapur pusat)'
    },
    pickup_method: {
        type: DataTypes.ENUM('pickup', 'delivery'),
        allowNull: true,
    },
    delivery_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    delivery_time: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    courier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    delivery_status: {
        type: DataTypes.ENUM('not_yet', 'scheduled', 'on_the_way', 'delivered', 'failed', 'done'), // untuk produk, status done jika tidak ada order_detail_id atau status not_yet, antrian, null, undefined, ''
        allowNull: true,
        defaultValue: 'not_yet'
    },
    perfume: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tag_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Nomor antrian tag sepatu, reset setiap hari per cabang (dasar: entry_date order)',
    },
    tag_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null,
        comment: 'Tanggal (entry_date order) yang dipakai sebagai dasar penomoran antrian',
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
    deletedAt: {
        type: DataTypes.DATE
    },
}, {
    paranoid: true,
    timestamps: true,
    tableName: 'order_details'
});

OrderDetail.associate = (models) => {
    OrderDetail.hasMany(models.ShoePhoto, { foreignKey: 'order_detail_id', onDelete: "CASCADE" });

    OrderDetail.belongsTo(models.Discount, { foreignKey: 'discount_id', onDelete: "CASCADE" });
    OrderDetail.belongsTo(models.Item, { as: 'item', foreignKey: 'item_id', onDelete: "CASCADE" });
    OrderDetail.belongsTo(models.Order, { foreignKey: 'order_id', onDelete: "CASCADE" });
    OrderDetail.belongsTo(models.Treatment, { foreignKey: 'treatment_id',as:'treatment', onDelete: "CASCADE" });
    OrderDetail.belongsTo(models.User, { foreignKey: 'employee_id', as: 'employee', onDelete: "CASCADE" });
    OrderDetail.belongsTo(models.User, { foreignKey: 'courier_id', as: 'courier' });
    // Dapur tempat item ini diproduksi (outlet penjual atau dapur pusat)
    OrderDetail.belongsTo(models.Branch, { foreignKey: 'production_branch_id', as: 'productionBranch', onDelete: 'SET NULL' });

    OrderDetail.hasMany(models.OrderDetailStatusLog, { foreignKey: 'order_detail_id', as: 'status_logs', onDelete: 'CASCADE' });
}

module.exports = OrderDetail;