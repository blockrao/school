-- D-119 (Prav, 28 Sep 2026): every admission cycle of a published school is shown
-- exactly as stored, matching 010_public_schools.sql's current rule. `verification`
-- is exposed so the page can label the record, but it gates nothing here — the
-- older per-field approval gate ("Approved" = verification in ('ops_verified',
-- 'school_verified'), formerly D-025) is suspended along with the rest of
-- data-and-trust.md §3's rules 1–5 (see that file for the full list and for how
-- to reinstate gating if D-119 is ever reversed).
--
-- Filters on schools.status = 'published' (the real publishing gate under D-119,
-- same as 010_public_schools.sql) via the join below.
-- Column shape matches the pre-existing public.public_school_admissions view; this
-- moved it into the api schema.
-- Must stay owner-run — see 010_public_schools.sql's header.
--
-- Increment 10 (28 Sep 2026): appended `dob_from`, `dob_to`, `documents_required` for
-- the eligibility checker / admissions-deepening UI. These MUST stay appended after
-- `days_to_close`, not spliced in earlier: `create or replace view` only allows new
-- output columns after the last existing one — Postgres itself rejects (errcode 42P16)
-- an attempt to insert a column before an existing one, since that would rename/shift
-- the existing positional column instead of adding a new one. Keep any future addition
-- to this view appended at the very end for the same reason.
--
-- 29 Sep 2026: appended `cycle_id` — the admissions-lead-capture CTA
-- (20260929070000_admission_leads.sql) needs the cycle's own id to record
-- which class/session an application lead is for; this view previously
-- exposed no primary key at all (a gap already called out in
-- docs/spec/admissions-tracker.md §2).
--
-- 29 Sep 2026 (Activity & Admissions Consolidation, 20260929090000_activity_
-- admissions_v1.sql): appended `city_slug`/`city_name` for the site-wide
-- /admissions discovery page (filter + display), via a left join to `cities`
-- so a school with no city_id still returns a row (null slug/name) rather
-- than being silently dropped. **Drift found and fixed 29 Sep 2026:** this
-- migration was committed but never actually applied to the live database —
-- `publicSchoolAdmissionContract` already required these two fields
-- (non-optional, `.nullable()`), so every row failed to parse: the
-- standalone /admissions page (no error boundary around
-- `listPublicAdmissionCycles()`) 500'd outright, while the school page's own
-- admissions section silently swallowed the same failure and showed "Dates
-- not yet published" even for schools with real, stored cycles. Applied
-- directly against the live DB and reconciled with this file so the two
-- don't drift apart again — same failure class as the `udise_code` P0
-- earlier the same day (docs/ops/implementation-log.md): a contract change
-- shipped ahead of the view it depends on.
create or replace view api.public_school_admissions as
select
  s.id as school_id,
  s.slug,
  s.city_id,
  s.name_en,
  s.name_hi,
  s.tier,
  ac.academic_year,
  ac.class_code,
  ac.status,
  ac.form_mode,
  ac.opens_on,
  ac.closes_on,
  ac.registration_fee,
  ac.form_url,
  ac.last_checked_at,
  ac.verification,
  case when ac.closes_on is not null then ac.closes_on - current_date else null end as days_to_close,
  ac.dob_from,
  ac.dob_to,
  ac.documents_required,
  ac.id as cycle_id,
  c.slug as city_slug,
  c.name_en as city_name
from schools s
join admission_cycles ac on ac.school_id = s.id
left join cities c on c.id = s.city_id
where s.status = 'published';
