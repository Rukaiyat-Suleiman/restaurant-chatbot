import bcrypt from "bcrypt";
import { User, sequelize } from "./index.js";

async function seed() {
  console.log("Seeding database with default records...");
  try {
    const existingAdmin = await User.findOne({ where: { email: "admin@example.com" } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
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
    await sequelize.close();
  }
}

seed();
