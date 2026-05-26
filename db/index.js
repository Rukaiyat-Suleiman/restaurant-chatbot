import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/postgres";

// Automatically configure SSL for remote deployed databases (like Render/Neon/Supabase)
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);
export { pool };
