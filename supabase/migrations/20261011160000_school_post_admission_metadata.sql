-- Structured admission-announcement metadata on the existing school_posts lifecycle.
-- The post remains the single publication/canonical identity; these typed fields
-- do not introduce a second moderation or listing workflow.

alter table public.school_posts
  add column if not exists topic text not null default 'general',
  add column if not exists admission_academic_year text,
  add column if not exists admission_class_codes text[] not null default '{}',
  add column if not exists admission_opens_on date,
  add column if not exists admission_closes_on date,
  add column if not exists admission_application_url text,
  add column if not exists admission_notice_url text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.school_posts'::regclass and conname = 'school_posts_topic_valid') then
    alter table public.school_posts add constraint school_posts_topic_valid
      check (topic in ('general', 'admission_announcement'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.school_posts'::regclass and conname = 'school_posts_admission_dates_ordered') then
    alter table public.school_posts add constraint school_posts_admission_dates_ordered
      check (
        topic <> 'admission_announcement'
        or admission_opens_on is null
        or admission_closes_on is null
        or admission_closes_on >= admission_opens_on
      );
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.school_posts'::regclass and conname = 'school_posts_admission_year_shape') then
    alter table public.school_posts add constraint school_posts_admission_year_shape
      check (admission_academic_year is null or admission_academic_year ~ '^[0-9]{4}-[0-9]{2}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.school_posts'::regclass and conname = 'school_posts_admission_class_codes') then
    alter table public.school_posts add constraint school_posts_admission_class_codes
      check (
        cardinality(admission_class_codes) <= 30
        and array_position(admission_class_codes, null) is null
        and admission_class_codes <@ array[
          'nursery',
          'lkg',
          'ukg',
          'c1',
          'c2',
          'c3',
          'c4',
          'c5',
          'c6',
          'c7',
          'c8',
          'c9',
          'c10',
          'c11',
          'c12'
        ]::text[]
      );
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.school_posts'::regclass and conname = 'school_posts_admission_urls_https') then
    alter table public.school_posts add constraint school_posts_admission_urls_https
      check (
        (admission_application_url is null or admission_application_url ~* '^https://[^/?#[:space:]]+([/?#][^[:space:]]*)?$')
        and (admission_notice_url is null or admission_notice_url ~* '^https://[^/?#[:space:]]+([/?#][^[:space:]]*)?$')
      );
  end if;
end
$$;

create index if not exists school_posts_admission_active_idx
  on public.school_posts (school_id, published_at desc)
  where topic = 'admission_announcement'
    and review = 'approved'
    and published_at is not null
    and withdrawn_at is null;

-- Append the new public fields to the established projections. Internal review,
-- authorship, and listing workflow columns remain unexposed.
create or replace view api.public_school_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at,
  sp.post_code,
  sp.slug as post_slug,
  sp.tier,
  sp.listing_requested_at,
  sp.listing_review,
  sp.withdrawn_at,
  s.name_en as school_name,
  s.city_id,
  sp.listing_reviewed_at,
  sp.topic,
  sp.admission_academic_year,
  sp.admission_class_codes,
  sp.admission_opens_on,
  sp.admission_closes_on,
  sp.admission_application_url,
  sp.admission_notice_url
from public.school_posts sp
join public.schools s on s.id = sp.school_id
where sp.review = 'approved'
  and s.status = 'published'
  and sp.published_at is not null
  and sp.withdrawn_at is null;

create or replace view api.public_news as
select
  sp.id,
  sp.school_id,
  s.slug as school_slug,
  s.name_en as school_name,
  s.city_id,
  sp.kind,
  sp.title,
  sp.body,
  sp.source_url,
  sp.published_at,
  sp.post_code,
  sp.slug as post_slug,
  sp.tier,
  sp.listing_reviewed_at,
  sp.topic,
  sp.admission_academic_year,
  sp.admission_class_codes,
  sp.admission_opens_on,
  sp.admission_closes_on,
  sp.admission_application_url,
  sp.admission_notice_url
from public.school_posts sp
join public.schools s on s.id = sp.school_id
where sp.review = 'approved'
  and sp.published_at is not null
  and sp.listing_review = 'approved'
  and sp.withdrawn_at is null
  and s.status = 'published';

grant select on api.public_school_news to anon, authenticated;
grant select on api.public_news to anon, authenticated;
