-- Canonical URL & Routing Architecture v1 (D-121, docs/spec/urls-and-routing.md §2–§3, §8–§9).
--
-- 1. schools.aliases, schools.merged_into (lifecycle: merged / created in error).
-- 2. school_slug_redirects: alias and retired slugs, so a URL that has represented a
--    school is never reused for another one.
-- 3. mint_school_slug(): collision order bare name → +locality → +city → numeric suffix,
--    lowercase [a-z0-9-], ≤ 60 chars, reserved words rejected.
-- 4. One-time mint of every existing school, oldest first ("first created keeps the
--    shortest form"). This is the first and only mint: after this migration slugs are
--    write-once.
-- 5. Unique index + format check + write-once trigger + mint-on-insert trigger.
--
-- Additive except step 4, which rewrites schools.slug once (no URL was indexed yet:
-- crawlers were first allowed on 28 Sep 2026, D-120). Old URLs keep working because the
-- legacy routes resolve them by school_code / id and 301 to the new slug.

-- 1. Columns ---------------------------------------------------------------------------
alter table public.schools
  add column if not exists aliases text[] not null default '{}',
  add column if not exists merged_into uuid references public.schools(id);

-- 2. Redirect slugs --------------------------------------------------------------------
create table if not exists public.school_slug_redirects (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  school_id uuid not null references public.schools(id),
  reason text not null check (reason in ('alias', 'retired', 'merged')),
  created_at timestamptz not null default now()
);
alter table public.school_slug_redirects enable row level security;

-- 3. Slug rules ------------------------------------------------------------------------
create or replace function public.slugify_60(input text, max_len int default 60)
returns text language sql immutable as $$
  select trim(both '-' from left(case
    when length(s) <= max_len then s
    else regexp_replace(left(s, max_len + 1), '-[^-]*$', '')  -- cut at a word boundary
  end, max_len))
  from (
    select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')) as s
  ) x
$$;

-- Reserved per /school/ root. Mirrors SCHOOL_RESERVED_SLUGS in src/lib/url-rules.ts
-- (a unit test keeps the two lists identical). State, city and locality slugs are
-- reserved dynamically below.
create or replace function public.is_reserved_school_slug(candidate text)
returns boolean language sql stable as $$
  select candidate = any (array[
      'admissions', 'fees', 'teachers', 'new', 'search', 'compare', 'edit', 'claim',
      'index', 'api', 'admin', 'sitemap', 'school', 'schools', 'exams', 'teacher',
      'en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'or', 'as'
    ])
    or candidate ~ '-\d{6}$'                                   -- legacy {slug}-{school_code}
    or candidate ~ '^[0-9a-f]{8}(-|$)'                         -- legacy {uuid}-{slug}
    or exists (select 1 from public.states where slug = candidate)
    or exists (select 1 from public.districts where slug = candidate)
    or exists (select 1 from public.localities where slug = candidate)
$$;

create or replace function public.school_slug_taken(candidate text, self_id uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.schools where slug = candidate and id is distinct from self_id)
      or exists (select 1 from public.school_slug_redirects where slug = candidate)
$$;

create or replace function public.mint_school_slug(p_name text, p_locality_id int, p_district_id int, p_self_id uuid)
returns text language plpgsql stable as $$
declare
  base text := public.slugify_60(p_name);
  loc text;
  city text;
  cand text;
  n int := 2;
  tail text;
begin
  if base = '' then base := 'school'; end if;
  select slug into loc from public.localities where id = p_locality_id;
  select slug into city from public.districts where id = p_district_id;

  -- bare name
  if not public.is_reserved_school_slug(base) and not public.school_slug_taken(base, p_self_id) then
    return base;
  end if;
  -- + locality
  if loc is not null then
    cand := public.slugify_60(base, 59 - length(loc)) || '-' || loc;
    if not public.is_reserved_school_slug(cand) and not public.school_slug_taken(cand, p_self_id) then
      return cand;
    end if;
  end if;
  -- + city
  if city is not null then
    cand := public.slugify_60(base, 59 - length(city)) || '-' || city;
    if not public.is_reserved_school_slug(cand) and not public.school_slug_taken(cand, p_self_id) then
      return cand;
    end if;
    tail := city;
  end if;
  -- numeric suffix on the most specific form
  loop
    cand := case when tail is null
      then public.slugify_60(base, 59 - length(n::text)) || '-' || n
      else public.slugify_60(base, 58 - length(tail) - length(n::text)) || '-' || tail || '-' || n
    end;
    if not public.is_reserved_school_slug(cand) and not public.school_slug_taken(cand, p_self_id) then
      return cand;
    end if;
    n := n + 1;
  end loop;
end
$$;

-- 4. One-time mint, oldest first ----------------------------------------------------------
create index if not exists schools_slug_mint_tmp on public.schools (slug);
update public.schools set slug = 'tmp-' || replace(id::text, '-', '');
do $$
declare r record;
begin
  for r in select id, name_en, locality_id, district_id from public.schools order by created_at, id loop
    update public.schools
       set slug = public.mint_school_slug(r.name_en, r.locality_id, r.district_id, r.id)
     where id = r.id;
  end loop;
end $$;

-- 5. Guards ------------------------------------------------------------------------------
drop index if exists public.schools_slug_mint_tmp;
create unique index if not exists schools_slug_unique on public.schools (slug);
alter table public.schools
  drop constraint if exists schools_slug_format,
  add constraint schools_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60);

create or replace function public.schools_slug_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.slug is null
       or new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.slug) > 60
       or public.is_reserved_school_slug(new.slug)
       or public.school_slug_taken(new.slug, new.id) then
      new.slug := public.mint_school_slug(new.name_en, new.locality_id, new.district_id, new.id);
    end if;
  elsif new.slug is distinct from old.slug then
    raise exception 'schools.slug is write-once (D-121): % → % refused. Rename display_name / add an alias instead.', old.slug, new.slug;
  end if;
  return new;
end
$$;

drop trigger if exists schools_slug_guard on public.schools;
create trigger schools_slug_guard before insert or update of slug on public.schools
  for each row execute function public.schools_slug_guard();
