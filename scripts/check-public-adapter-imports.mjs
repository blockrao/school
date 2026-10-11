#!/usr/bin/env node
/**
 * CI gate for the public school directory's read boundary.
 *
 * public-adapter.ts is the curated read adapter for school-directory data, not a
 * universal replacement for every Supabase operation in the application. Auth
 * callbacks, authenticated school claims, teacher management, user dashboards,
 * lead capture, and content actions intentionally use their own authorization
 * and write paths and must not be forced through a public read adapter.
 *
 * Keep this gate scoped to the school directory list and canonical school
 * entity route. Expand it only when a corresponding domain-specific adapter
 * contract exists for another feature.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const FROM_CALL_RE = /\.from\(\s*["'`]/;
const REQUIRED_PUBLIC_SCHOOL_READS = [
  "src/app/[locale]/schools/page.tsx",
  "src/app/[locale]/school/[slug]/page.tsx",
];

function main() {
  const violations = [];

  for (const relPath of REQUIRED_PUBLIC_SCHOOL_READS) {
    const fullPath = path.join(root, relPath);
    let content;
    try {
      content = readFileSync(fullPath, "utf8");
    } catch {
      violations.push(`${relPath}: required public school route is missing`);
      continue;
    }

    if (FROM_CALL_RE.test(content)) {
      violations.push(
        `${relPath}: public school route queries Supabase directly — use src/lib/db/public-adapter.ts`,
      );
    }
  }

  if (violations.length > 0) {
    console.error("Public school directory adapter violations:\n");
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exit(1);
  }

  console.log("check-public-adapter-imports: public school route boundary clean.");
}

main();
