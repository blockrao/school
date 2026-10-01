-- api.public_school_boards: per-school board affiliation.
--
-- Board allowlist (Prav, 30 Sep 2026, re: Happy HS Bhiwani showing HBSE):
-- the site only ever surfaces CBSE and CISCE (ICSE) affiliations, never a
-- state board. This was previously an unenforced claim in this view's
-- header comment ("source-gated ... never udise") with no actual WHERE
-- clause behind it — api.public_schools' own header (010_public_schools.sql)
-- notes its equivalent field-source filtering was removed on 28 Sep, so the
-- claim here was stale even before this fix. It surfaced concretely when
-- 20261001020000_haryana_board_affiliation_from_udise.sql (applied directly,
-- bypassing the migration --confirm gate — see supabase/migrations/
-- 20261001050000_remove_unauthorized_hbse_affiliations.sql) added 1,394
-- Haryana State Board (HBSE) rows sourced from UDISE board-type data, and
-- this view had nothing stopping them from displaying. That migration's
-- HBSE rows are deleted outright (see the companion migration above), and
-- this board_code allowlist is the permanent guard against any board other
-- than CBSE/CISCE reaching the public site again, regardless of source.
--
-- checked_at is always null today: field_provenance only ever tracks
-- entity_table='schools' (confirmed by direct query), never per-affiliation
-- provenance — there is nothing real to source a date from yet. Exposed as a
-- column anyway (not omitted) so the shape is forward-compatible once that
-- tracking exists, rather than needing a breaking view change later.
create or replace view api.public_school_boards as
select
  sa.school_id,
  b.id as board_id,
  b.name_en as board_name,
  b.code as board_code,
  sa.affiliation_no,
  case src.code
    when 'saras' then 'CBSE affiliation record (SARAS)'
    when 'saras_archive' then 'CBSE affiliation record (SARAS)'
    when 'cisce' then 'CISCE school list'
    when 'rajpsp' then 'Rajasthan education department'
    when 'haryana_edu' then 'Haryana education department'
    when 'haryana_edu_2026_ext' then 'Haryana education department'
    when 'delhi_doe' then 'Delhi Directorate of Education'
    when 'school_portal' then 'Verified by school'
    when 'ops_call' then 'Confirmed with school by phone'
    else src.name
  end as source,
  null::timestamptz as checked_at
from school_affiliations sa
join boards b on b.id = sa.board_id
left join sources src on src.id = sa.source_id
where b.code in ('CBSE', 'CISCE');
