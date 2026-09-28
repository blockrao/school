-- Teacher public ID + canonical URL (D-125, Prav 28 Sep 2026).
--
-- A teacher gets a public URL only when they register (a teachers row is only
-- ever created by the registration flow). The URL is
--   /teacher/{first-middle-last}-{teacher_code}
-- teacher_code: random 5-digit public ID, unique, never reused, never changed;
-- it is the teacher's ID shown to them. The page resolves by teacher_code, so a
-- name correction changes the name part and the old URL 301s to the new one.
-- Capacity: 90,000 five-digit codes; once 80% are taken, new codes are 6 digits
-- (existing codes never change).

alter table public.teachers add column if not exists teacher_code integer;

create or replace function public.mint_teacher_code()
returns integer language plpgsql volatile as $$
declare
  used int;
  lo int := 10000;
  hi int := 99999;
  code int;
begin
  select count(*) into used from public.teachers where teacher_code between 10000 and 99999;
  if used >= 72000 then lo := 100000; hi := 999999; end if;
  loop
    code := lo + floor(random() * (hi - lo + 1))::int;
    exit when not exists (select 1 from public.teachers where teacher_code = code);
  end loop;
  return code;
end
$$;

-- Name part: the registered full name (first middle last), URL-safe, leaving room
-- for "-{code}" within the 60-character slug limit.
create or replace function public.teacher_slug(p_full_name text, p_code integer)
returns text language sql immutable as $$
  select coalesce(nullif(public.slugify_60(
           regexp_replace(coalesce(p_full_name, ''), '[''’`]', '', 'g'),
           59 - length(p_code::text)), ''), 'teacher') || '-' || p_code
$$;

create or replace function public.teachers_code_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.teacher_code := public.mint_teacher_code();
  elsif new.teacher_code is distinct from old.teacher_code then
    raise exception 'teachers.teacher_code is permanent (D-125): % -> % refused', old.teacher_code, new.teacher_code;
  end if;
  new.slug := public.teacher_slug(new.full_name, new.teacher_code);
  return new;
end
$$;

-- Backfill existing registered teachers, then lock it down.
update public.teachers set teacher_code = public.mint_teacher_code() where teacher_code is null;
update public.teachers set slug = public.teacher_slug(full_name, teacher_code);
alter table public.teachers alter column teacher_code set not null;
create unique index if not exists teachers_teacher_code_unique on public.teachers (teacher_code);
create unique index if not exists teachers_slug_unique on public.teachers (slug);

drop trigger if exists teachers_code_guard on public.teachers;
create trigger teachers_code_guard before insert or update of full_name, teacher_code, slug on public.teachers
  for each row execute function public.teachers_code_guard();
