-- api.public_school_boards: per-school board affiliation, source-gated like
-- api.public_schools' other official facts (same allowed-source list from that
-- view's header — government/board lists + SchoolOye's own first-party
-- verification; never udise, parent_report, or jaipurcircle_localities).
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
left join sources src on src.id = sa.source_id;
