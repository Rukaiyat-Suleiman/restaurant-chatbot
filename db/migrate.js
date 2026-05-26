import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index.js";

async function runMigrations() {
  console.log("Running Drizzle migrations...");
  try {
    // Explicitly configure migrationsSchema to 'public' to completely avoid CREATE SCHEMA statements
    await migrate(db, { 
      migrationsFolder: "./drizzle",
      migrationsTable: "drizzle_migrations",
      migrationsSchema: "public" 
    });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

runMigrations();
