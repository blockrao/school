#!/usr/bin/env node
/**
 * Applies one named SQL file from supabase/migrations/ over DATABASE_URL, inside a
 * transaction, and records it in a schema_migrations tracking table.
 *
 * Refuses to run without an explicit --confirm flag — this is the human-in-the-loop
 * gate for database writes. Claude writes migration files and stops; a human runs
 * `pnpm db:migrate <file> --confirm` to actually apply one.
 *
 * Usage:
 *   pnpm db:migrate <filename> [--confirm]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase/migrations");

const BASELINE_FILE = "00000000000000_baseline.sql";

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const filename = args.find((a) => !a.startsWith("--"));

if (!filename) {
  console.error("Usage: pnpm db:migrate <filename> [--confirm]");
  process.exit(1);
}

if (filename === BASELINE_FILE || filename === path.join(migrationsDir, BASELINE_FILE)) {
  console.error(
    `${BASELINE_FILE} is a reference snapshot, not a real migration — it must never be applied.`,
  );
  process.exit(1);
}

const filePath = path.isAbsolute(filename) ? filename : path.join(migrationsDir, filename);
let sql;
try {
  sql = readFileSync(filePath, "utf8");
} catch {
  console.error(`Not found: ${filePath}`);
  process.exit(1);
}

loadEnvLocal();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function main() {
  await client.connect();

  const trackingExists = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    );
  `);

  const baseName = path.basename(filePath);

  if (trackingExists.rows[0].exists) {
    const already = await client.query(
      "SELECT applied_at FROM schema_migrations WHERE filename = $1",
      [baseName],
    );
    if (already.rowCount > 0) {
      console.log(`${baseName} already applied at ${already.rows[0].applied_at.toISOString()}.`);
      return;
    }
  }

  if (!confirm) {
    console.log(`Would apply: ${baseName}`);
    console.log(`${sql.split("\n").length} lines. Re-run with --confirm to actually apply it.`);
    return;
  }

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [baseName]);
    await client.query("COMMIT");
    console.log(`Applied and recorded: ${baseName}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`Failed, rolled back: ${baseName}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
