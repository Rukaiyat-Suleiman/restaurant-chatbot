import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index.js";

async function runMigrations() {
  console.log("Running Drizzle migrations...");
  try {
    // Explicitly configure migrationsTable to use the public schema instead of creating a "drizzle" schema
    await migrate(db, { 
      migrationsFolder: "./drizzle",
      migrationsTable: "drizzle_migrations" 
    });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

runMigrations();
