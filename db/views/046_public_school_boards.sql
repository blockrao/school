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
  src.name as source,
  null::timestamptz as checked_at
from school_affiliations sa
join boards b on b.id = sa.board_id
left join sources src on src.id = sa.source_id
where sa.source_id in (1, 2, 4, 6, 7, 8, 9, 11, 12);
