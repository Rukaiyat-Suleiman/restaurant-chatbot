import { Sequelize, DataTypes } from "sequelize";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/postgres";

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Initialize Sequelize
export const sequelize = new Sequelize(connectionString, {
  dialect: "postgres",
  logging: false, // Set to console.log to debug query SQL
  dialectOptions: isLocal
    ? {}
    : {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Standard for Render/Neon PostgreSQL
        },
      },
});

// --- Models Definition ---

// 1. User Model
export const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: "users",
  timestamps: true,
  updatedAt: false,
  createdAt: "created_at",
});

// 2. Session Model
export const Session = sequelize.define("Session", {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    field: "user_id",
    allowNull: true,
  },
  botState: {
    type: DataTypes.STRING(50),
    field: "bot_state",
    allowNull: false,
    defaultValue: "welcome",
  },
  currentItemId: {
    type: DataTypes.INTEGER,
    field: "current_item_id",
    allowNull: true,
  },
}, {
  tableName: "sessions",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

// 3. Order Model
export const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    field: "session_id",
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    field: "user_id",
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "pending", // 'pending', 'paid', 'cancelled'
  },
  totalPrice: {
    type: DataTypes.INTEGER,
    field: "total_price",
    allowNull: false,
    defaultValue: 0,
  },
  scheduledFor: {
    type: DataTypes.DATE,
    field: "scheduled_for",
    allowNull: true,
  },
  paymentReference: {
    type: DataTypes.STRING(255),
    field: "payment_reference",
    unique: true,
    allowNull: true,
  },
}, {
  tableName: "orders",
  timestamps: true,
  updatedAt: false,
  createdAt: "created_at",
});

// 4. OrderItem Model
export const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    field: "order_id",
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING(255),
    field: "item_name",
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  unitPrice: {
    type: DataTypes.INTEGER,
    field: "unit_price",
    allowNull: false,
  },
  options: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "order_items",
  timestamps: true,
  updatedAt: false,
  createdAt: "created_at",
});

// --- Model Relationships (Foreign Keys with Cascade Deletes) ---

// User has many Sessions & Orders
User.hasMany(Session, { foreignKey: "userId", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Order, { foreignKey: "userId", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: "userId" });

// Session has many Orders
Session.hasMany(Order, { foreignKey: "sessionId", onDelete: "CASCADE" });
Order.belongsTo(Session, { foreignKey: "sessionId" });

// Order has many OrderItems
Order.hasMany(OrderItem, { foreignKey: "orderId", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });
