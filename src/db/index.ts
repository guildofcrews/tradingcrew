import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export const db = createDb();

export function getDb() {
  if (!db) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return db;
}
