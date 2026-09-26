-- Fix: wrap bare auth.uid() calls in RLS policies as (select auth.uid()) so
-- Postgres evaluates them once per query instead of once per row (Supabase
-- performance advisor: auth_rls_initplan). Pure performance change — the
-- boolean logic of every policy is unchanged, just parenthesized.
-- ALTER POLICY only rewrites USING/WITH CHECK; nothing is ever dropped, so
-- there is no window where a table has no policy. Verified via a rolled-back
-- transactional dry run before this migration was applied.

ALTER POLICY alerts_owner ON alert_subscriptions
  USING ((user_id = (select auth.uid())) OR is_staff())
  WITH CHECK ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY orders_owner ON application_orders
  USING ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY apps_owner ON applications
  USING (
    (EXISTS (
      SELECT 1 FROM application_orders o
      WHERE o.id = applications.order_id AND o.user_id = (select auth.uid())
    )) OR is_staff()
  );

ALTER POLICY children_owner ON children
  USING ((parent_id = (select auth.uid())) OR is_staff())
  WITH CHECK ((parent_id = (select auth.uid())) OR is_staff());

ALTER POLICY consents_self ON consents
  USING ((user_id = (select auth.uid())) OR is_staff())
  WITH CHECK ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY conversations_initiator_insert ON conversations
  WITH CHECK (
    (initiator_id = (select auth.uid())) AND (EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = conversations.teacher_id
        AND t.claimed_by IS NOT NULL
        AND t.claimed_by <> (select auth.uid())
        AND t.status = 'published'::record_status
        AND t.is_listed
    ))
  );

ALTER POLICY conversations_participant_select ON conversations
  USING (
    (initiator_id = (select auth.uid())) OR (EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = conversations.teacher_id AND t.claimed_by = (select auth.uid())
    ))
  );

ALTER POLICY docs_owner ON documents
  USING (
    (EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = documents.child_id AND c.parent_id = (select auth.uid())
    )) OR is_staff()
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = documents.child_id AND c.parent_id = (select auth.uid())
    )) OR is_staff()
  );

ALTER POLICY enq_insert ON enquiries
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY enq_read ON enquiries
  USING ((user_id = (select auth.uid())) OR is_school_member(school_id) OR is_staff());

ALTER POLICY messages_participant_insert ON messages
  WITH CHECK (
    (sender_id = (select auth.uid())) AND (EXISTS (
      SELECT 1 FROM conversations c LEFT JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = messages.conversation_id
        AND (c.initiator_id = (select auth.uid()) OR t.claimed_by = (select auth.uid()))
    ))
  );

ALTER POLICY messages_participant_select ON messages
  USING (
    EXISTS (
      SELECT 1 FROM conversations c LEFT JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = messages.conversation_id
        AND (c.initiator_id = (select auth.uid()) OR t.claimed_by = (select auth.uid()))
    )
  );

ALTER POLICY profiles_self ON profiles
  USING ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY profiles_self_insert ON profiles
  WITH CHECK ((user_id = (select auth.uid())) AND (role = 'parent'::user_role));

ALTER POLICY profiles_self_update ON profiles
  USING (user_id = (select auth.uid()))
  WITH CHECK ((user_id = (select auth.uid())) AND (role = current_user_role()));

ALTER POLICY claims_insert ON school_claims
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY claims_self ON school_claims
  USING ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY members_read ON school_members
  USING ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY members_school_admin_manage_others ON school_members
  USING (is_school_admin(school_id) AND (user_id <> (select auth.uid())))
  WITH CHECK (is_school_admin(school_id) AND (user_id <> (select auth.uid())));

ALTER POLICY members_school_admin_remove_others ON school_members
  USING (is_school_admin(school_id) AND (user_id <> (select auth.uid())));

ALTER POLICY school_posts_member_insert ON school_posts
  WITH CHECK (is_school_member(school_id) AND (created_by = (select auth.uid())));

ALTER POLICY shortlists_owner ON shortlists
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY teacher_claims_insert ON teacher_claims
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY teacher_claims_self_read ON teacher_claims
  USING ((user_id = (select auth.uid())) OR is_staff());

ALTER POLICY teacher_experience_owner_write ON teacher_experience
  USING (EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_experience.teacher_id AND t.claimed_by = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_experience.teacher_id AND t.claimed_by = (select auth.uid())
  ));

ALTER POLICY teacher_experience_public_read ON teacher_experience
  USING (EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_experience.teacher_id
      AND (((t.status = 'published'::record_status) AND t.is_listed)
           OR is_staff()
           OR t.claimed_by = (select auth.uid()))
  ));

ALTER POLICY teacher_qualifications_owner_write ON teacher_qualifications
  USING (EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_qualifications.teacher_id AND t.claimed_by = (select auth.uid())
  ))
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_qualifications.teacher_id AND t.claimed_by = (select auth.uid())
    )) AND verified_by IS NULL AND verified_at IS NULL
  );

ALTER POLICY teacher_qualifications_public_read ON teacher_qualifications
  USING (EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_qualifications.teacher_id
      AND (((t.status = 'published'::record_status) AND t.is_listed)
           OR is_staff()
           OR t.claimed_by = (select auth.uid()))
  ));

ALTER POLICY teachers_owner_insert ON teachers
  WITH CHECK (claimed_by = (select auth.uid()));

ALTER POLICY teachers_owner_update ON teachers
  USING (claimed_by = (select auth.uid()))
  WITH CHECK (claimed_by = (select auth.uid()));

ALTER POLICY teachers_public_read ON teachers
  USING (
    ((status = 'published'::record_status) AND is_listed)
    OR is_staff()
    OR claimed_by = (select auth.uid())
  );
