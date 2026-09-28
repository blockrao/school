-- One-time school name clean-up + final slug re-mint (D-123, Prav 28 Sep 2026).
-- Crawlers were first allowed on 28 Sep and the first sitemaps went live the same
-- day, so this is the last point where slugs can be regenerated. After this
-- migration slugs are write-once again (D-121 §3).
--
-- Deliberately conservative: only unambiguous source-export artefacts and
-- misspelt generic English words are corrected. Proper nouns (people, places,
-- trusts) are never "corrected" — fuzzy matching showed legitimate names
-- (Sharma, Goyal, Ajanta, Mangal) that look like typos.

-- 1. Display-name fixes ------------------------------------------------------------------
create or replace function public.fix_school_display_name(input text)
returns text language plpgsql immutable as $$
declare
  s text := input;
  r record;
begin
  if s is null then return null; end if;

  -- a) Words split by the source export ("Internationa L" → "International").
  for r in select * from (values
      ('internationa', 'l', 'International'), ('schoo', 'l', 'School'), ('hig', 'h', 'High'),
      ('secondar', 'y', 'Secondary'), ('memoria', 'l', 'Memorial'), ('vidyapeet', 'h', 'Vidyapeeth'),
      ('karna', 'l', 'Karnal'), ('rohta', 'k', 'Rohtak'), ('mohindergar', 'h', 'Mohindergarh'),
      ('bagr', 'u', 'Bagru'), ('vikas', 'h', 'Vikash'), ('bud', 's', 'Buds'), ('flower', 's', 'Flowers'),
      -- lost apostrophes: "St. Paul S" → "St. Paul's"
      ('paul', 's', 'Paul''s'), ('xavier', 's', 'Xavier''s'), ('john', 's', 'John''s'),
      ('mary', 's', 'Mary''s'), ('mother', 's', 'Mother''s'), ('anthony', 's', 'Anthony''s'),
      ('joseph', 's', 'Joseph''s'), ('michael', 's', 'Michael''s'), ('mark', 's', 'Mark''s')
    ) as v(w, l, fixed)
  loop
    s := regexp_replace(s, '\m' || r.w || '\s+' || r.l || '\M', r.fixed, 'gi');
  end loop;

  s := regexp_replace(s, '\minterationa\s+lschool\M', 'International School', 'gi');
  s := regexp_replace(s, '\minternationa\s+lschool\M', 'International School', 'gi');
  s := regexp_replace(s, '([a-z])schoo\s+l\M', '\1school', 'gi');

  -- b) Misspelt generic English words.
  for r in select * from (values
      ('scool|schhol|scholl|schook|sxhool|sachool', 'School'),
      ('pblic|publc|publi|publik|pulic|ppublic', 'Public'),
      ('midle|middile|midlle', 'Middle'),
      ('covent', 'Convent'),
      ('mordern|morern', 'Modern'),
      ('intenational|internatinal|internatioal|internationl|interntional|intetnational', 'International'),
      ('seccondary|secondery|seconady', 'Secondary'),
      ('senor|sernior', 'Senior'),
      ('acadmy|acedemy', 'Academy'),
      ('mamorial|memoril', 'Memorial'),
      ('montesori|montessory|moncessori|mountessori', 'Montessori'),
      ('coloney', 'Colony'),
      ('encalave', 'Enclave'),
      ('velley', 'Valley'),
      ('cambride', 'Cambridge'),
      ('centanary', 'Centenary')
    ) as v(pattern, fixed)
  loop
    s := regexp_replace(s, '\m(' || r.pattern || ')\M', r.fixed, 'gi');
  end loop;

  return regexp_replace(trim(s), '\s+', ' ', 'g');
end
$$;

-- 2. Slug source: the fixed name, tidied for URLs only (the displayed name keeps
--    what the school uses):
--    - apostrophes dropped ("St. Paul's" → st-pauls);
--    - P/S, P.S. (standing alone) → public school; H/S → high school;
--      S/S → senior secondary (common Haryana abbreviations);
--    - runs of single letters collapsed into one initialism ("D P S", "D.p.s." → dps).
create or replace function public.school_slug_source(input text)
returns text language plpgsql immutable as $$
declare
  s text;
  toks text[];
  out text[] := '{}';
  run text := '';
  t text;
begin
  s := lower(coalesce(public.fix_school_display_name(input), ''));
  s := regexp_replace(s, '[''’`]', '', 'g');
  s := regexp_replace(s, '(^|[^a-z.])p\s*[/.]\s*s\.?(?=[^a-z.]|$)', '\1 public school ', 'g');
  s := regexp_replace(s, '(^|[^a-z.])h\s*[/.]\s*s\.?(?=[^a-z.]|$)', '\1 high school ', 'g');
  s := regexp_replace(s, '(^|[^a-z.])s\s*/\s*s\.?(?=[^a-z.]|$)', '\1 senior secondary ', 'g');
  toks := regexp_split_to_array(trim(regexp_replace(s, '[^a-z0-9]+', ' ', 'g')), ' ');
  foreach t in array toks loop
    if t ~ '^[a-z]$' then
      run := run || t;
    else
      if run <> '' then out := out || run; run := ''; end if;
      if t <> '' then out := out || t; end if;
    end if;
  end loop;
  if run <> '' then out := out || run; end if;
  return array_to_string(out, ' ');
end
$$;

-- 3. Apply display-name fixes (audited by the schools_audit trigger).
update public.schools
   set name_en = public.fix_school_display_name(name_en)
 where name_en is distinct from public.fix_school_display_name(name_en);

-- 4. Final re-mint, oldest first, from the slug source.
drop trigger if exists schools_slug_guard on public.schools;
alter table public.schools drop constraint if exists schools_slug_format;
drop index if exists public.schools_slug_unique;
create index if not exists schools_slug_mint_tmp on public.schools (slug);
update public.schools set slug = 'tmp-' || replace(id::text, '-', '');
do $$
declare r record;
begin
  for r in select id, name_en, locality_id, district_id from public.schools order by created_at, id loop
    update public.schools
       set slug = public.mint_school_slug(public.school_slug_source(r.name_en), r.locality_id, r.district_id, r.id)
     where id = r.id;
  end loop;
end $$;
drop index if exists public.schools_slug_mint_tmp;
create unique index schools_slug_unique on public.schools (slug);
alter table public.schools
  add constraint schools_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60);

-- 5. Write-once again; new schools mint from the same slug source.
create or replace function public.schools_slug_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.slug is null
       or new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.slug) > 60
       or public.is_reserved_school_slug(new.slug)
       or public.school_slug_taken(new.slug, new.id) then
      new.slug := public.mint_school_slug(public.school_slug_source(new.name_en), new.locality_id, new.district_id, new.id);
    end if;
  elsif new.slug is distinct from old.slug then
    raise exception 'schools.slug is write-once (D-121): % -> % refused. Rename display name / add an alias instead.', old.slug, new.slug;
  end if;
  return new;
end
$$;
create trigger schools_slug_guard before insert or update of slug on public.schools
  for each row execute function public.schools_slug_guard();
