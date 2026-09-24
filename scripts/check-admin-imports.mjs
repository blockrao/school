#!/usr/bin/env node
/**
 * CI gate: fails if src/lib/db/admin.ts (the service-role client, bypasses RLS) is
 * ever imported from a Client Component or from outside the allowed server-only
 * areas. Run as part of the verify CI job.
 */
import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const ADMIN_IMPORT_RE = /from\s+["']@\/lib\/db\/admin["']/;
const USE_CLIENT_RE = /^\s*["']use client["'];?\s*$/m;

// Only server-only, staff-facing surfaces may reach for the service-role client.
const ALLOWED_PREFIXES = ["src/app/ops/", "src/app/api/", "src/lib/db/admin.ts"];

function isAllowed(relPath) {
  return ALLOWED_PREFIXES.some((prefix) => relPath === prefix || relPath.startsWith(prefix));
}

async function main() {
  const violations = [];

  for await (const file of glob("src/**/*.{ts,tsx}", { cwd: root })) {
    if (file === "src/lib/db/admin.ts") continue;

    const fullPath = path.join(root, file);
    const content = readFileSync(fullPath, "utf8");
    if (!ADMIN_IMPORT_RE.test(content)) continue;

    if (USE_CLIENT_RE.test(content)) {
      violations.push(`${file}: imports admin.ts from a "use client" file`);
      continue;
    }
    if (!isAllowed(file)) {
      violations.push(`${file}: imports admin.ts from outside src/app/ops/ or src/app/api/`);
    }
  }

  if (violations.length > 0) {
    console.error("admin.ts imported from a disallowed location:\n");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log("check-admin-imports: clean.");
}

main();
