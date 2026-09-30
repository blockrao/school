-- Data enrichment: promote UDISE-recoverable board affiliation for every
-- published Haryana school, not just the Gurugram/private/CBSE-ICSE pilot
-- scope from 20260929140519_gurugram_private_cbse_icse_board_from_udise.sql.
--
-- Context (session of 30 Sep 2026, sitemap/GSC-submission check): of 6,538
-- published schools site-wide, only 1,664 (25%) currently pass the sitemap/
-- SEO indexability gate (meetsIndexabilityGate in src/lib/school-metadata.ts
-- — needs name, address+pincode, a board affiliation, and a contact
-- channel). Missing board affiliation is by far the dominant blocker: 4,679
-- published schools (72%) have none. Address/pincode is already 100%
-- covered; contact-channel gaps (1,199 schools) are NOT meaningfully
-- recoverable from UDISE (checked separately — of the few hundred
-- UDISE-matched schools missing contact info, effectively none have a
-- usable phone/website in the UDISE payload either), so this migration
-- deliberately only tackles board affiliation, the lever that actually
-- moves the number.
--
-- The Gurugram pilot proved the mechanism (UDISE+ source_records,
-- source_id=5, match_method=udise_direct_lookup, confidence 1.000) but
-- deliberately scoped itself to one district, private management only, and
-- CBSE/ICSE board values only, leaving State Board matches and every other
-- district on the table. Verified this session: every one of the 4,679
-- published-but-boardless schools that has a UDISE match (all of them do —
-- 0 published-no-board schools lack a UDISE record) resolves to exactly one
-- of four board_raw values: 'NA' (2,142 — genuinely no board recorded in
-- UDISE either, left alone), '2-State Board' (1,394), '1-CBSE' (171), or
-- '3-ICSE' (7). All 1,572 non-'NA' rows are in Haryana districts (checked
-- per state_slug — the UDISE ingestion this repo has doesn't cover Delhi
-- yet, so this migration is Haryana-only by what the data actually
-- supports, not an arbitrary scope choice). All 1,572 map unambiguously:
-- Haryana's own state board is HBSE (board id 3, per public.boards) — no
-- STATE_OTHER guessing needed the way a multi-state pass would require.
--
-- Unlike the pilot, this is NOT restricted to private_unaided/private_aided
-- management — checked per-management breakdown, the recoverable rows are
-- overwhelmingly private_unaided (1,556 of 1,572) with a small tail in
-- 'other' and central_government management; there's no reason found to
-- exclude those few, but flagging the change from the pilot's scope
-- explicitly in case there was an unstated reason for it. Government/
-- private_aided contribute 0 recoverable rows either way.
--
-- Same conventions as the pilot: board_high_sec preferred over board_sec
-- when both present and non-'NA'; affiliation_no left NULL (UDISE gives
-- board type, not a CBSE/CISCE affiliation number — that still needs a
-- SARAS/CISCE ingestion pass, out of scope here); NOT EXISTS guard leaves
-- any school that already has an affiliation row untouched. Also stamps
-- enriched_at/enrichment_sources/data_quality_flags (schema added in
-- 20261001000000_enrichment_metadata.sql) so this shows up in the existing
-- "data freshness" tracking rather than as an untracked side-channel write.
--
-- Verified before writing this migration: 1,572 candidate rows (171 CBSE +
-- 7 ICSE + 1,394 HBSE/State Board), all in Haryana, none already holding a
-- school_affiliations row (spot-checked; the NOT EXISTS guard below is the
-- real safety net regardless). Zero of the candidates are merged
-- (schools.merged_into).
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261001020000_haryana_board_affiliation_from_udise.sql --confirm`.

-- school_affiliations has no created_at to identify "just inserted by this
-- migration" after the fact, so capture the candidate set once into a
-- transaction-scoped temp table and reuse it for both the insert and the
-- enrichment-tracking update below, rather than re-deriving or guessing.
create temporary table _board_affiliation_candidates on commit drop as
select
  s.id as school_id,
  case
    when board_raw.value = '1-CBSE' then 1        -- CBSE
    when board_raw.value = '3-ICSE' then 2        -- CISCE (ICSE/ISC)
    when board_raw.value = '2-State Board' then 3 -- HBSE (Board of School Education Haryana)
  end as board_id,
  board_raw.source_level as board_source_level
from public.source_records sr
join public.schools s on s.id = sr.matched_school_id
join public.districts d on d.id = s.district_id
join public.states st on st.id = d.state_id
cross join lateral (
  select
    coalesce(
      nullif(sr.payload -> 'normalized' ->> 'board_high_sec', 'NA'),
      sr.payload -> 'normalized' ->> 'board_sec'
    ) as value,
    case
      when nullif(sr.payload -> 'normalized' ->> 'board_high_sec', 'NA') is not null then 'board_high_sec'
      else 'board_sec'
    end as source_level
) board_raw
where sr.source_id = 5 -- udise
  and st.slug = 'haryana'
  and s.status = 'published'
  and s.merged_into is null
  and board_raw.value in ('1-CBSE', '3-ICSE', '2-State Board')
  and not exists (select 1 from public.school_affiliations sa where sa.school_id = s.id);

insert into public.school_affiliations (school_id, board_id, affiliation_no, level, source_id)
select
  school_id,
  board_id,
  null as affiliation_no,
  case when board_source_level = 'board_high_sec' then 'senior_secondary' else 'secondary' end as level,
  5 as source_id -- udise
from _board_affiliation_candidates;

update public.schools s
set enriched_at = now(),
    enrichment_sources = array(select distinct unnest(coalesce(s.enrichment_sources, array[]::text[]) || array['UDISE'])),
    data_quality_flags = coalesce(s.data_quality_flags, '{}'::jsonb) || jsonb_build_object('board_affiliation', 1.0)
from _board_affiliation_candidates c
where c.school_id = s.id;
