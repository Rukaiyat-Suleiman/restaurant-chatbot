import { pgTable, serial, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  botState: varchar("bot_state", { length: 50 }).default("welcome").notNull(),
  currentItemId: integer("current_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).references(() => sessions.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'paid', 'cancelled'
  totalPrice: integer("total_price").default(0).notNull(), // in cents/kobo
  scheduledFor: timestamp("scheduled_for"),
  paymentReference: varchar("payment_reference", { length: 255 }).unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(), // in cents/kobo
  options: text("options"),
  createdAt: timestamp("created_at").defaultNow(),
});
