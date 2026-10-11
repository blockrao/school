-- Regression contract for 20261011160000_school_post_admission_metadata.sql.
-- Run only after the migration has been applied. Uses a real published school
-- but all writes are wrapped in a transaction and rolled back.
-- This script tests the installed database contract, not the portal UI.

begin;

do $test$
declare
  test_school uuid;
  test_post uuid;
  visible_school_post boolean;
  visible_global_post boolean;
  caught boolean;
  before_cycles bigint;
  after_cycles bigint;
begin
  select id into strict test_school
  from public.schools
  where status = 'published'
  order by id
  limit 1;

  select count(*) into before_cycles from public.admission_cycles;

  insert into public.school_posts
    (school_id, kind, title, body, review, published_at, listing_review,
     listing_requested_at, topic, admission_academic_year,
     admission_class_codes, admission_opens_on, admission_closes_on,
     admission_application_url, admission_notice_url)
  values
    (test_school, 'news', 'QA admission metadata contract test',
     'Transaction-only contract test.', 'approved', now(), 'approved', now(),
     'admission_announcement', '2026-27', array['nursery', 'c1', 'c12'],
     date '2026-11-01', date '2027-02-28',
     'https://school.example/apply?session=2026',
     'https://school.example/admissions/notice.pdf')
  returning id into test_post;

  select exists (
    select 1 from api.public_school_news
    where id = test_post
      and topic = 'admission_announcement'
      and admission_academic_year = '2026-27'
      and admission_class_codes = array['nursery', 'c1', 'c12']
  ) into visible_school_post;

  if not visible_school_post then
    raise exception 'FAIL: approved admission post missing from school profile projection';
  end if;

  select exists (
    select 1 from api.public_news
    where id = test_post
  ) into visible_global_post;

  if visible_global_post then
    raise exception 'FAIL: admission post bypassed the site-wide listing-review gate';
  end if;

  update public.school_posts
  set listing_review = 'approved', listing_reviewed_at = now()
  where id = test_post;

  select exists (
    select 1 from api.public_news
    where id = test_post
      and topic = 'admission_announcement'
      and admission_application_url = 'https://school.example/apply?session=2026'
  ) into visible_global_post;

  if not visible_global_post then
    raise exception 'FAIL: listed admission post missing from global news projection after approval';
  end if;

  caught := false;
  begin
    insert into public.school_posts
      (school_id, kind, title, body, topic, admission_opens_on, admission_closes_on)
    values
      (test_school, 'news', 'QA invalid date order', 'Expected to fail',
       'admission_announcement', date '2027-03-01', date '2027-02-01');
  exception when check_violation then
    caught := true;
  end;
  if not caught then raise exception 'FAIL: date-order constraint did not reject invalid dates'; end if;

  caught := false;
  begin
    insert into public.school_posts
      (school_id, kind, title, body, admission_academic_year)
    values (test_school, 'news', 'QA invalid year', 'Expected to fail', '2026/27');
  exception when check_violation then
    caught := true;
  end;
  if not caught then raise exception 'FAIL: academic-year constraint did not reject malformed year'; end if;

  caught := false;
  begin
    insert into public.school_posts
      (school_id, kind, title, body, admission_application_url)
    values (test_school, 'news', 'QA insecure URL', 'Expected to fail', 'http://school.example/apply');
  exception when check_violation then
    caught := true;
  end;
  if not caught then raise exception 'FAIL: URL constraint did not reject HTTP URL'; end if;

  caught := false;
  begin
    insert into public.school_posts
      (school_id, kind, title, body, admission_class_codes)
    values (test_school, 'news', 'QA invalid class', 'Expected to fail', array['c13']);
  exception when check_violation then
    caught := true;
  end;
  if not caught then raise exception 'FAIL: class-code constraint did not reject unsupported class'; end if;

  update public.school_posts set withdrawn_at = now() where id = test_post;
  if exists (select 1 from api.public_school_news where id = test_post)
     or exists (select 1 from api.public_news where id = test_post) then
    raise exception 'FAIL: withdrawn admission post remains publicly visible';
  end if;

  select count(*) into after_cycles from public.admission_cycles;
  if after_cycles <> before_cycles then
    raise exception 'FAIL: shared admission cycles were modified';
  end if;

  raise notice 'PASS: school-page publication is independent of site-wide listing approval';
  raise notice 'PASS: global news visibility begins only after listing approval';
  raise notice 'PASS: invalid dates, academic year, HTTP URL, and class codes are rejected';
  raise notice 'PASS: withdrawn post disappears from both public projections';
  raise notice 'PASS: shared admission_cycles remains untouched';
end
$test$;

rollback;
