#!/usr/bin/env node
/**
 * Invokes purge_expired_documents() — deletes the Storage object and soft-deletes
 * the documents row for anything past retain_until. See docs/data-retention.md.
 *
 * Not granted to any app-facing role, so this connects as DATABASE_URL (same
 * trust level as scripts/db-migrate.mjs) — run by a human, or wired to a real
 * scheduler once the retention policy has had legal review (see the doc).
 *
 * Usage:
 *   pnpm purge:documents
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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

loadEnvLocal();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function main() {
  await client.connect();
  const result = await client.query("select purge_expired_documents() as count");
  console.log(`Purged ${result.rows[0].count} expired document(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
