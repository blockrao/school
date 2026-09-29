-- Identity & Search Presence Foundation v1 — ID-03/ID-04 (29 Sep 2026).
--
-- First-class UDISE+ identifier on `schools`, promoted out of
-- `field_provenance`/`source_records` rather than left buried in jsonb.
-- Rationale (see docs/ops/implementation-log.md, same session): the codebase
-- already treats CBSE affiliation as a first-class identity fact
-- (school_affiliations.affiliation_no, surfaced in JSON-LD's `identifier`),
-- but UDISE+ — the source actually covering 6,914 schools, i.e. most of the
-- corpus, all at match_confidence 1.000 via udise_direct_lookup — has no
-- equivalent resolvable column. That's a real identity-resolution gap, not
-- cosmetic: a stable external ID is what lets a future source record be
-- re-matched against a school reliably instead of re-running fuzzy
-- name/address matching every time.
--
-- Backfilled only from confidence-1.000, non-fuzzy udise matches
-- (match_method = 'udise_direct_lookup') — never from a fuzzy match, per the
-- "no silent fuzzy matching into an identifier field" rule. Verified before
-- writing this migration: zero duplicate udise codes across schools and zero
-- schools with >1 udise code in the live data, so the unique index is safe.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20260929100000_school_udise_identity.sql --confirm`.

alter table public.schools
  add column if not exists udise_code text;

comment on column public.schools.udise_code is
  'UDISE+ school code (Government of India), e.g. "06010100122". Promoted from '
  'source_records.external_id (source=udise, match_confidence=1.000) — see '
  '20260929100000_school_udise_identity.sql for why this is a real column '
  'rather than left inside field_provenance.';

update public.schools s
set udise_code = split_part(sr.external_id, ':', 2)
from public.source_records sr
join public.sources src on src.id = sr.source_id
where src.code = 'udise'
  and sr.match_confidence = 1.000
  and sr.match_method = 'udise_direct_lookup'
  and sr.matched_school_id = s.id
  and s.udise_code is null;

create unique index if not exists schools_udise_code_key
  on public.schools (udise_code)
  where udise_code is not null;
