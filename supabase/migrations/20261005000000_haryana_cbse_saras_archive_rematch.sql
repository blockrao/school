-- "Haryana CBSE re-match" (5 Oct 2026) — scoped investigation, not the large
-- recovery operation the name implied.
--
-- Context: after 20261001050000 removed the 1,394 UDISE-sourced HBSE (state
-- board) affiliations (Prav: "we should only show CBSE and ICSE"), this was
-- flagged as a deferred follow-up to re-match Haryana schools against real
-- CBSE sources, in case some of the removed-HBSE schools are actually CBSE.
--
-- Checked the two CBSE-specific sources this repo has for Haryana:
--   - source 11 (saras_archive, CBSE's own SARAS directory, archived):
--     432 records total, 376 already matched; of the 114 matched-in-Haryana
--     rows, all 114 already have a school_affiliations row (113 with a real
--     number) -- this source was already ~99% exploited before this pass.
--   - source 4 (saras): all unmatched rows are Jaipur/Rajasthan, not Haryana
--     -- irrelevant here.
-- Of saras_archive's 56 still-unmatched records, fuzzy-matched (pg_trgm,
-- same district, name similarity) against Haryana schools: 8 resolve to a
-- published school that does NOT already have a real affiliation number --
-- and every one of those 8 is a school that already carries board_id=1
-- (CBSE) with affiliation_no NULL and source_id NULL (pre-existing, origin
-- untracked). So this doesn't change which schools are tagged CBSE or pass
-- the indexability gate (board already present) -- it only fills in the
-- real affiliation number + validity window for 8 schools that were
-- already CBSE-tagged, upgrading their provenance from untracked to
-- saras_archive.
--
-- Also checked separately (source 12, haryana_edu_2026_ext): this is NOT a
-- CBSE source -- it's the Haryana Dept of School Education's own HBSE
-- provisional-affiliation-extension list, and its payload is explicitly
-- marked "internal/administrative use only, never publish" by whoever
-- ingested it. Correctly has zero school_affiliations rows from it; left
-- alone.
--
-- Caught and corrected one false match before writing this: pg_trgm's top
-- pick for source_record 7693 ("S.r.convent School", aff 531201, village &
-- sub-tehsil Mohna, Faridabad) was "S.r.s. Convent School" (hidden, address
-- Uncha Gaon, board already HBSE) -- same sim=1.00 trigram score, but a
-- different website domain (srsconventschool.com vs srconventschool.com)
-- and a different address entirely, so that candidate is a different school
-- with a merely similar name, not a conflict. The real match, found by
-- searching schools at the same pincode for the address/website instead of
-- trusting the top trigram hit: "S.r. Convent School, Mohna" (e99d2dd5-
-- 39cf-4b9f-9e2a-9c37b269df1f) -- published, website
-- www.srconventschoolmohna.com, address "Village and Sub Tehsil-Mohna" --
-- an exact match, already CBSE-tagged with no number, same pattern as the
-- other 7. Included below as the 8th row; "S.r.s. Convent School" is
-- untouched (correctly, its HBSE tag was never in question).
--
-- One record (source_record 7639, "International Bharti School", aff
-- 530316) has affiliation_valid_to = 2026-03-31, already past as of this
-- migration (5 Oct 2026) in the archived SARAS snapshot -- schools normally
-- renew before expiry and a web-archive crawl is a point-in-time copy, not
-- live SARAS, so this is inserted like the others rather than dropped, but
-- the stale window is carried into valid_to rather than hidden (D-026) --
-- re-verify if this school's entity page needs the affiliation to read as
-- current.
--
-- NOT exists-guarded on affiliation_no specifically (not just any row),
-- since the point is to fill in a number these schools' existing CBSE row
-- is missing, not to skip them for already having *a* row. Matched by
-- school_id (not a NOT EXISTS subquery) so the same UPDATE is idempotent
-- -- re-running it after affiliation_no is set is a no-op.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261005000000_haryana_cbse_saras_archive_rematch.sql --confirm`.

update public.school_affiliations sa
set affiliation_no = v.aff_no,
    valid_from = v.valid_from::date,
    valid_to = v.valid_to::date,
    source_id = 11 -- saras_archive
from (values
  ('3eff97a2-dd1d-4ab6-b343-f934391f39a6'::uuid, '580002', '2026-04-01', '2031-03-31'), -- Army Public School, Ambala
  ('f88610cb-28db-4eb3-a65c-630a41ba5a59'::uuid, '531479', '2025-04-01', '2030-03-31'), -- Jan Sewa Sansthan Public School, Rohtak
  ('7c13b14d-8758-42bf-b499-e2d84676f924'::uuid, '531668', '2024-04-01', '2029-03-31'), -- S.L. International School, Bhiwani
  ('8782fd9a-f3cd-4e4a-a960-41a5be6693f3'::uuid, '530316', '2021-04-01', '2026-03-31'), -- International Bharti School, Rohtak (valid_to already past -- see header)
  ('a3d6b12f-115e-4e5f-90f8-ca81622b1fdf'::uuid, '530516', '2023-04-01', '2028-03-31'), -- Balaji Public School, Faridabad
  ('e8fa55f0-8995-472e-b0fc-1be8cc67e621'::uuid, '531526', '2023-04-01', '2028-03-31'), -- Blue Angels Global School, Faridabad
  ('1026bfb2-b4bb-4076-929b-de3fda779727'::uuid, '530063', '2023-04-01', '2030-03-31'), -- University Campus School, Rohtak
  ('e99d2dd5-39cf-4b9f-9e2a-9c37b269df1f'::uuid, '531201', '2025-04-01', '2030-03-31')  -- S.R. Convent School, Mohna, Faridabad
) as v(school_id, aff_no, valid_from, valid_to)
where sa.school_id = v.school_id
  and sa.board_id = 1 -- CBSE
  and sa.affiliation_no is null;

-- Bookkeeping: mark these saras_archive source_records as matched (8 just
-- backfilled above, plus 7700 -- its school already had the identical
-- number 531248 via source 4/saras, so no data change, just closing the
-- "unmatched" gap that made this record surface as a candidate at all).
-- match_method follows this table's existing "fuzzy_name_*" naming
-- convention; confidence is the pg_trgm similarity() score behind each
-- match for the 7 trigram-only matches (1.00 exact, 0.86 near-exact), and
-- is set to 1.00 for 7693 since that match was confirmed by address/website,
-- not by its (misleading) trigram score.
update public.source_records sr
set matched_school_id = v.school_id,
    match_method = 'fuzzy_name_district',
    match_confidence = v.confidence
from (values
  (7607, '1026bfb2-b4bb-4076-929b-de3fda779727'::uuid, 0.86),
  (7639, '8782fd9a-f3cd-4e4a-a960-41a5be6693f3'::uuid, 1.00),
  (7656, 'a3d6b12f-115e-4e5f-90f8-ca81622b1fdf'::uuid, 1.00),
  (7693, 'e99d2dd5-39cf-4b9f-9e2a-9c37b269df1f'::uuid, 1.00),
  (7700, '92df06ad-fec1-43f6-9e19-f7c0c7cd6264'::uuid, 1.00),
  (7718, 'e8fa55f0-8995-472e-b0fc-1be8cc67e621'::uuid, 1.00),
  (7719, 'f88610cb-28db-4eb3-a65c-630a41ba5a59'::uuid, 1.00),
  (7730, '7c13b14d-8758-42bf-b499-e2d84676f924'::uuid, 1.00),
  (7762, '3eff97a2-dd1d-4ab6-b343-f934391f39a6'::uuid, 1.00)
) as v(source_record_id, school_id, confidence)
where sr.id = v.source_record_id;
