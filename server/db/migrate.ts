import { mkdirSync, existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH ?? join(process.cwd(), "data", "glider.db");
const dir = dirname(dbPath);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(dbPath);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`);

const migrationsDir = join(__dirname, "migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const name = file.replace(".sql", "");
  const row = sqlite.prepare("SELECT 1 FROM __migrations WHERE name = ?").get(name);
  if (row) continue;
  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  sqlite.exec(sql);
  sqlite.prepare("INSERT INTO __migrations (name, applied_at) VALUES (?, ?)").run(name, Date.now());
  console.log("Applied:", file);
}

console.log("Migrations done.");
sqlite.close();
