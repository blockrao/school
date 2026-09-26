-- api.public_teachers: display-safe teacher profiles for the public site and
-- directory. Unlike api.public_schools, this data is self-reported by the
-- teacher at profile-creation time (not ingested via field_provenance), so the
-- trust gate is simply status = 'published' AND is_listed — both set
-- intentionally by the teacher, not an unused manual toggle like
-- schools.status. This view is owner-run (bypasses teachers' own RLS — same
-- note as public_schools applies: must stay created via DATABASE_URL/postgres
-- with rolbypassrls=true), so that filter has to be applied explicitly here;
-- RLS on the base table alone would not reach a query through this view.
create or replace view api.public_teachers as
select
  t.id,
  t.slug,
  t.full_name,
  t.subject,
  t.level,
  t.primary_school_id,
  s.name_en as primary_school_name,
  s.slug as primary_school_slug,
  t.locality_id,
  l.slug as locality_slug,
  l.name_en as locality_name,
  t.headline,
  t.about,
  t.years_teaching,
  t.open_to,
  t.photo_storage_path,
  t.created_at
from teachers t
left join schools s on s.id = t.primary_school_id
left join localities l on l.id = t.locality_id
where t.status = 'published' and t.is_listed;

-- api.public_teacher_experience / api.public_teacher_qualifications: child rows
-- for a public teacher profile, same trust gate (the parent teacher must be
-- published + listed) applied via the join rather than repeated per-row.
create or replace view api.public_teacher_experience as
select
  e.id,
  e.teacher_id,
  e.role_title,
  e.school_id,
  s.name_en as school_name,
  e.school_text,
  e.start_year,
  e.end_year,
  e.sort_order
from teacher_experience e
join teachers t on t.id = e.teacher_id and t.status = 'published' and t.is_listed
left join schools s on s.id = e.school_id;

create or replace view api.public_teacher_qualifications as
select
  q.id,
  q.teacher_id,
  q.title,
  q.detail,
  q.verified_at is not null as verified
from teacher_qualifications q
join teachers t on t.id = q.teacher_id and t.status = 'published' and t.is_listed;

-- Grants were missing entirely for these three views (found in the Sep 2026
-- platform audit) — anon/authenticated had no SELECT at all, so the teacher
-- directory/profile pages were silently broken for every real client.
grant select on api.public_teachers, api.public_teacher_experience, api.public_teacher_qualifications to anon, authenticated;
