-- Prav's slug quality fixes, 28 Sep 2026 (D-124): 68 slugs from his review CSV
-- (truncated "-sr-sec" / "-sch", malformed "-scho-ol") plus 6 more with the same
-- defect. Slugs had been live for ~1 hour; each old slug is kept in
-- school_slug_redirects ('retired') so its URL 301s to the new one forever and is
-- never reused (D-121 §8). Requested slugs already held by another school get the
-- guide's collision suffix: + city, then + numeric suffix.
-- Also teaches school_slug_source() the same rules for future schools.

create temp table slug_fixes(old text primary key, requested text not null) on commit drop;
insert into slug_fixes(old, requested) values
('gyan-deep-sr-sec','gyan-deep-senior-secondary-school'),
('sd-sr-sec','sd-senior-secondary-school'),
('sr-dayanand-sen-sec-scho-ol','sr-dayanand-sen-sec-school'),
('dc-model-sr-sec','dc-model-senior-secondary-school'),
('krishna-sr-sec','krishna-senior-secondary-school'),
('west-academy-sr-sec','west-academy-senior-secondary-school'),
('paramount-convent-sch','paramount-convent-school'),
('pkr-jain-vatika-sr-sec','pkr-jain-vatika-senior-secondary-school'),
('gyan-devi-public-school-sr-sec','gyan-devi-public-school-senior-secondary-school'),
('arya-sr-sec','arya-senior-secondary-school'),
('keshav-vidya-vihar-s-sec-sch','keshav-vidya-vihar-s-sec-school'),
('lord-krishna-international-sch','lord-krishna-international-school'),
('happy-model-sr-sec','happy-model-senior-secondary-school'),
('shri-shive-chetnay-sr-sec','shri-shive-chetnay-senior-secondary-school'),
('gyan-deep-middle-sch','gyan-deep-middle-school'),
('nandlal-geeta-vidya-mandir-sr-sec','nandlal-geeta-vidya-mandir-senior-secondary-school'),
('neeraj-sr-sec','neeraj-senior-secondary-school'),
('st-michaels-sr-sec','st-michaels-senior-secondary-school'),
('ramanmunjal-vidhya-mandir-sr-sec','ramanmunjal-vidhya-mandir-senior-secondary-school'),
('blooming-kids-sr-sec','blooming-kids-senior-secondary-school'),
('bhartiya-vidya-niketan-sr-sec','bhartiya-vidya-niketan-senior-secondary-school'),
('navodya-vidya-niketan-sr-sec','navodya-vidya-niketan-senior-secondary-school'),
('saraswati-shishu-sadan-sr-sec-sch','saraswati-shishu-sadan-sr-sec-school'),
('hindu-vidya-vihar-sr-sec','hindu-vidya-vihar-senior-secondary-school'),
('anupam-shiksha-niketan-sr-sec','anupam-shiksha-niketan-senior-secondary-school'),
('jagriti-sr-sec-sch','jagriti-sr-sec-school'),
('guru-gobind-singh-sr-sec','guru-gobind-singh-senior-secondary-school'),
('shardha-sr-sec','shardha-senior-secondary-school'),
('hindu-sr-sec','hindu-senior-secondary-school'),
('patel-sr-sec','patel-senior-secondary-school'),
('swami-brahmanand-saraswati-sch','swami-brahmanand-saraswati-school'),
('sbs-national-sr-sec','sbs-national-senior-secondary-school'),
('gyan-jyoti-sr-sec','gyan-jyoti-senior-secondary-school'),
('dav-centenary-public-sch','dav-centenary-public-school'),
('om-parbha-jain-sr-mod-sch','om-parbha-jain-sr-mod-school'),
('akhil-bhartiya-sr-sec-sch','akhil-bhartiya-sr-sec-school'),
('svm-sr-sec','svm-senior-secondary-school'),
('avm-sr-sec','avm-senior-secondary-school'),
('nawab-shamshuddin-memorial-sr-sec','nawab-shamshuddin-memorial-senior-secondary-school'),
('prem-grima-memorial-sr-sec','prem-grima-memorial-senior-secondary-school'),
('bk-sr-sec','bk-senior-secondary-school'),
('montessori-convent-sr-sec','montessori-convent-senior-secondary-school'),
('brm-sr-sec','brm-senior-secondary-school'),
('swami-vivekanand-sr-sec-sch','swami-vivekanand-sr-sec-school'),
('mamta-modern-sr-sec','mamta-modern-senior-secondary-school'),
('new-light-sr-sec','new-light-senior-secondary-school'),
('swami-dayanand-sr-sec','swami-dayanand-senior-secondary-school'),
('ratiram-memorial-sr-sec','ratiram-memorial-senior-secondary-school'),
('aryawart-sr-sec','aryawart-senior-secondary-school'),
('jyoti-prakash-sr-sec','jyoti-prakash-senior-secondary-school'),
('partap-sr-sec','partap-senior-secondary-school'),
('saraswati-moderl-sr-sec','saraswati-moderl-senior-secondary-school'),
('mdvm-sr-sec','mdvm-senior-secondary-school'),
('rb-ram-roop-vidya-mandir-sr-sec-sch','rb-ram-roop-vidya-mandir-sr-sec-school'),
('mahrishi-bhardwaj-pb-sch','mahrishi-bhardwaj-pb-school'),
('mahatma-hansraj-mid-sch','mahatma-hansraj-mid-school'),
('ddvn-middle-sch','ddvn-middle-school'),
('jai-bharat-middle-sch','jai-bharat-middle-school'),
('ch-hari-ram-memorial-high-sch','ch-hari-ram-memorial-high-school'),
('maharishi-vidya-mandir-sr-sec','maharishi-vidya-mandir-senior-secondary-school'),
('bharti-vidya-mandir-high-sch','bharti-vidya-mandir-high-school'),
('phoola-devi-dav-public-sch','phoola-devi-dav-public-school'),
('tagore-school-sr-sec','tagore-school-senior-secondary-school'),
('sevti-devi-memorial-sr-sec','sevti-devi-memorial-senior-secondary-school'),
('taksila-public-school-sr-sec','taksila-public-school-senior-secondary-school'),
('sd-indraprastha-modern-sch','sd-indraprastha-modern-school'),
('saint-pauls-school-sr-sec','saint-pauls-school-senior-secondary-school'),
('jai-maa-saraswati-vidhya-peeth-sr-sec','jai-maa-saraswati-vidhya-peeth-senior-secondary-school'),
('adrash-vidhya-mandir-sen-sec-scho-ol-hodal','adrash-vidhya-mandir-sen-sec-school-hodal'),
('delhi-international-public-sch','delhi-international-public-school'),
('delhi-sen-sec-scho-ol-kalayat','delhi-sen-sec-school-kalayat'),
('gold-life-primary-scho-ol-rajound','gold-life-primary-school-rajound'),
('maka-scho-ol-jamalgrah','maka-school-jamalgrah'),
('nivedita-sen-sec-scho-ol-ellenabad','nivedita-sen-sec-school-ellenabad');

do $$
declare r record; target text; city text; n int;
begin
  alter table public.schools disable trigger schools_slug_guard;
  for r in select f.old, f.requested, s.id, s.district_id from slug_fixes f join public.schools s on s.slug = f.old order by s.created_at, s.id loop
    select slug into city from public.districts where id = r.district_id;
    target := r.requested;
    if public.school_slug_taken(target, r.id) or public.is_reserved_school_slug(target) then
      target := r.requested || '-' || city;
      n := 2;
      while public.school_slug_taken(target, r.id) or length(target) > 60 loop
        target := r.requested || '-' || city || '-' || n;
        n := n + 1;
      end loop;
    end if;
    insert into public.school_slug_redirects(slug, school_id, reason) values (r.old, r.id, 'retired');
    update public.schools set slug = target where id = r.id;
    raise notice '% -> %', r.old, target;
  end loop;
  alter table public.schools enable trigger schools_slug_guard;
end $$;

-- Future schools: spell out a trailing "Sr. Sec." as senior secondary school,
-- a trailing "Sch" as school, and rejoin "Scho ol".
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
  s := regexp_replace(s, '\mscho\s+ol\M', 'school', 'g');
  s := regexp_replace(s, '\msch\.?\s*$', 'school', 'g');
  s := regexp_replace(s, '\msr\.?\s*sec\.?\s*$', 'senior secondary school', 'g');
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
