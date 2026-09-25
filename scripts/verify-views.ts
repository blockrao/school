#!/usr/bin/env -S pnpm exec tsx
/**
 * Read-only verification, safe to run anytime (no --confirm needed):
 *
 * 1. Every row from each api.* view is parsed against its Zod contract in
 *    src/contracts — mismatches are printed but do NOT fail the script (fix and
 *    move on; a contract drift is a bug to fix, not a release blocker).
 * 2. Security checks DO determine process.exitCode: SET ROLE anon and confirm
 *    anon can read every granted api.* view, cannot read staging.schools_with_level,
 *    and cannot read any raw table directly (the reference-table allowlist in
 *    src/lib/db/public-adapter.ts's header is the one intentional exception —
 *    RAW_TABLES below excludes exactly that allowlist).
 *
 * Uses DATABASE_URL (not DATABASE_URL_RO) because SET ROLE anon requires a
 * privileged connection to switch into — this script performs no writes.
 *
 * Usage: pnpm verify:views
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  publicAreaContract,
  publicBoardContract,
  publicCityContract,
  publicCorridorContract,
  publicDistrictContract,
  publicLocalityContract,
  publicLocalityNeighborContract,
  publicSchoolAdmissionContract,
  publicSchoolAffiliationContract,
  publicSchoolContract,
  publicSeatStatusContract,
  publicStateContract,
} from "../src/contracts/index";

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

const VIEWS: {
  name: string;
  contract: { safeParse: (v: unknown) => { success: boolean; error?: unknown } };
}[] = [
  { name: "api.public_schools", contract: publicSchoolContract },
  { name: "api.public_school_admissions", contract: publicSchoolAdmissionContract },
  { name: "api.public_seat_status", contract: publicSeatStatusContract },
  { name: "api.public_areas", contract: publicAreaContract },
  { name: "api.public_localities", contract: publicLocalityContract },
  { name: "api.public_corridors", contract: publicCorridorContract },
  { name: "api.public_locality_neighbors", contract: publicLocalityNeighborContract },
  { name: "api.public_districts", contract: publicDistrictContract },
  { name: "api.public_states", contract: publicStateContract },
  { name: "api.public_cities", contract: publicCityContract },
  { name: "api.public_boards", contract: publicBoardContract },
  { name: "api.public_school_affiliations", contract: publicSchoolAffiliationContract },
];

const RAW_TABLES = [
  "schools",
  "field_provenance",
  "source_records",
  "admission_cycles",
  "seat_status",
  "profiles",
  "children",
  "localities",
  "corridors",
  "locality_pincodes",
  "locality_neighbors",
  "landmarks",
  "districts",
  "states",
  "cities",
  "boards",
  "school_affiliations",
];

const client = new pg.Client({ connectionString });

/** Warnings only — does not affect process.exitCode. See file header. */
async function verifyContracts(): Promise<void> {
  for (const { name, contract } of VIEWS) {
    const { rows } = await client.query(`select * from ${name}`);
    let failures = 0;
    for (const row of rows) {
      const result = contract.safeParse(row);
      if (!result.success) {
        failures++;
        if (failures === 1) {
          console.warn(`⚠ ${name}: contract mismatch on at least one row`);
          console.warn(JSON.stringify(result.error, null, 2));
        }
      }
    }
    if (failures > 0) {
      console.warn(`⚠ ${name}: ${failures}/${rows.length} rows failed contract validation`);
    } else {
      console.log(`✓ ${name}: ${rows.length} rows match the contract`);
    }
  }
}

/**
 * A permission-denied error aborts the enclosing transaction in Postgres — every
 * later query in it would fail too, even harmless ones, until rolled back. Each
 * check runs inside its own SAVEPOINT so an expected failure doesn't poison the
 * rest of the transaction.
 */
async function trySelect(sql: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await client.query("SAVEPOINT check_point");
    await client.query(sql);
    await client.query("RELEASE SAVEPOINT check_point");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT check_point");
    return { ok: false, error: (err as Error).message };
  }
}

async function verifyAnonViewAccess(): Promise<boolean> {
  let ok = true;
  await client.query("BEGIN");
  try {
    await client.query("SET ROLE anon");

    for (const { name } of VIEWS) {
      const result = await trySelect(`select * from ${name} limit 1`);
      if (result.ok) {
        console.log(`✓ anon can read ${name}`);
      } else {
        console.error(`✗ anon CANNOT read ${name} (expected to) — ${result.error}`);
        ok = false;
      }
    }

    const stagingResult = await trySelect("select * from staging.schools_with_level limit 1");
    if (stagingResult.ok) {
      console.error("✗ anon CAN read staging.schools_with_level — this must be blocked");
      ok = false;
    } else {
      console.log("✓ anon correctly blocked from staging.schools_with_level");
    }
  } finally {
    await client.query("RESET ROLE");
    await client.query("ROLLBACK");
  }
  return ok;
}

/** Security check — determines process.exitCode. */
async function verifyRawTablesBlocked(): Promise<boolean> {
  let ok = true;
  await client.query("BEGIN");
  try {
    await client.query("SET ROLE anon");

    for (const table of RAW_TABLES) {
      const result = await trySelect(`select * from ${table} limit 1`);
      if (result.ok) {
        console.error(`✗ anon CAN read raw table "${table}" — this must be blocked`);
        ok = false;
      } else {
        console.log(`✓ anon correctly blocked from raw table "${table}"`);
      }
    }
  } finally {
    await client.query("RESET ROLE");
    await client.query("ROLLBACK");
  }
  return ok;
}

async function main() {
  await client.connect();

  await verifyContracts();
  console.log("\n--- security: anon view/staging access ---");
  const anonViewsOk = await verifyAnonViewAccess();
  console.log("\n--- security: raw tables blocked ---");
  const rawTablesOk = await verifyRawTablesBlocked();

  if (!anonViewsOk || !rawTablesOk) {
    console.error("\nverify:views FAILED (security)");
    process.exitCode = 1;
  } else {
    console.log("\nverify:views passed (contract warnings, if any, are printed above)");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
