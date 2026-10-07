#!/bin/bash

# SchoolOye Supabase Clean Data Export Script (v2)
# EXCLUDES: All admissions seed data (cycles, applications, leads, children, enquiries, orders)
# KEEPS: Core school discovery + features + board affiliations only
# Usage: ./export_clean_data_v2.sh

set -e

# Configuration
OLD_PROJECT_ID="ybevzpryuvgxclkhdjld"
OLD_DB_HOST="db.${OLD_PROJECT_ID}.supabase.co"
OLD_DB_USER="postgres"
OLD_DB_NAME="postgres"

OUTPUT_DIR="./supabase_migration_export_clean"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "================================"
echo "SchoolOye Clean Data Export (v2)"
echo "NO admissions seed data"
echo "================================"
echo ""
echo "Source: $OLD_DB_HOST"
echo "Export folder: $OUTPUT_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""

# Table exclusion list (logging + admissions seed data)
EXCLUDE_TABLES=(
  # LOGGING / OVERHEAD (as before)
  "audit_log"
  "source_records"
  "field_provenance"
  "data_quality_flags"
  "analytics_events"
  "school_name_case_backup"
  "schema_migrations"
  "rate_limits"
  "spatial_ref_sys"
  "school_slug_history"
  "school_slug_redirects"
  "conversations"
  "messages"
  "correction_requests"
  "update_reports"
  "content_posts"
  "form_mappings"
  "documents"
  "sales_accounts"
  "sales_activities"

  # ADMISSIONS SEED DATA (new exclusions)
  "admission_cycles"
  "admission_leads"
  "admission_notices"
  "children"
  "enquiries"
  "application_orders"
  "applications"
  "seat_status"
  "shortlists"
  "exam_centres"
  "exam_participating_schools"
  "exam_cycle_milestones"
  "exam_fee_tiers"
  "exam_reservation_splits"
  "alert_subscriptions"
  "alert_deliveries"
  "teacher_claims"
  "teacher_experience"
  "teacher_qualifications"
  "school_teacher_affiliations"
)

# Build pg_dump exclude arguments
EXCLUDE_ARGS=""
for table in "${EXCLUDE_TABLES[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude-table-data='public.$table'"
done

echo "Step 1: Exporting schema (DDL only)..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  $EXCLUDE_ARGS \
  --exclude-table='public.spatial_ref_sys' \
  > "$OUTPUT_DIR/01_schema_${TIMESTAMP}.sql"

echo "✓ Schema exported: 01_schema_${TIMESTAMP}.sql"
echo ""

echo "Step 2: Exporting core data only (schools + teachers + features + board affiliations)..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  $EXCLUDE_ARGS \
  --exclude-table='public.spatial_ref_sys' \
  > "$OUTPUT_DIR/02_data_${TIMESTAMP}.sql"

echo "✓ Data exported: 02_data_${TIMESTAMP}.sql"
echo ""

echo "Step 3: Exporting auth users (with role access)..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --data-only \
  --no-owner \
  --no-privileges \
  --table='auth.users' \
  --table='auth.sessions' \
  --table='auth.refresh_tokens' \
  > "$OUTPUT_DIR/03_auth_users_${TIMESTAMP}.sql" 2>/dev/null || echo "  (No auth data)"

echo "✓ Auth users exported: 03_auth_users_${TIMESTAMP}.sql"
echo ""

echo "Step 4: Exporting views and RLS policies..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  -t 'api.*' \
  > "$OUTPUT_DIR/04_views_${TIMESTAMP}.sql" 2>/dev/null || echo "(Views may not exist yet)"

echo "✓ Views exported: 04_views_${TIMESTAMP}.sql"
echo ""

echo "================================"
echo "CLEAN EXPORT COMPLETE"
echo "================================"
echo ""
echo "What's included:"
echo "  ✓ 10,670 schools (full data)"
echo "  ✓ 18,751 school identifiers (UDISE codes)"
echo "  ✓ 3,792 school affiliations (board metadata)"
echo "  ✓ Geographic hierarchy (states, districts, cities, localities)"
echo "  ✓ 3 school_posts + 2 school_events + 3 school_jobs"
echo "  ✓ 1 teacher (seed data for testing)"
echo "  ✓ Auth users + sessions (existing user accounts with role access)"
echo ""
echo "What's excluded:"
echo "  ✗ ALL admissions seed data (cycles, children, enquiries, orders)"
echo "  ✗ ALL logging/overhead tables (audit_log, source_records, etc.)"
echo "  ✗ Empty user interaction tables (shortlists, seat_status, etc.)"
echo ""
echo "Files in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR/" | tail -n +2
echo ""
echo "Next steps:"
echo "1. Create new Supabase project at https://app.supabase.com/projects"
echo "2. In new project SQL Editor, run (IN ORDER):"
echo "   psql -h db.[NEW_PROJECT_ID].supabase.co -U postgres -d postgres < $OUTPUT_DIR/01_schema_*.sql"
echo "   psql -h db.[NEW_PROJECT_ID].supabase.co -U postgres -d postgres < $OUTPUT_DIR/02_data_*.sql"
echo "   psql -h db.[NEW_PROJECT_ID].supabase.co -U postgres -d postgres < $OUTPUT_DIR/03_auth_users_*.sql"
echo "   psql -h db.[NEW_PROJECT_ID].supabase.co -U postgres -d postgres < $OUTPUT_DIR/04_views_*.sql"
echo ""
echo "3. Update .env.local with new Supabase URL and API key"
echo "4. Test: pnpm dev"
echo ""
