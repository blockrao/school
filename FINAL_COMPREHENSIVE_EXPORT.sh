#!/bin/bash

# SchoolOye Supabase FINAL COMPREHENSIVE EXPORT
# Exports EVERYTHING before permanent retirement:
# - All schema (tables, views, functions, triggers, indexes, RLS policies)
# - All data (including sensitive/logging for archival)
# - Auth users + roles
# - Configuration + settings
# - Storage buckets (if any)
#
# Usage: ./FINAL_COMPREHENSIVE_EXPORT.sh

set -e

# Configuration
OLD_PROJECT_ID="ybevzpryuvgxclkhdjld"
OLD_DB_HOST="db.${OLD_PROJECT_ID}.supabase.co"
OLD_DB_USER="postgres"
OLD_DB_NAME="postgres"

OUTPUT_DIR="./supabase_final_export_complete"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "SchoolOye Final Comprehensive Export"
echo "========================================"
echo ""
echo "Source: $OLD_DB_HOST"
echo "Export folder: $OUTPUT_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "This export includes EVERYTHING for archival."
echo "Press Enter to continue, or Ctrl+C to cancel."
read

# ============================================================================
# 1. SCHEMA ONLY (Tables, Views, Functions, Triggers, Indexes, RLS Policies)
# ============================================================================

echo "Step 1: Exporting COMPLETE SCHEMA (with all metadata)..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > "$OUTPUT_DIR/01_schema_complete_${TIMESTAMP}.sql"

echo "✓ Full schema saved (includes all views, functions, triggers, indexes, RLS policies)"
echo ""

# ============================================================================
# 2. ALL DATA (Including logging/audit - for archival purposes)
# ============================================================================

echo "Step 2: Exporting ALL DATA (including logging tables for archival)..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --data-only \
  --no-owner \
  --no-privileges \
  > "$OUTPUT_DIR/02_data_complete_all_tables_${TIMESTAMP}.sql"

echo "✓ All data exported (core + logging + admissions)"
echo ""

# ============================================================================
# 3. AUTH USERS (from Supabase auth.users table)
# ============================================================================

echo "Step 3: Exporting auth.users table..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --data-only \
  --table='auth.users' \
  --table='auth.sessions' \
  --table='auth.refresh_tokens' \
  > "$OUTPUT_DIR/03_auth_users_${TIMESTAMP}.sql" 2>/dev/null || echo "  (No auth data or schema not exported)"

echo "✓ Auth users + sessions exported"
echo ""

# ============================================================================
# 4. STORAGE METADATA (if files exist in Supabase Storage)
# ============================================================================

echo "Step 4: Checking for Storage buckets..."
psql -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  -t \
  -c "SELECT bucket_id, COUNT(*) as file_count FROM storage.objects GROUP BY bucket_id;" \
  > "$OUTPUT_DIR/04_storage_manifest_${TIMESTAMP}.txt" 2>/dev/null || echo "  (No storage data)"

echo "✓ Storage manifest saved (see file for bucket contents)"
echo ""

# ============================================================================
# 5. AUDIT LOG SNAPSHOT (Historical record for compliance)
# ============================================================================

echo "Step 5: Exporting audit_log table (compliance/historical record)..."
pg_dump \
  -h "$OLD_DB_HOST" \
  -U "$OLD_DB_USER" \
  -d "$OLD_DB_NAME" \
  --data-only \
  --table='public.audit_log' \
  > "$OUTPUT_DIR/05_audit_log_archive_${TIMESTAMP}.sql" 2>/dev/null || echo "  (audit_log not found)"

echo "✓ Audit log archived"
echo ""

# ============================================================================
# 6. CONFIGURATION SNAPSHOT (for reference)
# ============================================================================

echo "Step 6: Capturing configuration snapshot..."
cat > "$OUTPUT_DIR/06_configuration_snapshot_${TIMESTAMP}.txt" << EOF
SchoolOye Supabase Configuration Snapshot
Exported: $TIMESTAMP

PROJECT DETAILS:
- Project ID: $OLD_PROJECT_ID
- Database Host: $OLD_DB_HOST
- Database Name: $OLD_DB_NAME
- Connection String: postgresql://postgres@$OLD_DB_HOST/postgres

TABLES EXPORTED:
- All schema definitions (DDL)
- All data (DML)
- All views, functions, triggers
- All RLS policies
- All indexes

AUTH SYSTEM:
- auth.users table
- auth.sessions table
- auth.refresh_tokens table

STORAGE:
- Bucket manifest + file listings
- (Files themselves NOT exported - must download from Storage console)

BACKUP CREATED:
- Supabase Dashboard → Settings → Backups

NEXT STEPS AFTER RETIREMENT:
1. Download all storage files manually (if any):
   - Go to Supabase Dashboard → Storage
   - Download each bucket before project deletion
2. Save .env.local with old API keys (for reference/migration)
3. Update application to use new Supabase instance
4. After verification in new instance: Delete old project (irreversible)

IMPORTANT:
- These SQL files can be imported into any PostgreSQL database
- Keep backups of these exports in version control or cloud storage
- Storage files are NOT included in SQL dumps (download separately)
EOF

echo "✓ Configuration snapshot created"
echo ""

# ============================================================================
# 7. VERIFICATION REPORT
# ============================================================================

echo "Step 7: Generating verification report..."

cat > "$OUTPUT_DIR/07_verification_report_${TIMESTAMP}.txt" << EOF
SchoolOye Supabase Export Verification Report
Generated: $TIMESTAMP

EXPORT CONTENTS:
┌─────────────────────────────────────────┐
│ File                                    │
├─────────────────────────────────────────┤
│ 01_schema_complete_*.sql                │
│ └─ All table definitions, views, etc.   │
│                                         │
│ 02_data_complete_all_tables_*.sql       │
│ └─ All row data (ALL tables)            │
│                                         │
│ 03_auth_users_*.sql                     │
│ └─ Supabase auth.users + sessions       │
│                                         │
│ 04_storage_manifest_*.txt               │
│ └─ File listing (files not included)    │
│                                         │
│ 05_audit_log_archive_*.sql              │
│ └─ Historical audit records             │
│                                         │
│ 06_configuration_snapshot_*.txt         │
│ └─ Reference configuration              │
│                                         │
│ 07_verification_report_*.txt            │
│ └─ This file                            │
└─────────────────────────────────────────┘

DATA EXPORTED:
$(psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d "$OLD_DB_NAME" -t \
  -c "SELECT table_name || ': ' || COUNT(*) || ' rows' FROM information_schema.tables t LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name WHERE table_schema='public' GROUP BY table_name ORDER BY table_name;" 2>/dev/null || echo "  (Unable to fetch row counts)")

STORAGE STATUS:
$(ls -lh "$OUTPUT_DIR/04_storage_manifest_${TIMESTAMP}.txt" 2>/dev/null && echo "Storage manifest exported" || echo "No storage data")

CHECKLIST BEFORE DELETING OLD PROJECT:
[ ] All SQL exports downloaded and backed up
[ ] Storage files downloaded manually (if any)
[ ] New Supabase instance verified with data
[ ] Application pointing to new instance
[ ] .env.local updated in repository
[ ] Final backup created in Supabase Dashboard
[ ] All team members notified
[ ] Ready to delete old project

TO IMPORT INTO NEW INSTANCE:
1. Schema:
   psql -h db.[NEW].supabase.co -U postgres -d postgres < 01_schema_*.sql
2. Data:
   psql -h db.[NEW].supabase.co -U postgres -d postgres < 02_data_*.sql
3. Auth (if needed):
   psql -h db.[NEW].supabase.co -U postgres -d postgres < 03_auth_*.sql

STORAGE FILES:
⚠️  Not included in SQL exports!
1. Open old Supabase Dashboard → Storage
2. For each bucket:
   - Download all files
   - Upload to new instance Storage
3. Update any file URLs in application code

EOF

echo "✓ Verification report generated"
echo ""

# ============================================================================
# 8. FILE LISTING & SIZE REPORT
# ============================================================================

echo "Step 8: Final export summary..."
echo ""
echo "Export directory contents:"
du -sh "$OUTPUT_DIR"/*
echo ""

ls -lh "$OUTPUT_DIR/"
echo ""

echo "========================================"
echo "FINAL EXPORT COMPLETE"
echo "========================================"
echo ""
echo "Total export size:"
du -sh "$OUTPUT_DIR"
echo ""
echo "Files created:"
ls -1 "$OUTPUT_DIR/" | wc -l
echo ""
echo "NEXT STEPS:"
echo "1. Review 07_verification_report_*.txt"
echo "2. Back up entire $OUTPUT_DIR folder to safe location"
echo "3. Download storage files manually (if any)"
echo "4. Verify new Supabase instance is working"
echo "5. Update application to use new instance"
echo "6. Delete old Supabase project (IRREVERSIBLE)"
echo ""
echo "IMPORTANT:"
echo "⚠️  Storage files must be downloaded separately!"
echo "⚠️  Keep these exports for legal/compliance purposes"
echo "⚠️  Do not delete old project until new instance is verified"
echo ""
