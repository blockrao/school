-- api.public_exam_admissions: one row per exam admission cycle (RMS CET,
-- JNVST, AISSEE, …), for the /[locale]/exams hub and /[locale]/exams/{slug}
-- pages (docs/spec/exams.md). Child facts (milestones, fee tiers,
-- reservation splits, exam-level centres and participating schools) are
-- aggregated as jsonb arrays per row, same shape as api.public_school_admissions.
--
-- BACKFILL (4 Oct 2026): this view has existed live since 26 Sep 2026
-- (created and iterated 8 times — create_public_exam_admissions_view,
-- extend_public_exam_admissions_view_v2, add_fee_tiers_to_exam_admissions_view_v2,
-- add_selection_notes_to_public_exam_admissions_view,
-- null_safe_corrections_and_application_steps_in_view — tracked only in
-- Supabase's own supabase_migrations.schema_migrations ledger, never
-- committed here) but had no file in db/views/, exactly as
-- docs/spec/exams.md §2 "Gaps found" and §4 "Backfill into the repo" already
-- flagged. This file is step 1 of that already-approved P0 backfill: the
-- verbatim current definition via pg_get_viewdef('api.public_exam_admissions',
-- true), committed as CREATE OR REPLACE VIEW only, per that spec. The grant
-- (step 2) is supabase/migrations/20261004000000_grant_public_exam_admissions.sql;
-- the verify-views entry (step 3) is in scripts/verify-views.ts.
--
-- Publish gate: a cycle is shown only once a person has verified it
-- (`verification` in ops_verified/school_verified — the legacy enum;
-- docs/spec/exams.md §4 flags migrating this to verification_status, not
-- done yet). Exam-level arrays (centres, participating schools) repeat on
-- every cycle row for that exam, same denormalised-for-the-UI shape as the
-- school view.
create or replace view api.public_exam_admissions as
select
  e.id as exam_id,
  e.slug,
  e.name_en,
  e.name_hi,
  e.conducting_body,
  e.official_site,
  e.helpdesk_phone,
  e.helpdesk_email,
  e.info_site_url,
  ac.id as cycle_id,
  ac.academic_year,
  ac.class_code,
  ac.status,
  ac.form_mode,
  ac.opens_on,
  ac.closes_on,
  ac.registration_fee,
  ac.late_fee_amount,
  ac.form_url,
  ac.notice_url,
  ac.dob_from,
  ac.dob_to,
  ac.documents_required,
  ac.eligibility_notes_en,
  ac.eligibility_notes_hi,
  ac.pattern,
  ac.syllabus,
  coalesce(ac.application_steps, '[]'::jsonb) as application_steps,
  coalesce(ac.corrections, '[]'::jsonb) as corrections,
  ac.last_checked_at,
  ac.verification,
  case
    when ac.closes_on is not null then ac.closes_on - current_date
    else null::integer
  end as days_to_close,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'label_en', m.label_en, 'label_hi', m.label_hi,
      'starts_on', m.starts_on, 'ends_on', m.ends_on,
      'detail_en', m.detail_en, 'detail_hi', m.detail_hi
    ) order by m.sort_order)
    from exam_cycle_milestones m
    where m.cycle_id = ac.id
  ), '[]'::jsonb) as milestones,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'category_label_en', f.category_label_en, 'category_label_hi', f.category_label_hi,
      'amount', f.amount
    ) order by f.sort_order)
    from exam_fee_tiers f
    where f.cycle_id = ac.id
  ), '[]'::jsonb) as fee_tiers,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'level', r.level, 'group_label_en', r.group_label_en,
      'group_label_hi', r.group_label_hi, 'share_text', r.share_text
    ) order by r.sort_order)
    from exam_reservation_splits r
    where r.cycle_id = ac.id
  ), '[]'::jsonb) as reservation_splits,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'city_code', c.city_code, 'city_name', c.city_name, 'state', c.state
    ) order by c.state, c.city_name)
    from exam_centres c
    where c.exam_id = e.id
  ), '[]'::jsonb) as centres,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'school_id', s.school_id, 'name_en', s.name_en, 'name_hi', s.name_hi, 'state', s.state
    ) order by s.sort_order)
    from exam_participating_schools s
    where s.exam_id = e.id
  ), '[]'::jsonb) as participating_schools,
  ac.selection_notes
from exams e
join admission_cycles ac on ac.exam_id = e.id
where ac.verification = any (array['ops_verified'::verification_status, 'school_verified'::verification_status]);
