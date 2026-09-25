#!/usr/bin/env node
/**
 * Applies every SQL file in db/views/, in filename order, over DATABASE_URL. Each
 * file is idempotent (create or replace view / grant / revoke), so re-running is
 * always safe — this is not a one-shot migration like scripts/db-migrate.mjs.
 *
 * Refuses to run without an explicit --confirm flag — this repo owns the view
 * definitions but a human runs the apply step. Claude writes the SQL and stops.
 *
 * Usage:
 *   pnpm db:views [--confirm]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const viewsDir = path.join(root, "db/views");

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

const confirm = process.argv.includes("--confirm");

const files = readdirSync(viewsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error(`No .sql files found in ${viewsDir}`);
  process.exit(1);
}

loadEnvLocal();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

if (!confirm) {
  console.log(`Would apply, in order:\n${files.map((f) => `  ${f}`).join("\n")}`);
  console.log("Re-run with --confirm to actually apply.");
  process.exit(0);
}

const client = new pg.Client({ connectionString });

async function main() {
  await client.connect();

  for (const file of files) {
    const sql = readFileSync(path.join(viewsDir, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`Applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed, rolled back: ${file}`);
      console.error(err.message);
      process.exitCode = 1;
      break;
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
