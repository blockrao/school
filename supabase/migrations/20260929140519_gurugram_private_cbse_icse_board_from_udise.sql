-- Data enrichment pilot: Gurugram, private, CBSE/ICSE board classification
-- from already-matched UDISE+ data (29 Sep 2026, Prav-requested first pass).
--
-- Context: live-data check this session found only 481 of 8,300 published
-- schools (5.8%) have any board recorded, and 461 of those 481 came from the
-- CBSE SARAS pipeline — which itself has zero Haryana/Gurugram coverage today
-- (447 source_records rows, all Jaipur-scoped; verified live). So SARAS
-- cannot contribute anything to this pass as requested; UDISE+ is the only
-- one of the two named sources ("SARAS or UDISE") with real Gurugram data.
--
-- What UDISE+ already gives us for free: 381 of 390 private (private_unaided/
-- private_aided) Gurugram schools already have a confidence-1.000
-- `udise_direct_lookup` match (source_records.source_id = 5), and each
-- match's `payload->normalized` already carries `board_sec`/`board_high_sec`
-- (e.g. "1-CBSE", "3-ICSE", "2-State Board") — computed at ingestion time but
-- never promoted into `school_affiliations`. This migration promotes exactly
-- that, for exactly the scope Prav specified:
--   - district = Gurugram (district_id 6)
--   - management = private_unaided/private_aided only (excludes the 88
--     'other'-management and 1 central_government row in the district)
--   - board = CBSE or ICSE only (excludes 102 State Board, 4 International
--     Board, 94 with no board recorded, and 1 ambiguous row where
--     board_sec='1-CBSE' but board_high_sec='2-State Board' — left alone
--     rather than guessed)
--
-- board_high_sec is preferred over board_sec where both are present and
-- non-'NA' (a school going up to higher secondary is described by its
-- higher-secondary board; 'NA' there just means the school doesn't offer
-- those classes, not "no board").
--
-- affiliation_no is deliberately left NULL: UDISE+'s Know Your School export
-- records board *type*, not a CBSE/CISCE affiliation *number* — that still
-- requires an actual SARAS (or CISCE) ingestion pass for Haryana, which is
-- out of scope for this pass and flagged separately, not silently guessed.
--
-- Verified before writing this migration: 180 schools match this scope
-- (173 CBSE + 7 ICSE), of which 1 already has a school_affiliations row
-- (left untouched via the NOT EXISTS guard below) — so this inserts 179 new
-- rows. Zero of the 180 are merged (`schools.merged_into`).
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20260929140519_gurugram_private_cbse_icse_board_from_udise.sql --confirm`.

insert into public.school_affiliations (school_id, board_id, affiliation_no, level, source_id)
select
  candidate.school_id,
  case
    when candidate.board_raw ilike '%CBSE%' then 1  -- Central Board of Secondary Education
    when candidate.board_raw ilike '%ICSE%' then 2  -- CISCE (ICSE/ISC)
  end as board_id,
  null as affiliation_no,
  case when candidate.board_source_level = 'board_high_sec' then 'senior_secondary' else 'secondary' end as level,
  5 as source_id -- udise
from (
  select
    s.id as school_id,
    coalesce(
      nullif(sr.payload -> 'normalized' ->> 'board_high_sec', 'NA'),
      sr.payload -> 'normalized' ->> 'board_sec'
    ) as board_raw,
    case
      when nullif(sr.payload -> 'normalized' ->> 'board_high_sec', 'NA') is not null then 'board_high_sec'
      else 'board_sec'
    end as board_source_level
  from public.source_records sr
  join public.schools s on s.id = sr.matched_school_id
  where sr.source_id = 5 -- udise
    and s.district_id = 6 -- Gurugram
    and s.management in ('private_unaided', 'private_aided')
    and s.merged_into is null
) candidate
where (candidate.board_raw ilike '%CBSE%' or candidate.board_raw ilike '%ICSE%')
  and not exists (
    select 1 from public.school_affiliations sa where sa.school_id = candidate.school_id
  );
