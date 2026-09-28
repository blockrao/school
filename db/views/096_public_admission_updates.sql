-- api.public_admission_updates: safe public projection of `audit_log`, for the
-- "Recent admission updates" section of the canonical school page (Increment 10).
--
-- `audit_log` is a generic, cross-table audit trail (actor, before/after row
-- snapshots, keyed by entity_table/entity_id) with no RLS or public grant of its own,
-- and it never gets one — this view is the only public exposure of any of it, and it
-- is scoped narrowly:
--   - entity_table = 'admission_cycles' only. `schools`' own audit trail (159k+ rows,
--     mostly bulk-import churn) is structurally excluded, not just filtered client-side.
--   - only a 4-field allowlist is ever extracted from the `before`/`after` jsonb:
--     status, opens_on, closes_on, results_on. The raw jsonb blobs are read inside the
--     `allowlisted` CTE but never selected into the view's output — no other field,
--     however innocuous-looking, is exposed without a deliberate, separate change to
--     this file. `form_url` was in an earlier draft and was deliberately dropped
--     before this went live (Prav, 28 Sep 2026) — the "recent updates" feed doesn't
--     need it for v1; add it back explicitly if the product later needs an
--     "application link changed" line.
--   - `actor`/`actor_role` are never read or exposed — this is a school-page-facing
--     feed, not an internal ops audit view.
--   - a row is dropped entirely if none of the 4 allowlisted fields actually changed
--     (e.g. a bare `updated_at`-only touch) via the `array_length(...) > 0` filter, so
--     this can never become a raw import-churn timeline.
--   - date fields are extracted with `NULLIF(x, '')::date` rather than a bare `::date`
--     cast, so a malformed/empty string in the audit JSON can't fail the whole view.
--   - joins through `admission_cycles`/`schools` and filters `schools.status =
--     'published'` (same D-119 gate as every other public view) — an update on a
--     cycle belonging to an unpublished school never surfaces here.
create or replace view api.public_admission_updates as
with allowlisted as (
  select al.id as audit_id, al.entity_id as cycle_id, al.action, al.at as occurred_at,
         al.before, al.after
  from audit_log al
  where al.entity_table = 'admission_cycles'
    and al.action in ('INSERT', 'UPDATE')
),
diffed as (
  select audit_id, cycle_id, action, occurred_at,
    array_remove(array[
      case when action = 'INSERT' or (before->>'status') is distinct from (after->>'status') then 'status' end,
      case when action = 'INSERT' or (before->>'opens_on') is distinct from (after->>'opens_on') then 'opens_on' end,
      case when action = 'INSERT' or (before->>'closes_on') is distinct from (after->>'closes_on') then 'closes_on' end,
      case when action = 'INSERT' or (before->>'results_on') is distinct from (after->>'results_on') then 'results_on' end
    ], null) as changed_fields,
    (after->>'status') as new_status,
    nullif(after->>'opens_on', '')::date as new_opens_on,
    nullif(after->>'closes_on', '')::date as new_closes_on,
    nullif(after->>'results_on', '')::date as new_results_on
  from allowlisted
)
select
  d.audit_id, d.cycle_id, s.id as school_id, s.slug as school_slug, s.name_en as school_name,
  ac.academic_year, ac.class_code,
  case d.action when 'INSERT' then 'created' else 'updated' end as change_type,
  d.occurred_at, d.changed_fields,
  d.new_status, d.new_opens_on, d.new_closes_on, d.new_results_on
from diffed d
join admission_cycles ac on ac.id = d.cycle_id
join schools s on s.id = ac.school_id
where s.status = 'published'
  and array_length(d.changed_fields, 1) > 0;

grant select on api.public_admission_updates to anon, authenticated;
