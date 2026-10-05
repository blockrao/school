-- Hide the remaining HBSE/State-Board-only secondary schools (5 Oct 2026).
--
-- Context: 20261001050000 removed 1,394 UDISE-sourced HBSE affiliation rows
-- from school_affiliations (Prav: "we should only show cbse and icse") and
-- correspondingly ~1,678 HBSE-only schools are already status='hidden'. But
-- a separate 1,391 published secondary (class 9-12) schools were left
-- published with simply no board shown at all, rather than hidden -- same
-- underlying fact (their only resolvable board is HBSE/State Board per
-- UDISE), inconsistent treatment. Flagged in docs/spec/data-and-trust.md's
-- "Current data scope" note as an open follow-up.
--
-- Resolved today: Prav confirmed SchoolOye is "purely a commercial
-- platform" -- no government/state-board schools, consistent with the
-- "no govt schools, no haryana board schools" scope he'd already stated
-- twice this session. So these 1,391 get the same treatment as the other
-- 1,678: hidden, not left blank.
--
-- Scope (verified before writing, 1,391 rows): status='published',
-- max_class in ('c9','c10','c11','c12'), no CBSE/CISCE affiliation row, and
-- a UDISE source_records match whose board_sec/board_high_sec resolves to
-- '2-State Board'. Deliberately excludes the 5 schools whose UDISE board
-- resolves to 'International Board' (a different, unrelated gap -- not a
-- government/HBSE school, not in scope of this fix) and leaves primary/
-- middle schools (max_class <= c8) untouched, since they structurally have
-- no board exam and were never part of this inconsistency.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261005120000_hide_unshown_hbse_secondary_schools.sql --confirm`.

update public.schools s
set status = 'hidden'
where s.status = 'published'
  and s.max_class in ('c9','c10','c11','c12')
  and not exists (
    select 1 from public.school_affiliations sa
    join public.boards b on b.id = sa.board_id
    where sa.school_id = s.id and b.code in ('CBSE','CISCE')
  )
  and exists (
    select 1 from public.source_records sr
    where sr.matched_school_id = s.id
      and sr.source_id = 5 -- udise
      and coalesce(
            nullif(sr.payload -> 'normalized' ->> 'board_high_sec', 'NA'),
            sr.payload -> 'normalized' ->> 'board_sec'
          ) = '2-State Board'
  );
