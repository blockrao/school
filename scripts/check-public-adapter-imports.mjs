#!/usr/bin/env node
/**
 * CI gate: fails if a public route queries Supabase directly (`.from(...)`) instead
 * of going through src/lib/db/public-adapter.ts. Keeps every public read in one file,
 * so swapping base tables for the public_* views (once the DB agent creates them) is
 * a one-file change instead of a codebase-wide hunt.
 *
 * /my, /portal, /ops, /api are exempt — they have their own legitimate direct-query
 * patterns via session.ts (authenticated) and admin.ts (staff/service-role).
 */
import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const FROM_CALL_RE = /\.from\(\s*["'`]/;

const EXEMPT_PREFIXES = ["src/app/my/", "src/app/portal/", "src/app/ops/", "src/app/api/"];
const ALLOWED_FILE = "src/lib/db/public-adapter.ts";

function isExempt(relPath) {
  return EXEMPT_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

async function main() {
  const violations = [];

  for await (const file of glob("src/app/**/*.{ts,tsx}", { cwd: root })) {
    if (file === ALLOWED_FILE || isExempt(file)) continue;

    const fullPath = path.join(root, file);
    const content = readFileSync(fullPath, "utf8");
    if (FROM_CALL_RE.test(content)) {
      violations.push(
        `${file}: queries Supabase directly — use src/lib/db/public-adapter.ts instead`,
      );
    }
  }

  if (violations.length > 0) {
    console.error("Public route bypassing public-adapter.ts:\n");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log("check-public-adapter-imports: clean.");
}

main();
