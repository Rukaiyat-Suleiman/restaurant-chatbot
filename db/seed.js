import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { users } from "./schema.js";

async function seed() {
  console.log("Seeding database with default records...");
  try {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@example.com"))
      .limit(1);

    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(users).values({
        email: "admin@example.com",
        password: hashedPassword,
      });
      console.log("Seeding successful: admin@example.com / admin123 created.");
    } else {
      console.log("Seeding skipped: Admin user already exists.");
    }
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    await pool.end();
  }
}

seed();
