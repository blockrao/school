#!/usr/bin/env -S pnpm exec tsx
/**
 * Read-only verification, safe to run anytime (no --confirm needed):
 *
 * 1. Every row from each api.* view must parse against its Zod contract in
 *    src/contracts — this is what "fail the build if the contract diverges from
 *    what the views actually return" means in practice.
 * 2. SET ROLE anon and confirm: anon can read all four api.* views, and anon
 *    CANNOT read any raw table (schools, field_provenance, source_records,
 *    admission_cycles, profiles, children) or the staging schema.
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
  publicCorridorContract,
  publicLocalityContract,
  publicLocalityNeighborContract,
  publicSchoolAdmissionContract,
  publicSchoolContract,
  publicSeatStatusContract,
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
];

const client = new pg.Client({ connectionString });

async function verifyContracts(): Promise<boolean> {
  let ok = true;
  for (const { name, contract } of VIEWS) {
    const { rows } = await client.query(`select * from ${name}`);
    let failures = 0;
    for (const row of rows) {
      const result = contract.safeParse(row);
      if (!result.success) {
        failures++;
        if (failures === 1) {
          console.error(`✗ ${name}: contract mismatch on at least one row`);
          console.error(JSON.stringify(result.error, null, 2));
        }
      }
    }
    if (failures > 0) {
      console.error(`✗ ${name}: ${failures}/${rows.length} rows failed contract validation`);
      ok = false;
    } else {
      console.log(`✓ ${name}: ${rows.length} rows match the contract`);
    }
  }
  return ok;
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

async function verifyAnonAccess(): Promise<boolean> {
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

    for (const table of RAW_TABLES) {
      const result = await trySelect(`select * from ${table} limit 1`);
      if (result.ok) {
        console.error(`✗ anon CAN read raw table "${table}" — this must be blocked`);
        ok = false;
      } else {
        console.log(`✓ anon correctly blocked from raw table "${table}"`);
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

async function main() {
  await client.connect();
  const contractsOk = await verifyContracts();
  const anonOk = await verifyAnonAccess();

  if (!contractsOk || !anonOk) {
    console.error("\nverify:views FAILED");
    process.exitCode = 1;
  } else {
    console.log("\nverify:views passed");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
