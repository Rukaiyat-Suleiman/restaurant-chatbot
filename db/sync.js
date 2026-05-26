import { sequelize } from "./index.js";

async function syncDatabase() {
  console.log("Synchronizing PostgreSQL database with Sequelize...");
  try {
    await sequelize.sync({ alter: true });
    console.log("Database synchronized successfully!");
  } catch (err) {
    console.error("Database synchronization failed:", err.message);
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
