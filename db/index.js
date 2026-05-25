import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/postgres",
});

export const db = drizzle(pool);
export { pool };
