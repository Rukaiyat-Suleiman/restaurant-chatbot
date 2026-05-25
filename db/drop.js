import { pool } from "./index.js";

async function dropTables() {
  console.log("Dropping existing chatbot tables to reset schema tracking...");
  try {
    // Cascading drop to remove tables and their foreign key constraints cleanly
    await pool.query("DROP TABLE IF EXISTS order_items, orders, sessions, users CASCADE;");
    console.log("Database tables dropped successfully!");
  } catch (err) {
    console.error("Failed to drop tables:", err.message);
  } finally {
    await pool.end();
  }
}

dropTables();
