#!/usr/bin/env -S pnpm exec tsx
/**
 * Read-only verification, safe to run anytime (no --confirm needed):
 *
 * 1. Every row from each api.* view is parsed against its Zod contract in
 *    src/contracts — mismatches are printed but do NOT fail the script (fix and
 *    move on; a contract drift is a bug to fix, not a release blocker).
 * 2. Security checks DO determine process.exitCode: SET ROLE anon and confirm
 *    anon can read every granted api.* view, cannot read staging.schools_with_level,
 *    and cannot read any raw table directly — no allowlist exceptions.
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
  publicFieldEvidenceContract,
  publicLocalityContract,
  publicLocalityNeighborContract,
  publicSchoolAdmissionContract,
  publicSchoolBoardContract,
  publicSchoolContract,
  publicSeatStatusContract,
  publicStateContract,
  publicTeacherContract,
  publicTeacherExperienceContract,
  publicTeacherQualificationContract,
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
  { name: "api.public_school_boards", contract: publicSchoolBoardContract },
  { name: "api.public_teachers", contract: publicTeacherContract },
  { name: "api.public_teacher_experience", contract: publicTeacherExperienceContract },
  { name: "api.public_teacher_qualifications", contract: publicTeacherQualificationContract },
  { name: "api.public_field_evidence", contract: publicFieldEvidenceContract },
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
  "teachers",
  "teacher_experience",
  "teacher_qualifications",
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

/** Same as trySelect, but for parameterized queries (used by the ownership tests below). */
async function tryQuery(
  sql: string,
  params: unknown[] = [],
): Promise<{ ok: boolean; rows?: unknown[]; error?: string }> {
  try {
    await client.query("SAVEPOINT check_point");
    const result = await client.query(sql, params);
    await client.query("RELEASE SAVEPOINT check_point");
    return { ok: true, rows: result.rows };
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

/** Security check — determines process.exitCode. */
async function verifyApplicationHelpFunctionAccess(): Promise<boolean> {
  let ok = true;
  await client.query("BEGIN");
  try {
    await client.query("SET ROLE anon");
    const anonChecks: [string, string][] = [
      [
        "create_application_order",
        "select create_application_order('help_single', gen_random_uuid())",
      ],
      ["save_order_intake", "select save_order_intake(gen_random_uuid(), '{}'::jsonb)"],
      ["approve_application", "select approve_application(gen_random_uuid())"],
      ["mark_order_paid", "select mark_order_paid(gen_random_uuid(), 'x')"],
    ];
    for (const [label, sql] of anonChecks) {
      const result = await trySelect(sql);
      if (result.ok) {
        console.error(`✗ anon CAN execute ${label} — this must be blocked`);
        ok = false;
      } else {
        console.log(`✓ anon correctly blocked from executing ${label}`);
      }
    }
    await client.query("RESET ROLE");

    await client.query("SET ROLE authenticated");
    const authenticatedChecks: [string, string][] = [
      ["mark_order_paid", "select mark_order_paid(gen_random_uuid(), 'x')"],
      ["purge_expired_documents", "select purge_expired_documents()"],
    ];
    for (const [label, sql] of authenticatedChecks) {
      const result = await trySelect(sql);
      if (result.ok) {
        console.error(`✗ authenticated CAN execute ${label} — this must be blocked`);
        ok = false;
      } else {
        console.log(`✓ authenticated correctly blocked from executing ${label}`);
      }
    }
  } finally {
    await client.query("RESET ROLE");
    await client.query("ROLLBACK");
  }
  return ok;
}

/**
 * Security check — determines process.exitCode. Simulates two real parents (via
 * request.jwt.claim.sub, the same GUC auth.uid() reads) to prove the ownership
 * checks inside create_application_order/save_order_intake actually reject a
 * cross-user call, not just that the grant exists. Everything here is rolled
 * back — no fixture data persists.
 */
async function verifyApplicationHelpOwnership(): Promise<boolean> {
  let ok = true;
  await client.query("BEGIN");
  try {
    const userA = "00000000-0000-4000-8000-000000000001";
    const userB = "00000000-0000-4000-8000-000000000002";
    await client.query("insert into profiles (user_id) values ($1), ($2)", [userA, userB]);
    const childA = (
      await client.query(
        "insert into children (parent_id, first_name, date_of_birth) values ($1, 'Test Child', '2022-01-01') returning id",
        [userA],
      )
    ).rows[0].id;

    // create_application_order's signature is the only defense against a
    // tampered amount — confirm it has no amount/price parameter at all.
    const args = (
      await client.query(
        "select pg_get_function_arguments(oid) as args from pg_proc where proname = 'create_application_order'",
      )
    ).rows[0].args as string;
    if (/amount|price/i.test(args)) {
      console.error(`✗ create_application_order accepts a client-supplied amount/price: (${args})`);
      ok = false;
    } else {
      console.log(`✓ create_application_order takes no amount/price argument — (${args})`);
    }

    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userA]);
    await client.query("SET ROLE authenticated");
    const created = await tryQuery("select create_application_order('help_single', $1) as id", [
      childA,
    ]);
    await client.query("RESET ROLE");

    if (!created.ok || !created.rows?.[0]) {
      console.error(`✗ create_application_order failed for its own owner — ${created.error}`);
      ok = false;
    } else {
      const orderId = (created.rows[0] as { id: string }).id;
      const priceCheck = await client.query(
        "select o.amount_inr, p.price_inr from application_orders o join products p on p.code = o.product_code where o.id = $1",
        [orderId],
      );
      const { amount_inr, price_inr } = priceCheck.rows[0];
      if (String(amount_inr) !== String(price_inr)) {
        console.error(
          `✗ order amount_inr (${amount_inr}) does not match products.price_inr (${price_inr})`,
        );
        ok = false;
      } else {
        console.log(`✓ order amount_inr (₹${amount_inr}) came from products, not a client value`);
      }

      // User A can legitimately save their own intake.
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userA]);
      await client.query("SET ROLE authenticated");
      const ownIntake = await tryQuery(
        'select save_order_intake($1, \'{"category":"general"}\'::jsonb)',
        [orderId],
      );
      await client.query("RESET ROLE");
      if (!ownIntake.ok) {
        console.error(`✗ save_order_intake failed for its own owner — ${ownIntake.error}`);
        ok = false;
      } else {
        console.log("✓ owner can save their own order's intake");
      }

      // User B (a different parent) must be rejected on both counts.
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userB]);
      await client.query("SET ROLE authenticated");
      const crossIntake = await tryQuery("select save_order_intake($1, '{}'::jsonb)", [orderId]);
      const crossOrder = await tryQuery("select create_application_order('help_single', $1)", [
        childA,
      ]);
      await client.query("RESET ROLE");

      if (crossIntake.ok) {
        console.error("✗ a different user CAN save_order_intake on someone else's order");
        ok = false;
      } else {
        console.log(
          "✓ a different user is correctly rejected from save_order_intake on this order",
        );
      }
      if (crossOrder.ok) {
        console.error("✗ a different user CAN create_application_order using someone else's child");
        ok = false;
      } else {
        console.log(
          "✓ a different user is correctly rejected from create_application_order using this child",
        );
      }

      // Once any application under this order reaches "submitted" or later, the
      // owner themselves must be locked out of save_order_intake too.
      await client.query(
        "insert into applications (order_id, school_id, status) values ($1, (select id from schools limit 1), 'submitted')",
        [orderId],
      );
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userA]);
      await client.query("SET ROLE authenticated");
      const lockedIntake = await tryQuery("select save_order_intake($1, '{}'::jsonb)", [orderId]);
      await client.query("RESET ROLE");

      if (lockedIntake.ok) {
        console.error("✗ owner CAN still save_order_intake after an application was submitted");
        ok = false;
      } else {
        console.log(
          "✓ owner correctly locked out of save_order_intake once an application is submitted",
        );
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
  console.log("\n--- security: application-help function access ---");
  const functionAccessOk = await verifyApplicationHelpFunctionAccess();
  console.log("\n--- security: application-help ownership + tamper checks ---");
  const ownershipOk = await verifyApplicationHelpOwnership();

  if (!anonViewsOk || !rawTablesOk || !functionAccessOk || !ownershipOk) {
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
