-- Grants-hardening. DESTRUCTIVE — REVOKE. Do not apply without explicit sign-off.
--
-- Root cause: every table in `public` carries a default ACL (set by both
-- `supabase_admin` and `postgres`) granting anon/authenticated full
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE — a Supabase project-template default
-- that was never revoked. RLS happened to mask the practical impact for most
-- tables (auth.uid()-gated policies correctly return nothing for anon; the
-- schools_public_read-style policies only became a live concern once
-- api.public_schools stopped filtering on status). This closes it now that
-- public-adapter.ts reads ONLY api.* views (see the file's header comment) —
-- anon needs zero raw-table access, and authenticated needs it only on the
-- tables its own auth.uid()-scoped RLS policies exist for.
--
-- anon: revoke everything. Every public-facing read goes through api.* views.
revoke all privileges on
  admission_cycles, admission_notices, alert_deliveries, alert_subscriptions,
  application_orders, applications, audit_log, boards, children, cities,
  class_levels, consents, content_posts, correction_requests, corridors,
  data_quality_flags, districts, documents, enquiries, events, facilities,
  featured_placements, fee_items, field_provenance, form_mappings, invoices,
  landmarks, localities, locality_corridors, locality_neighbors,
  locality_pincodes, ops_tasks, products, profiles, sales_accounts,
  sales_activities, schema_migrations, school_affiliations, school_claims,
  school_facilities, school_identifiers, school_media, school_members,
  school_slug_history, schools, seat_status, shortlists, source_records,
  sources, states, update_reports
from anon;

-- authenticated: revoke everything except the 11 tables with a real
-- auth.uid()-scoped ownership policy (verified via pg_policy — every policy
-- referencing auth.uid() in its USING or WITH CHECK clause). Those 11 keep
-- their existing grant untouched; RLS narrows actual row access per the
-- policy, same pattern as before this migration, just no longer masking a
-- much wider unintended surface.
--
-- Kept for authenticated (no revoke): alert_subscriptions, application_orders,
-- applications, children, consents, documents, enquiries, profiles,
-- school_claims, school_members, shortlists.
revoke all privileges on
  admission_cycles, admission_notices, alert_deliveries, audit_log, boards,
  cities, class_levels, content_posts, correction_requests, corridors,
  data_quality_flags, districts, events, facilities, featured_placements,
  fee_items, field_provenance, form_mappings, invoices, landmarks,
  localities, locality_corridors, locality_neighbors, locality_pincodes,
  ops_tasks, products, sales_accounts, sales_activities, schema_migrations,
  school_affiliations, school_facilities, school_identifiers, school_media,
  school_slug_history, schools, seat_status, source_records, sources,
  states, update_reports
from authenticated;

-- Future tables: `postgres`-owned default ACL currently auto-grants full
-- privileges to anon/authenticated on every new table in public — this is
-- what let the original gap happen and would silently reopen it for any
-- table a future migration (this repo's or the data repo's, if it also
-- connects as `postgres`) creates. Fixed going forward; does not touch
-- existing tables (that's the REVOKEs above).
--
-- NOTE: `supabase_admin`'s own default ACL (a separate, platform-level
-- default, not project SQL) still grants anon/authenticated by default —
-- this migration can't reach that one; flagging as a known residual gap,
-- not something fixable from this repo's migrations.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

-- Legacy public-schema views, superseded by api.public_school_admissions /
-- api.public_seat_status (correct approval gate; public_seat_status here has
-- NONE at all). Confirmed unreferenced anywhere in this repo. Cannot confirm
-- nothing outside this repo (an Edge Function, another service) reads them —
-- that's a call only you can make; drop only if you know that's safe.
drop view if exists public.public_school_admissions;
drop view if exists public.public_seat_status;
