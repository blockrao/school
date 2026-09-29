-- Regression test for the P0 fix in 20260929090000_activity_admissions_v1.sql:
-- requesting a site-wide listing must not permanently lock a school_events /
-- school_jobs / school_posts row against its own legitimate lifecycle actions
-- (cancel / mark filled / withdraw), while still blocking arbitrary content
-- edits during active review and demoting a materially-edited, already-
-- approved row back for re-review.
--
-- This repo has no JS/PostgREST integration-test harness for RLS yet (the
-- verification pass this migration responds to confirmed that), so this is a
-- plain SQL script run directly against the database with
-- mcp__Supabase__execute_sql, exercising the BEFORE UPDATE trigger functions
-- exactly as installed. It runs as the SQL-execution role, which has no JWT
-- (auth.uid() is null), so public.is_staff() correctly evaluates false here —
-- the same "ordinary school member" path the triggers are meant to gate.
-- Wrapped in BEGIN/ROLLBACK: it never leaves data behind, and can be re-run
-- any time schema around these tables changes, by hand or from CI once a
-- migration-testing harness exists.
--
-- Uses the existing "SchoolOye QA Test Fixture (Not a Real School)" school
-- (0ebcd31e-79aa-4e44-9ec9-f6d6e094e53c) rather than a real school.

begin;

do $$
declare
  fixture_school uuid := '0ebcd31e-79aa-4e44-9ec9-f6d6e094e53c';
  ev_id uuid;
  ev2_id uuid;
  caught text;
  row_after record;
begin
  -- 1. Freely editable before any listing request.
  insert into school_events (school_id, title, starts_at)
    values (fixture_school, 'RLS test event v1', now() + interval '3 days')
    returning id into ev_id;

  update school_events set title = 'RLS test event v2' where id = ev_id;
  select title into strict row_after from school_events where id = ev_id;
  if row_after.title <> 'RLS test event v2' then
    raise exception 'FAIL 1: pre-request content edit did not apply';
  end if;
  raise notice 'PASS 1: content freely editable before a listing request';

  -- 2. Request a listing (status-only change) -- must always succeed.
  update school_events
    set listing_requested_at = now(), listing_review = 'pending'
    where id = ev_id;
  raise notice 'PASS 2: requesting a listing (status-only change) succeeded';

  -- 3. Content edit while pending review must be BLOCKED (this is the
  --    review-integrity guarantee -- ops should not have the row shift
  --    under them mid-review).
  begin
    update school_events set title = 'Sneaky edit while pending' where id = ev_id;
    raise exception 'FAIL 3: content edit while pending was NOT blocked';
  exception
    when others then
      get stacked diagnostics caught = message_text;
      if caught like 'Cannot edit this event%' then
        raise notice 'PASS 3: content edit correctly blocked while pending (%)', caught;
      else
        raise exception 'FAIL 3: blocked for the wrong reason: %', caught;
      end if;
  end;

  -- 4. THE P0 BUG ITSELF: cancelling (a pure lifecycle action) must still
  --    work even though a listing is pending -- this is exactly what the old
  --    `listing_requested_at is null` RLS gate broke.
  update school_events set cancelled_at = now() where id = ev_id;
  select cancelled_at into strict row_after from school_events where id = ev_id;
  if row_after.cancelled_at is null then
    raise exception 'FAIL 4 (the P0 bug): cancel-while-pending did not apply';
  end if;
  raise notice 'PASS 4 (the P0 bug is fixed): cancel succeeded while listing_review = pending';

  -- 5. A materially-edited, currently-approved row demotes to 'edited'
  --    rather than silently keeping 'approved' -- the "appropriate review
  --    rule" for changes after approval.
  insert into school_events (school_id, title, starts_at, listing_review, listing_requested_at)
    values (fixture_school, 'RLS test event (approved)', now() + interval '5 days', 'approved', now())
    returning id into ev2_id;

  update school_events set title = 'RLS test event (approved) -- edited' where id = ev2_id;
  select title, listing_review into strict row_after from school_events where id = ev2_id;
  if row_after.listing_review <> 'edited' then
    raise exception 'FAIL 5: editing an approved+listed event did not demote listing_review (got %)', row_after.listing_review;
  end if;
  raise notice 'PASS 5: editing an approved, listed event demoted listing_review to ''edited''';

  -- 6. A rejected row is freely editable again (resubmission path).
  update school_events set listing_review = 'rejected' where id = ev2_id;
  update school_events set title = 'RLS test event (rejected, now fixed)' where id = ev2_id;
  select title into strict row_after from school_events where id = ev2_id;
  if row_after.title <> 'RLS test event (rejected, now fixed)' then
    raise exception 'FAIL 6: rejected row was not freely editable';
  end if;
  raise notice 'PASS 6: a rejected row is freely editable again (resubmission path works)';

  raise notice 'ALL 6 ASSERTIONS PASSED';
end $$;

rollback;
