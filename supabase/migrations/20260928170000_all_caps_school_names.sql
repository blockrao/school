-- One-time capitalisation fix for school names imported in ALL CAPS
-- (Prav, 28 Sep 2026). Display name only — slugs are write-once and untouched.
--
-- Scope: names with no lowercase letter at all. Mixed-case names ("DAV Public
-- School") are left exactly as entered. Old values are kept in
-- school_name_case_backup so the change can be reverted.
--
-- Rules, per word:
--   - single letters and initialisms (D.A.V., R B) stay upper;
--   - vowel-less words stay upper (DPS, BVM, MCD) except the common
--     abbreviations below, which become Sr, St, Smt, Sch, Pvt …;
--   - a short list of known acronyms with vowels stays upper (DAV, HUDA …);
--   - Roman numerals stay upper;
--   - of / and / the / for / in / at / on are lowercase except as first word;
--   - everything else: first letter upper, rest lower ("PAUL'S" → "Paul's").

create or replace function public.title_case_school_name(input text)
returns text language plpgsql immutable as $$
declare
  m text[];
  w text;
  u text;
  out text := '';
  first boolean := true;
  abbrev constant text[] := array['SR','ST','CH','PT','RD','SCH','SH','SMT','FR','MT','DR','JR',
                                  'PVT','LTD','GOVT','MKT','NR','SHR','BHS'];
  acronyms constant text[] := array['DAV','OPG','RCCE','ASN','JAVM','HUDA','OK','ICSE','CBSE','IGCSE',
                                    'NDMC','SDMC','EDMC','NDA','RPS','GGSSS','GBSSS','SKV','RSKV','SV'];
  minor constant text[] := array['OF','AND','THE','FOR','IN','AT','ON'];
begin
  if input is null or input ~ '[a-z]' then return input; end if;
  for m in select regexp_matches(input, '([^A-Za-z'']*)([A-Za-z'']*)', 'g') loop
    out := out || m[1];
    w := m[2];
    if w = '' then continue; end if;
    u := upper(w);
    if length(u) = 1 or u = any(acronyms) or u ~ '^[IVX]+$' and length(u) <= 4 and u <> 'VIX' then
      out := out || u;
    elsif u = any(abbrev) then
      out := out || upper(left(u, 1)) || lower(substr(u, 2));
    elsif not first and u = any(minor) then
      out := out || lower(u);
    elsif u !~ '[AEIOUY]' and length(u) between 2 and 5 then
      out := out || u;
    else
      out := out || upper(left(u, 1)) || lower(substr(u, 2));
    end if;
    first := false;
  end loop;
  return out;
end
$$;

create table if not exists public.school_name_case_backup (
  school_id uuid primary key references public.schools(id),
  old_name_en text not null,
  changed_at timestamptz not null default now()
);
alter table public.school_name_case_backup enable row level security;

insert into public.school_name_case_backup (school_id, old_name_en)
select id, name_en from public.schools
 where name_en !~ '[a-z]' and name_en ~ '[A-Z]'
on conflict (school_id) do nothing;

update public.schools
   set name_en = public.title_case_school_name(name_en)
 where name_en !~ '[a-z]' and name_en ~ '[A-Z]';
