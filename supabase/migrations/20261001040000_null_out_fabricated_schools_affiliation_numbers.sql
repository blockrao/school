-- Null out fabricated schools.affiliation_number / board data (1 Oct 2026)
--
-- Audit (session of 30 Sep 2026, prompted by "why do not i still see the
-- affiliation" for Lord Ganesha Vidya Peeth Kheri Gujjar, Sonipat) found that
-- public.schools carries its own denormalized affiliation_number, board,
-- affiliation_prefix, affiliation_source_url, cbse_affiliation_verified
-- columns, alongside the normalized public.school_affiliations table. No
-- migration file in this repo creates these five columns (confirmed by
-- grepping supabase/migrations/ and the baseline) -- they were added to the
-- live database directly, outside the tracked migration system, at an
-- unknown point before 30 Sep 2026.
--
-- 8,758 rows have affiliation_number populated. Only 10 are
-- cbse_affiliation_verified = true. The other 8,748 -- the same figure
-- claimed "100% coverage, COMPLETED" in a fabricated report found in an old
-- session scratchpad -- were audited against every real source we have:
--
--   enrichment_sources        rows   checked against              result
--   ['UDISE']                 5,805  school_affiliations + real    0 match, 20
--                                    saras_archive rows where      directly
--                                    one exists (3,956 do)         contradict,
--                                                                  rest have
--                                                                  no real
--                                                                  affiliation
--                                                                  row at all
--   ['DELHI_DOE']              1,447  source_records.payload for   raw payload
--                                     the matching source_id       has no
--                                                                   affiliation
--                                                                   number
--                                                                   field at
--                                                                   all (it's
--                                                                   an edudel
--                                                                   admission-
--                                                                   criteria
--                                                                   list: name/
--                                                                   address/
--                                                                   edudel_
--                                                                   school_id
--                                                                   only)
--   ['CBSE_SARAS_ARCHIVE']       262  school_affiliations rows     261 of 262
--   (incl. +DELHI_DOE combo)          sourced from the real,       directly
--                                     verified SARAS archive for   contradict
--                                     the same school_id           the real,
--                                                                  verified
--                                                                  value; 1
--                                                                  matches
--   null (no source recorded)   1,241  no enriched_at, no          untraceable
--                                      enrichment_sources entry    entirely
--
-- i.e. every bucket independently confirms these are fabricated: either
-- entirely unsupported by any real source payload, or directly wrong even
-- when we hold the real, verified answer for the exact same school. The
-- Lord Ganesha Vidya Peeth example that triggered this audit is typical:
-- affiliation_number 500004, board CBSE, source "UDISE" -- while UDISE's own
-- page for that school (kys.udiseplus.gov.in) shows "Board: Not yet
-- published", and UDISE+ doesn't carry CBSE affiliation numbers at all (see
-- 20261001020000_haryana_board_affiliation_from_udise.sql's own header:
-- "UDISE gives board type, not a CBSE/CISCE affiliation number").
--
-- No user-facing harm today: api.public_school_boards (db/views/
-- 046_public_school_boards.sql) reads only from public.school_affiliations,
-- with an explicit "never udise" source allowlist in its own header comment,
-- so none of this fabricated data has ever surfaced on the public site. And
-- 20260930160000_drop_dead_schools_indexes.sql already found and documented
-- that idx_schools_affiliation_prefix was "populated on 8,758 rows, never
-- filtered by anywhere -- board-affiliation lookups go through the
-- normalized school_affiliations table instead" -- i.e. these columns are
-- dead weight for querying, confirmed independently before this audit even
-- started. The risk is entirely downstream: any future migration, export,
-- ops tooling, or automated pipeline that trusts schools.affiliation_number
-- at face value (the way the old scratchpad's fabricated "EXECUTION
-- COMPLETED" reports did) would silently launder invented CBSE affiliation
-- numbers as real data.
--
-- Fix: null out affiliation_number / board / affiliation_prefix /
-- affiliation_source_url for every row where cbse_affiliation_verified is
-- not true, and set cbse_affiliation_verified = null (not false) so a
-- future genuine attempt isn't misread as "already checked and rejected".
-- The 10 verified=true rows are left untouched. enriched_at /
-- enrichment_sources / data_quality_flags are left as-is -- they also cover
-- legitimate fields (principal_name, address components, school_category)
-- that this audit did not find fabricated, and rewriting them is out of
-- scope here.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261001040000_null_out_fabricated_schools_affiliation_numbers.sql --confirm`.

update public.schools
set
  affiliation_number = null,
  board = null,
  affiliation_prefix = null,
  affiliation_source_url = null,
  cbse_affiliation_verified = null
where affiliation_number is not null
  and coalesce(cbse_affiliation_verified, false) = false;
