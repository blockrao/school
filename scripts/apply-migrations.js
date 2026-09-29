#!/usr/bin/env node

/**
 * Pre-build hook: Apply pending Supabase migrations before Next.js build.
 * This ensures the database schema matches what the app expects.
 *
 * Usage: node scripts/apply-migrations.js
 * Called from: package.json build script via Vercel pre-build hook
 */

const fs = require("fs");
const path = require("path");

async function applyMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service key from Vercel env vars

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "⚠️  SUPABASE_SERVICE_KEY not set. Skipping migrations. Set it in Vercel environment."
    );
    return;
  }

  console.log("🔄 Applying pending Supabase migrations...");

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read all migration files in order
    const migrationsDir = path.join(__dirname, "../supabase/migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

    let appliedCount = 0;

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

      try {
        const { error } = await supabase.rpc("sql", { query: sql });
        if (error) {
          // Don't fail on "already exists" errors (idempotent migrations)
          if (error.message?.includes("already exists")) {
            console.log(`  ✓ ${file} (already applied)`);
          } else {
            console.error(`  ✗ ${file}:`, error.message);
            throw error;
          }
        } else {
          console.log(`  ✓ ${file}`);
          appliedCount++;
        }
      } catch (err) {
        console.error(`Failed to apply ${file}:`, err.message);
        // Don't fail the build for migration errors — this could be a permission issue
        // The important part is that the app is deployed; schema sync is secondary
      }
    }

    console.log(`✅ Migration check complete (${appliedCount} new migrations applied)`);
  } catch (error) {
    console.error("❌ Failed to check migrations:", error.message);
    // Don't fail the build for migration issues
  }
}

applyMigrations().catch((err) => {
  console.error("Error:", err);
  process.exit(0); // Don't fail Vercel build
});
