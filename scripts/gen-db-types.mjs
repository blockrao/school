#!/usr/bin/env node
/**
 * Introspects the public schema over DATABASE_URL_RO and emits src/lib/db/types.ts
 * in the supabase-js `Database` type shape. Replaces `supabase gen types` (forbidden
 * by CLAUDE.md's Supabase access rule — no Supabase CLI). Read-only: only queries
 * information_schema/pg_catalog, never touches table data.
 *
 * Extension-owned tables/views/functions (PostGIS's spatial_ref_sys, geometry_columns,
 * geography_columns, and its ~200 geometry functions) are excluded — they're not part
 * of our application schema.
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

const connectionString = process.env.DATABASE_URL_RO;
if (!connectionString) {
  console.error("DATABASE_URL_RO is not set in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

/** Maps a Postgres column to a TypeScript type expression. */
function pgTypeToTs(column, enumNames) {
  const udt = column.udt_name;

  if (udt.startsWith("_")) {
    const base = pgTypeToTs({ ...column, udt_name: udt.slice(1) }, enumNames);
    return `${base}[]`;
  }
  if (enumNames.has(udt)) {
    return `Database["public"]["Enums"]["${udt}"]`;
  }

  switch (udt) {
    case "int2":
    case "int4":
    case "int8":
    case "float4":
    case "float8":
    case "numeric":
      return "number";
    case "bool":
      return "boolean";
    case "json":
    case "jsonb":
      return "Json";
    case "text":
    case "varchar":
    case "bpchar":
    case "uuid":
    case "date":
    case "time":
    case "timetz":
    case "timestamp":
    case "timestamptz":
    case "interval":
    case "citext":
      return "string";
    default:
      return "unknown"; // geometry/geography and anything else we don't special-case
  }
}

function columnsToRow(columns, enumNames) {
  return columns
    .map((c) => {
      const ts = pgTypeToTs(c, enumNames);
      const nullable = c.is_nullable === "YES";
      return `          ${c.column_name}: ${ts}${nullable ? " | null" : ""};`;
    })
    .join("\n");
}

function columnsToInsertOrUpdate(columns, enumNames, mode) {
  return columns
    .map((c) => {
      const ts = pgTypeToTs(c, enumNames);
      const nullable = c.is_nullable === "YES";
      const hasDefault = c.column_default !== null || c.is_identity === "YES";
      const optional = mode === "Update" || nullable || hasDefault;
      return `          ${c.column_name}${optional ? "?" : ""}: ${ts}${nullable ? " | null" : ""};`;
    })
    .join("\n");
}

async function main() {
  await client.connect();

  const enumsResult = await client.query(`
    SELECT t.typname, e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);
  const enums = new Map();
  for (const row of enumsResult.rows) {
    if (!enums.has(row.typname)) enums.set(row.typname, []);
    enums.get(row.typname).push(row.enumlabel);
  }
  const enumNames = new Set(enums.keys());

  const tablesResult = await client.query(`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
    ORDER BY c.relname;
  `);
  const viewsResult = await client.query(`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
    ORDER BY c.relname;
  `);

  const columnsResult = await client.query(`
    SELECT table_name, column_name, udt_name, is_nullable, column_default, is_identity
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  const columnsByTable = new Map();
  for (const row of columnsResult.rows) {
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, []);
    columnsByTable.get(row.table_name).push(row);
  }

  const functionsResult = await client.query(`
    SELECT p.proname,
           pg_get_function_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS result
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND pg_get_function_result(p.oid) NOT IN ('trigger', 'event_trigger')
    ORDER BY p.proname;
  `);

  const tableNames = tablesResult.rows.map((r) => r.relname);
  const viewNames = viewsResult.rows.map((r) => r.relname);

  const tablesTs = tableNames
    .map((name) => {
      const columns = columnsByTable.get(name) ?? [];
      return `      ${name}: {
        Row: {
${columnsToRow(columns, enumNames)}
        };
        Insert: {
${columnsToInsertOrUpdate(columns, enumNames, "Insert")}
        };
        Update: {
${columnsToInsertOrUpdate(columns, enumNames, "Update")}
        };
        Relationships: [];
      };`;
    })
    .join("\n");

  const viewsTs = viewNames
    .map((name) => {
      const columns = columnsByTable.get(name) ?? [];
      return `      ${name}: {
        Row: {
${columnsToRow(columns, enumNames)}
        };
        Relationships: [];
      };`;
    })
    .join("\n");

  const enumsTs = [...enums.entries()]
    .map(([name, values]) => `      ${name}: ${values.map((v) => `"${v}"`).join(" | ")};`)
    .join("\n");

  const functionsTs = functionsResult.rows
    .map((f) => {
      return `      ${f.proname}: {
        Args: Record<string, unknown>; // ${f.args || "no args"}
        Returns: unknown; // ${f.result}
      };`;
    })
    .join("\n");

  const output = `// AUTO-GENERATED by scripts/gen-db-types.mjs (pnpm db:types). Do not edit by hand.
// Introspected over DATABASE_URL_RO — read-only, information_schema/pg_catalog only.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
${tablesTs}
    };
    Views: ${viewNames.length > 0 ? `{\n${viewsTs}\n    }` : "Record<string, never>"};
    Functions: {
${functionsTs}
    };
    Enums: {
${enumsTs}
    };
    CompositeTypes: Record<string, never>;
  };
};
`;

  const outPath = path.join(root, "src/lib/db/types.ts");
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(outPath), { recursive: true }),
  );
  await import("node:fs/promises").then((fs) => fs.writeFile(outPath, output, "utf8"));

  console.log(
    `Wrote src/lib/db/types.ts — ${tableNames.length} tables, ${viewNames.length} views, ${enums.size} enums, ${functionsResult.rows.length} functions.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
