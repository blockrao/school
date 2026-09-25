-- DPDP account deletion. SECURITY DEFINER so a plain `authenticated` user
-- (with no direct DELETE grant on most of these tables) can delete exactly
-- their own data — same bridging pattern as mark_order_paid/purge_expired_documents.
--
-- Two different outcomes depending on whether another party has a legitimate
-- ongoing interest in the record, independent of this user's continued
-- account:
--   ANONYMIZED (row kept, identity stripped): consents (compliance record of
--     what was agreed/withdrawn and when — the whole point is it must survive
--     the person who granted it), enquiries (the school still has a real
--     enquiry to answer; only the asker's identity is removed), events
--     (analytics, already has anon_id as a non-PII identifier).
--   DELETED (row removed): everything else — children, documents (+ Storage
--     files), alert_subscriptions, shortlists, school_members, teachers (+
--     experience/qualifications + Storage photo), teacher_claims,
--     school_claims, application_orders (+ applications via cascade).
--
-- Flagged, not resolved here: application_orders represents paid admission-
-- help transactions. Deleting them outright is the right call *today* (no
-- real payments have been processed yet — PAYMENT_PROVIDER is mock/manual
-- pre-launch), but once real money moves through this table, financial-
-- record-retention rules (India's IT Act generally expects ~6-8 years) may
-- require anonymizing rather than deleting order history. Revisit before
-- launch if that's a concern; not blocking today given zero real transactions.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Storage objects first — DB row deletion never touches Storage files.
  -- All three buckets use {user_id}/... as their top-level folder (see each
  -- bucket's own RLS policies), so a prefix match catches everything without
  -- joining through documents.storage_path / teachers.photo_storage_path.
  DELETE FROM storage.objects
    WHERE bucket_id = 'documents' AND (storage.foldername(name))[1] = v_uid::text;
  DELETE FROM storage.objects
    WHERE bucket_id = 'teacher-media' AND (storage.foldername(name))[1] = v_uid::text;
  DELETE FROM storage.objects
    WHERE bucket_id = 'school-claims' AND (storage.foldername(name))[1] = v_uid::text;

  -- Anonymize (see header comment for why these three, specifically).
  UPDATE consents
    SET user_id = NULL, phone = NULL, withdrawn_at = COALESCE(withdrawn_at, now())
    WHERE user_id = v_uid;
  UPDATE enquiries SET user_id = NULL, child_id = NULL WHERE user_id = v_uid;
  UPDATE events SET user_id = NULL WHERE user_id = v_uid;

  -- Explicit deletes for tables with no ON DELETE CASCADE from profiles
  -- (must run before the profiles delete below, which would otherwise hit a
  -- foreign-key violation on these).
  DELETE FROM teacher_claims WHERE user_id = v_uid;
  DELETE FROM teachers WHERE claimed_by = v_uid; -- cascades to teacher_experience/teacher_qualifications
  DELETE FROM school_claims WHERE user_id = v_uid;
  DELETE FROM application_orders WHERE user_id = v_uid; -- cascades to applications

  -- Everything else (children [+ documents rows], alert_subscriptions,
  -- shortlists, school_members) has ON DELETE CASCADE from profiles.user_id,
  -- so one delete here finishes those.
  DELETE FROM profiles WHERE user_id = v_uid;

  -- Ends the ability to sign in; cascades through Supabase's own
  -- auth.* housekeeping tables (sessions, refresh_tokens, identities, mfa).
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
