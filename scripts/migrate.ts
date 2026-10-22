import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("DATABASE_URL not set, skipping migrations");
    process.exit(0);
  }

  console.log("Running database migrations...");

  try {
    const sql = neon(connectionString);
    const db = drizzle(sql);

    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
