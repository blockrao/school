# Requests for the database agent

Written by the frontend repo (SchoolOye web) — we don't have write access to the
schema and shouldn't; everything below is a request with ready-to-run SQL for you to
review and apply. Context: `docs/data-coverage-2026-09.md` found that `anon` currently
has a blanket `GRANT SELECT ON ALL TABLES` (including `audit_log`, `sales_accounts`,
`sales_activities`, `ops_tasks`, `data_quality_flags`, `source_records`, `children`,
`profiles`, `consents`). RLS empirically blocks all of them today, but it's the *only*
layer doing so — a single policy bug would fully expose any of those tables. This
request tightens grants to match what RLS actually intends, derived from the real
policies (queried via `pg_policies`, not guessed).

## (a) Grant hardening

One-line rationale per block. RLS stays exactly as-is — this only removes the
grant-level over-exposure sitting on top of it.

```sql
-- Start from zero: nothing is reachable except what's explicitly re-granted below.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- anon: pure reference tables. Every one of these already has an unconditional
-- `USING (true)` SELECT policy and holds no sensitive columns (id/name/slug lookup
-- data for dropdowns, breadcrumbs, filters) -- revoking these would break the UI
-- for no security benefit, so they're granted directly rather than through a view.
GRANT SELECT ON boards, cities, class_levels, districts, facilities, localities, products, states TO anon;

-- anon: the new views from (b) below, never their base tables directly.
GRANT SELECT ON public_schools, public_school_facts, public_districts TO anon;

-- authenticated: full CRUD only on tables where a real ALL policy (owner or staff)
-- exists -- RLS still gates every row, this just stops the grant itself being wider
-- than any policy needs.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  admission_cycles, admission_notices, alert_deliveries, alert_subscriptions,
  application_orders, applications, boards, children, cities, class_levels,
  consents, content_posts, correction_requests, data_quality_flags, districts,
  documents, facilities, featured_placements, fee_items, form_mappings, invoices,
  localities, ops_tasks, products, profiles, sales_accounts, sales_activities,
  school_affiliations, school_facilities, school_identifiers, school_media,
  school_members, school_slug_history, schools, seat_status, shortlists, sources,
  source_records, states
TO authenticated;

-- enquiries, school_claims: policies are INSERT-your-own + staff-UPDATE, never an
-- owner UPDATE/DELETE -- narrower than the blanket ALL list above.
GRANT SELECT, INSERT ON enquiries, school_claims TO authenticated;
GRANT UPDATE ON enquiries, school_claims TO authenticated; -- staff-only via RLS, but the operation exists

-- audit_log: policy technically says ALL for staff, but an audit log that staff can
-- UPDATE/DELETE isn't really an audit log. Recommend narrowing the grant regardless
-- of what the policy allows -- flagging as a policy smell, not just a grant one.
GRANT SELECT, INSERT ON audit_log TO authenticated;

-- events, update_reports: policies allow an unauthenticated INSERT (issue reports /
-- analytics events), staff-only SELECT.
GRANT INSERT ON events, update_reports TO anon;
GRANT SELECT, INSERT ON events, update_reports TO authenticated;

-- field_provenance: staff ALL per policy, but the ingestion pipeline (which does the
-- real writes) uses the service-role key and bypasses grants entirely -- humans
-- reviewing provenance shouldn't need UPDATE/DELETE on history. Recommend SELECT,
-- INSERT only; confirm this doesn't break a staff workflow that actually edits
-- provenance rows directly.
GRANT SELECT, INSERT ON field_provenance TO authenticated;

-- Sequences: INSERT above needs nextval() on serial/identity PKs.
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Functions RLS policies call: both anon (via the public views, which still run RLS
-- as the querying role) and authenticated need EXECUTE, or every policy above fails
-- with "permission denied for function" instead of just returning no rows.
GRANT EXECUTE ON FUNCTION is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_school_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

-- claude_ro (our read-only terminal role, see docs/data-coverage-2026-09.md): give it
-- the same public surface as anon, so read-only analysis from our side stops
-- returning empty results the moment a fact is actually publishable. It currently
-- sees 0 rows on `schools` and everything joined to it, since it has no Supabase auth
-- session and no school is published yet -- this blocks work like ranking districts
-- by data completeness, which needs real row counts, not just schema metadata.
GRANT SELECT ON boards, cities, class_levels, districts, facilities, localities, products, states TO claude_ro;
GRANT SELECT ON public_schools, public_school_facts, public_districts TO claude_ro;

-- Future tables/sequences/functions inherit this posture instead of defaulting open.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
```

### Verification block

Run after applying, as a sanity check that the grants landed as intended:

```sql
SET ROLE anon;
-- Expect a real "permission denied" error on each of these, not an empty result --
-- confirms the *grant* is gone, not just that RLS happens to return nothing today.
SELECT count(*) FROM audit_log;
SELECT count(*) FROM sales_accounts;
SELECT count(*) FROM ops_tasks;
SELECT count(*) FROM data_quality_flags;
SELECT count(*) FROM source_records;
SELECT count(*) FROM field_provenance;
SELECT count(*) FROM children;
SELECT count(*) FROM profiles;
SELECT count(*) FROM schools; -- also expect denied -- anon reads schools only via public_schools now

-- Expect these to succeed (reference tables + views)
SELECT count(*) FROM states;
SELECT count(*) FROM public_schools;
SELECT count(*) FROM public_districts;
RESET ROLE;
```

## (b) Public views

```sql
CREATE OR REPLACE VIEW public_schools AS
SELECT
  id, slug, name_en, name_hi, management, gender, medium, min_class, max_class,
  address, pincode, location, geocode_precision, website, phone, email,
  established_year, tier, verification, claim, last_verified_at, about_en, about_hi,
  district_id, city_id, locality_id
FROM schools
WHERE status = 'published';
-- Excludes: status (constant 'published' in this view by definition), name_search
-- (internal tsvector), completeness (internal scoring metric), next_check_due
-- (internal ops scheduling), created_at/updated_at (internal audit timestamps).

CREATE OR REPLACE VIEW public_school_facts AS
SELECT
  fp.entity_id AS school_id,
  fp.field,
  fp.value,
  src.name AS source_name,
  fp.evidence_url AS source_url,
  fp.created_at AS retrieved_at,
  fp.verified_at
FROM field_provenance fp
JOIN schools s ON s.id = fp.entity_id
LEFT JOIN sources src ON src.id = fp.source_id
WHERE fp.entity_table = 'schools' AND s.status = 'published';
-- "Source edition/year" was asked for but isn't a column that exists anywhere in the
-- current schema (sources has name/base_url/trust_rank, source_records has
-- fetched_at but that table is meant to stay hidden per the never-expose list).
-- Used field_provenance.created_at as "retrieved_at" instead -- when our system
-- recorded this specific fact, which is the closest real analog. If "edition/year"
-- means something more specific (e.g. which year's fee prospectus), that isn't
-- modeled anywhere yet and would need a real column -- confirm whether that's needed
-- or if retrieved_at covers the intent.

CREATE OR REPLACE VIEW public_districts AS
SELECT
  st.name_en AS state,
  d.name_en AS district,
  d.slug,
  count(s.id) AS school_count
FROM districts d
JOIN states st ON st.id = d.state_id
LEFT JOIN schools s ON s.district_id = d.id AND s.status = 'published'
GROUP BY st.name_en, d.name_en, d.slug;
```

Note found while writing this: `districts` currently has duplicate rows under
inconsistent casing for the same real district (e.g. `Yamunanagar` vs
`YAMUNA NAGAR`, `Sonipat` vs `SONEPAT`, `Mahendragarh` vs `MOHINDERGARH`, `Nuh Mewat`
vs `NUH`) — splits 82 schools across the wrong district row and will make
`public_districts.school_count` look wrong for those four districts specifically until
reconciled. Full detail in `docs/data-coverage-2026-09.md`.

## (c) Please confirm

The ingestion/enrichment pipeline that writes `schools`/`field_provenance`/etc. — does
it authenticate with the `service_role` (secret) key? If so, none of the grant changes
in (a) affect it (`service_role` bypasses RLS and grants entirely). Please confirm
explicitly rather than us assuming, since if the pipeline is somehow running as
`anon`/`authenticated` today, tightening those grants would break ingestion.
