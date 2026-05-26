import { sequelize } from "./index.js";

async function dropTables() {
  console.log("Dropping existing chatbot tables using Sequelize...");
  try {
    await sequelize.drop();
    console.log("Database tables dropped successfully!");
  } catch (err) {
    console.error("Failed to drop tables:", err.message);
  } finally {
    await sequelize.close();
  }
}

dropTables();
