import { join } from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_PATH ?? join(process.cwd(), "data", "glider.db");
export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
export * from "./schema.js";
