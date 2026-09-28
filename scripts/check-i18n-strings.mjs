#!/usr/bin/env node
/**
 * Hindi-readiness checklist item 1/7 (2026-09-28): "Lint rule or CI grep that
 * fails on string literals in JSX/templates. This is what keeps rule 1 alive
 * after week two." Biome has no custom-lint-rule mechanism (unlike ESLint
 * plugins), so this is a standalone grep-based gate, following the same
 * pattern as check-public-adapter-imports.mjs.
 *
 * Heuristic, not a JSX parser: flags a run of JSX text (`>...text...<`) that
 * looks like a human sentence — contains a letter and a space, i.e. at least
 * two words. This deliberately misses single-word literals ("Menu",
 * "Schools") to keep false positives low from CSS-adjacent single tokens,
 * icons-as-text, etc. — a real gap, not a design goal; the point is to catch
 * NEW sentence-shaped strings creeping into JSX, not to be a complete
 * detector. It does not look inside `className`/other JSX attributes at all,
 * only text between tags.
 *
 * Ratchet, not a hard gate: most of the app predates this check (2026-09-28's
 * pass converted the global header/nav/footer and a handful of high-traffic
 * pages — see i18n-baseline.json for the rest). Failing CI on every
 * pre-existing literal would block unrelated work, so this only fails on
 * violations in files NOT listed in the baseline. Fixing a baselined file's
 * strings and removing it from the baseline is always welcome; adding a new
 * file to the baseline instead of fixing it should be rare and deliberate.
 */
import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const baseline = new Set(
  JSON.parse(readFileSync(path.join(__dirname, "i18n-baseline.json"), "utf8")),
);

// Two+ word run of letters between JSX tags, e.g. ">Something like this<".
// Skips pure interpolation (`>{...}<`) and single tokens.
const JSX_TEXT_RE = />\s*([A-Za-z][A-Za-z'.,!?()-]*(?:\s+[A-Za-z][A-Za-z'.,!?()-]*)+)\s*</g;

// Directories that are internal tools (ops/portal), dev-only sandboxes, or
// generated — never user-facing, so not in scope for this checklist.
const EXEMPT_PREFIXES = ["src/app/ops/", "src/app/portal/", "src/app/dev/", "src/app/api/"];

function isExempt(relPath) {
  return EXEMPT_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

async function main() {
  const newViolations = [];

  for await (const file of glob("src/{app,components}/**/*.tsx", { cwd: root })) {
    if (isExempt(file) || baseline.has(file)) continue;

    const fullPath = path.join(root, file);
    const content = readFileSync(fullPath, "utf8");
    const matches = [...content.matchAll(JSX_TEXT_RE)];
    if (matches.length > 0) {
      newViolations.push({ file, sample: matches[0][1].trim() });
    }
  }

  if (newViolations.length > 0) {
    console.error("Literal JSX text found outside the i18n baseline — route it through t():\n");
    for (const v of newViolations) console.error(`  - ${v.file}: "${v.sample}"`);
    console.error(
      "\nEither wrap the string with t('namespace.key') (see src/i18n/), or if this file " +
        "genuinely isn't ready yet, add it to scripts/i18n-baseline.json (prefer fixing it).",
    );
    process.exit(1);
  }

  console.log("check-i18n-strings: clean (no new literal JSX text outside the baseline).");
}

main();
