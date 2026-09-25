#!/usr/bin/env node
/**
 * Applies every SQL file in db/views/, in filename order, over DATABASE_URL. Each
 * file only creates or replaces a view — no grants, revokes, or policy changes
 * belong here (those go in supabase/migrations/, applied via `pnpm db:migrate`, so
 * a destructive change is tracked and one-shot instead of silently re-applied every
 * time this script runs). `CREATE OR REPLACE VIEW` is itself idempotent, so
 * re-running this script is always safe — unlike scripts/db-migrate.mjs.
 *
 * `CREATE OR REPLACE VIEW` cannot change a column's type — before each file's own
 * SQL runs, this script issues `DROP VIEW IF EXISTS <name> CASCADE` for every view
 * that file creates (parsed from `create (or replace )? view <name>`), inside the
 * same per-file transaction. This makes every view file safe to edit freely
 * (including changing a column's type) without needing to hand-add drop statements.
 * No CASCADE risk today — nothing depends on any of these views yet — but if a
 * future view is built on top of another, this needs reconsidering (a dropped
 * dependency would take the dependent view with it).
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

const VIEW_NAME_RE = /create\s+(?:or\s+replace\s+)?view\s+([a-z0-9_.]+)/gi;

function stripLineComments(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function dropStatementsFor(sql) {
  const names = new Set();
  for (const match of stripLineComments(sql).matchAll(VIEW_NAME_RE)) {
    names.add(match[1]);
  }
  return [...names].map((name) => `drop view if exists ${name} cascade;`);
}

async function main() {
  await client.connect();

  for (const file of files) {
    const sql = readFileSync(path.join(viewsDir, file), "utf8");
    const drops = dropStatementsFor(sql);
    try {
      await client.query("BEGIN");
      for (const drop of drops) {
        await client.query(drop);
      }
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
