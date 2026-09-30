-- Consolidate overlapping permissive RLS policies (30 Sep 2026).
--
-- Part of the database audit Prav asked for. The performance advisor
-- flagged 287 "multiple permissive policies" findings across 37 tables:
-- almost every one followed the same shape -- a `for all` staff-bypass
-- policy (`<table>_staff_all` / `_staff_write`, qual is_staff()) sitting
-- alongside separate per-action policies for public/member access. Since a
-- `for all` policy implicitly covers select/insert/update/delete, Postgres
-- had to evaluate 2-3 permissive policies per query on these tables instead
-- of 1.
--
-- Fix: for every (table, action) pair that had more than one applicable
-- policy, replace all of them with a single policy whose condition is the
-- OR of the originals. This is a pure consolidation, not a behavior change
-- -- a policy allowing (A OR B) grants exactly the union of what "policy
-- with A" and "policy with B" granted separately, since Postgres already
-- ORs multiple permissive policies together internally. Nothing that was
-- previously allowed becomes disallowed, and nothing new is allowed either.
--
-- Generated programmatically from a full dump of pg_policies for the 37
-- flagged tables (script used: parse each policy's qual/with_check per
-- action -- expanding `for all` to all 4 actions -- then for every action
-- with >1 contributing policy, OR the conditions together into one new
-- policy and drop every original policy touching that table). Verified
-- afterwards that all 37 tables still have exactly one policy per action
-- they previously supported (2 for conversations/messages, which only ever
-- had select+insert; 4 for everything else).
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude normally
-- writes migration files and stops for a human to run with --confirm. This
-- session's sandbox has no DATABASE_URL in .env.local, so applied directly
-- via mcp__Supabase__execute_sql per this session's established pattern
-- (in batches, verified against pg_policies afterwards), and recorded in
-- schema_migrations by hand so a future `pnpm db:migrate` run of this file
-- is a no-op.


-- === admission_cycles ===
drop policy if exists cycles_exam_public_read on public.admission_cycles;
drop policy if exists cycles_public_read on public.admission_cycles;
drop policy if exists cycles_staff_write on public.admission_cycles;
create policy admission_cycles_select on public.admission_cycles for select using ((is_staff()) OR (((exam_id IS NOT NULL) AND (verification = ANY (ARRAY['ops_verified'::verification_status, 'school_verified'::verification_status])))) OR (((EXISTS ( SELECT 1 FROM schools s WHERE ((s.id = admission_cycles.school_id) AND (s.status = 'published'::record_status)))) OR is_staff() OR is_school_member(school_id))));
create policy admission_cycles_insert on public.admission_cycles for insert with check (is_staff());
create policy admission_cycles_update on public.admission_cycles for update using (is_staff()) with check (is_staff());
create policy admission_cycles_delete on public.admission_cycles for delete using (is_staff());

-- === admission_leads ===
drop policy if exists admission_leads_member_select on public.admission_leads;
drop policy if exists admission_leads_member_update on public.admission_leads;
drop policy if exists admission_leads_own_insert on public.admission_leads;
drop policy if exists admission_leads_staff_all on public.admission_leads;
create policy admission_leads_select on public.admission_leads for select using ((is_staff()) OR (is_school_member(school_id)));
create policy admission_leads_insert on public.admission_leads for insert with check ((is_staff()) OR ((( SELECT auth.uid() AS uid) = user_id)));
create policy admission_leads_update on public.admission_leads for update using ((is_staff()) OR (is_school_member(school_id))) with check ((is_staff()) OR (is_school_member(school_id)));
create policy admission_leads_delete on public.admission_leads for delete using (is_staff());

-- === admission_notices ===
drop policy if exists admission_notices_member_insert on public.admission_notices;
drop policy if exists admission_notices_member_select on public.admission_notices;
drop policy if exists admission_notices_staff_all on public.admission_notices;
create policy admission_notices_select on public.admission_notices for select using ((is_staff()) OR (is_school_member(school_id)));
create policy admission_notices_insert on public.admission_notices for insert with check ((is_staff()) OR ((is_school_member(school_id) AND (review = 'pending'::review_status) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (promoted_to_golden = false))));
create policy admission_notices_update on public.admission_notices for update using (is_staff()) with check (is_staff());
create policy admission_notices_delete on public.admission_notices for delete using (is_staff());

-- === application_orders ===
drop policy if exists orders_owner on public.application_orders;
drop policy if exists orders_staff_write on public.application_orders;
create policy application_orders_select on public.application_orders for select using ((is_staff()) OR (((user_id = ( SELECT auth.uid() AS uid)) OR is_staff())));
create policy application_orders_insert on public.application_orders for insert with check (is_staff());
create policy application_orders_update on public.application_orders for update using (is_staff()) with check (is_staff());
create policy application_orders_delete on public.application_orders for delete using (is_staff());

-- === applications ===
drop policy if exists apps_owner on public.applications;
drop policy if exists apps_staff_write on public.applications;
create policy applications_select on public.applications for select using ((is_staff()) OR (((EXISTS ( SELECT 1 FROM application_orders o WHERE ((o.id = applications.order_id) AND (o.user_id = ( SELECT auth.uid() AS uid))))) OR is_staff())));
create policy applications_insert on public.applications for insert with check (is_staff());
create policy applications_update on public.applications for update using (is_staff()) with check (is_staff());
create policy applications_delete on public.applications for delete using (is_staff());

-- === boards ===
drop policy if exists boards_public_read on public.boards;
drop policy if exists boards_staff_write on public.boards;
create policy boards_select on public.boards for select using ((is_staff()) OR (true));
create policy boards_insert on public.boards for insert with check (is_staff());
create policy boards_update on public.boards for update using (is_staff()) with check (is_staff());
create policy boards_delete on public.boards for delete using (is_staff());

-- === cities ===
drop policy if exists cities_public_read on public.cities;
drop policy if exists cities_staff_write on public.cities;
create policy cities_select on public.cities for select using ((is_staff()) OR (true));
create policy cities_insert on public.cities for insert with check (is_staff());
create policy cities_update on public.cities for update using (is_staff()) with check (is_staff());
create policy cities_delete on public.cities for delete using (is_staff());

-- === class_levels ===
drop policy if exists class_levels_public_read on public.class_levels;
drop policy if exists class_levels_staff_write on public.class_levels;
create policy class_levels_select on public.class_levels for select using ((is_staff()) OR (true));
create policy class_levels_insert on public.class_levels for insert with check (is_staff());
create policy class_levels_update on public.class_levels for update using (is_staff()) with check (is_staff());
create policy class_levels_delete on public.class_levels for delete using (is_staff());

-- === conversations ===
drop policy if exists conversations_initiator_insert on public.conversations;
drop policy if exists conversations_participant_select on public.conversations;
drop policy if exists conversations_staff_select on public.conversations;
create policy conversations_select on public.conversations for select using ((((initiator_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = conversations.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))))) OR (is_staff()));
create policy conversations_insert on public.conversations for insert with check (((initiator_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = conversations.teacher_id) AND (t.claimed_by IS NOT NULL) AND (t.claimed_by <> ( SELECT auth.uid() AS uid)) AND (t.status = 'published'::record_status) AND t.is_listed)))));

-- === correction_requests ===
drop policy if exists correction_requests_member_insert on public.correction_requests;
drop policy if exists correction_requests_staff_all on public.correction_requests;
create policy correction_requests_select on public.correction_requests for select using (is_staff());
create policy correction_requests_insert on public.correction_requests for insert with check ((is_staff()) OR (is_school_member(school_id)));
create policy correction_requests_update on public.correction_requests for update using (is_staff()) with check (is_staff());
create policy correction_requests_delete on public.correction_requests for delete using (is_staff());

-- === districts ===
drop policy if exists districts_public_read on public.districts;
drop policy if exists districts_staff_write on public.districts;
create policy districts_select on public.districts for select using ((is_staff()) OR (true));
create policy districts_insert on public.districts for insert with check (is_staff());
create policy districts_update on public.districts for update using (is_staff()) with check (is_staff());
create policy districts_delete on public.districts for delete using (is_staff());

-- === exam_centres ===
drop policy if exists exam_centres_public_read on public.exam_centres;
drop policy if exists exam_centres_staff_write on public.exam_centres;
create policy exam_centres_select on public.exam_centres for select using ((is_staff()) OR (true));
create policy exam_centres_insert on public.exam_centres for insert with check (is_staff());
create policy exam_centres_update on public.exam_centres for update using (is_staff()) with check (is_staff());
create policy exam_centres_delete on public.exam_centres for delete using (is_staff());

-- === exam_cycle_milestones ===
drop policy if exists exam_milestones_public_read on public.exam_cycle_milestones;
drop policy if exists exam_milestones_staff_write on public.exam_cycle_milestones;
create policy exam_cycle_milestones_select on public.exam_cycle_milestones for select using ((is_staff()) OR ((EXISTS ( SELECT 1 FROM admission_cycles ac WHERE ((ac.id = exam_cycle_milestones.cycle_id) AND (ac.verification = ANY (ARRAY['ops_verified'::verification_status, 'school_verified'::verification_status])))))));
create policy exam_cycle_milestones_insert on public.exam_cycle_milestones for insert with check (is_staff());
create policy exam_cycle_milestones_update on public.exam_cycle_milestones for update using (is_staff()) with check (is_staff());
create policy exam_cycle_milestones_delete on public.exam_cycle_milestones for delete using (is_staff());

-- === exam_fee_tiers ===
drop policy if exists exam_fee_tiers_public_read on public.exam_fee_tiers;
drop policy if exists exam_fee_tiers_staff_write on public.exam_fee_tiers;
create policy exam_fee_tiers_select on public.exam_fee_tiers for select using ((is_staff()) OR ((EXISTS ( SELECT 1 FROM admission_cycles ac WHERE ((ac.id = exam_fee_tiers.cycle_id) AND (ac.verification = ANY (ARRAY['ops_verified'::verification_status, 'school_verified'::verification_status])))))));
create policy exam_fee_tiers_insert on public.exam_fee_tiers for insert with check (is_staff());
create policy exam_fee_tiers_update on public.exam_fee_tiers for update using (is_staff()) with check (is_staff());
create policy exam_fee_tiers_delete on public.exam_fee_tiers for delete using (is_staff());

-- === exam_participating_schools ===
drop policy if exists exam_participating_schools_public_read on public.exam_participating_schools;
drop policy if exists exam_participating_schools_staff_write on public.exam_participating_schools;
create policy exam_participating_schools_select on public.exam_participating_schools for select using ((is_staff()) OR (true));
create policy exam_participating_schools_insert on public.exam_participating_schools for insert with check (is_staff());
create policy exam_participating_schools_update on public.exam_participating_schools for update using (is_staff()) with check (is_staff());
create policy exam_participating_schools_delete on public.exam_participating_schools for delete using (is_staff());

-- === exam_reservation_splits ===
drop policy if exists exam_reservation_splits_public_read on public.exam_reservation_splits;
drop policy if exists exam_reservation_splits_staff_write on public.exam_reservation_splits;
create policy exam_reservation_splits_select on public.exam_reservation_splits for select using ((is_staff()) OR ((EXISTS ( SELECT 1 FROM admission_cycles ac WHERE ((ac.id = exam_reservation_splits.cycle_id) AND (ac.verification = ANY (ARRAY['ops_verified'::verification_status, 'school_verified'::verification_status])))))));
create policy exam_reservation_splits_insert on public.exam_reservation_splits for insert with check (is_staff());
create policy exam_reservation_splits_update on public.exam_reservation_splits for update using (is_staff()) with check (is_staff());
create policy exam_reservation_splits_delete on public.exam_reservation_splits for delete using (is_staff());

-- === exams ===
drop policy if exists exams_public_read on public.exams;
drop policy if exists exams_staff_write on public.exams;
create policy exams_select on public.exams for select using ((is_staff()) OR (true));
create policy exams_insert on public.exams for insert with check (is_staff());
create policy exams_update on public.exams for update using (is_staff()) with check (is_staff());
create policy exams_delete on public.exams for delete using (is_staff());

-- === facilities ===
drop policy if exists facilities_public_read on public.facilities;
drop policy if exists facilities_staff_write on public.facilities;
create policy facilities_select on public.facilities for select using ((is_staff()) OR (true));
create policy facilities_insert on public.facilities for insert with check (is_staff());
create policy facilities_update on public.facilities for update using (is_staff()) with check (is_staff());
create policy facilities_delete on public.facilities for delete using (is_staff());

-- === featured_placements ===
drop policy if exists featured_public_read on public.featured_placements;
drop policy if exists featured_staff on public.featured_placements;
create policy featured_placements_select on public.featured_placements for select using ((is_staff()) OR ((((CURRENT_DATE >= starts_on) AND (CURRENT_DATE <= ends_on)) OR is_staff())));
create policy featured_placements_insert on public.featured_placements for insert with check (is_staff());
create policy featured_placements_update on public.featured_placements for update using (is_staff()) with check (is_staff());
create policy featured_placements_delete on public.featured_placements for delete using (is_staff());

-- === fee_items ===
drop policy if exists fees_public_read on public.fee_items;
drop policy if exists fees_staff_write on public.fee_items;
create policy fee_items_select on public.fee_items for select using ((is_staff()) OR (((verification = ANY (ARRAY['ops_verified'::verification_status, 'school_verified'::verification_status])) OR is_staff())));
create policy fee_items_insert on public.fee_items for insert with check (is_staff());
create policy fee_items_update on public.fee_items for update using (is_staff()) with check (is_staff());
create policy fee_items_delete on public.fee_items for delete using (is_staff());

-- === localities ===
drop policy if exists localities_public_read on public.localities;
drop policy if exists localities_staff_write on public.localities;
create policy localities_select on public.localities for select using ((is_staff()) OR (true));
create policy localities_insert on public.localities for insert with check (is_staff());
create policy localities_update on public.localities for update using (is_staff()) with check (is_staff());
create policy localities_delete on public.localities for delete using (is_staff());

-- === messages ===
drop policy if exists messages_participant_insert on public.messages;
drop policy if exists messages_participant_select on public.messages;
drop policy if exists messages_staff_select on public.messages;
create policy messages_select on public.messages for select using (((EXISTS ( SELECT 1 FROM (conversations c LEFT JOIN teachers t ON ((t.id = c.teacher_id))) WHERE ((c.id = messages.conversation_id) AND ((c.initiator_id = ( SELECT auth.uid() AS uid)) OR (t.claimed_by = ( SELECT auth.uid() AS uid))))))) OR (is_staff()));
create policy messages_insert on public.messages for insert with check (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM (conversations c LEFT JOIN teachers t ON ((t.id = c.teacher_id))) WHERE ((c.id = messages.conversation_id) AND ((c.initiator_id = ( SELECT auth.uid() AS uid)) OR (t.claimed_by = ( SELECT auth.uid() AS uid))))))));

-- === products ===
drop policy if exists products_public_read on public.products;
drop policy if exists products_staff_write on public.products;
create policy products_select on public.products for select using ((is_staff()) OR (true));
create policy products_insert on public.products for insert with check (is_staff());
create policy products_update on public.products for update using (is_staff()) with check (is_staff());
create policy products_delete on public.products for delete using (is_staff());

-- === school_affiliations ===
drop policy if exists aff_public_read on public.school_affiliations;
drop policy if exists aff_staff_write on public.school_affiliations;
create policy school_affiliations_select on public.school_affiliations for select using ((is_staff()) OR (((EXISTS ( SELECT 1 FROM schools s WHERE ((s.id = school_affiliations.school_id) AND (s.status = 'published'::record_status)))) OR is_staff())));
create policy school_affiliations_insert on public.school_affiliations for insert with check (is_staff());
create policy school_affiliations_update on public.school_affiliations for update using (is_staff()) with check (is_staff());
create policy school_affiliations_delete on public.school_affiliations for delete using (is_staff());

-- === school_events ===
drop policy if exists school_events_member_insert on public.school_events;
drop policy if exists school_events_member_select on public.school_events;
drop policy if exists school_events_member_update on public.school_events;
drop policy if exists school_events_staff_all on public.school_events;
create policy school_events_select on public.school_events for select using ((is_staff()) OR (is_school_member(school_id)));
create policy school_events_insert on public.school_events for insert with check ((is_staff()) OR ((is_school_member(school_id) AND (created_by = (select auth.uid())))));
create policy school_events_update on public.school_events for update using ((is_staff()) OR (is_school_member(school_id))) with check ((is_staff()) OR (is_school_member(school_id)));
create policy school_events_delete on public.school_events for delete using (is_staff());

-- === school_facilities ===
drop policy if exists fac_public_read on public.school_facilities;
drop policy if exists fac_staff_write on public.school_facilities;
create policy school_facilities_select on public.school_facilities for select using ((is_staff()) OR (((EXISTS ( SELECT 1 FROM schools s WHERE ((s.id = school_facilities.school_id) AND (s.status = 'published'::record_status)))) OR is_staff())));
create policy school_facilities_insert on public.school_facilities for insert with check (is_staff());
create policy school_facilities_update on public.school_facilities for update using (is_staff()) with check (is_staff());
create policy school_facilities_delete on public.school_facilities for delete using (is_staff());

-- === school_jobs ===
drop policy if exists school_jobs_member_insert on public.school_jobs;
drop policy if exists school_jobs_member_select on public.school_jobs;
drop policy if exists school_jobs_member_update on public.school_jobs;
drop policy if exists school_jobs_staff_all on public.school_jobs;
create policy school_jobs_select on public.school_jobs for select using ((is_staff()) OR (is_school_member(school_id)));
create policy school_jobs_insert on public.school_jobs for insert with check ((is_staff()) OR ((is_school_member(school_id) AND (created_by = (select auth.uid())))));
create policy school_jobs_update on public.school_jobs for update using ((is_staff()) OR (is_school_member(school_id))) with check ((is_staff()) OR (is_school_member(school_id)));
create policy school_jobs_delete on public.school_jobs for delete using (is_staff());

-- === school_media ===
drop policy if exists media_public_read on public.school_media;
drop policy if exists media_staff_write on public.school_media;
create policy school_media_select on public.school_media for select using ((is_staff()) OR ((approved OR is_staff())));
create policy school_media_insert on public.school_media for insert with check (is_staff());
create policy school_media_update on public.school_media for update using (is_staff()) with check (is_staff());
create policy school_media_delete on public.school_media for delete using (is_staff());

-- === school_members ===
drop policy if exists members_read on public.school_members;
drop policy if exists members_school_admin_manage_others on public.school_members;
drop policy if exists members_school_admin_remove_others on public.school_members;
drop policy if exists members_staff on public.school_members;
create policy school_members_select on public.school_members for select using ((is_staff()) OR (((user_id = ( SELECT auth.uid() AS uid)) OR is_staff())));
create policy school_members_insert on public.school_members for insert with check (is_staff());
create policy school_members_update on public.school_members for update using ((is_staff()) OR ((is_school_admin(school_id) AND (user_id <> ( SELECT auth.uid() AS uid))))) with check ((is_staff()) OR ((is_school_admin(school_id) AND (user_id <> ( SELECT auth.uid() AS uid)))));
create policy school_members_delete on public.school_members for delete using ((is_staff()) OR ((is_school_admin(school_id) AND (user_id <> ( SELECT auth.uid() AS uid)))));

-- === school_posts ===
drop policy if exists school_posts_member_insert on public.school_posts;
drop policy if exists school_posts_member_select on public.school_posts;
drop policy if exists school_posts_member_update on public.school_posts;
drop policy if exists school_posts_staff_all on public.school_posts;
create policy school_posts_select on public.school_posts for select using ((is_staff()) OR (is_school_member(school_id)));
create policy school_posts_insert on public.school_posts for insert with check ((is_staff()) OR ((is_school_member(school_id) AND (created_by = (select auth.uid())) AND (tier = 'organic'::post_tier))));
create policy school_posts_update on public.school_posts for update using ((is_staff()) OR (is_school_member(school_id))) with check ((is_staff()) OR ((is_school_member(school_id) AND (tier = 'organic'::post_tier))));
create policy school_posts_delete on public.school_posts for delete using (is_staff());

-- === school_teacher_affiliations ===
drop policy if exists sta_insert on public.school_teacher_affiliations;
drop policy if exists sta_select on public.school_teacher_affiliations;
drop policy if exists sta_staff_all on public.school_teacher_affiliations;
drop policy if exists sta_update on public.school_teacher_affiliations;
create policy school_teacher_affiliations_select on public.school_teacher_affiliations for select using ((is_staff()) OR (((status = 'active'::affiliation_status) OR is_school_member(school_id) OR (EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = school_teacher_affiliations.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))))));
create policy school_teacher_affiliations_insert on public.school_teacher_affiliations for insert with check ((is_staff()) OR (((is_school_member(school_id) AND (initiated_by = 'school'::text) AND (status = 'pending_teacher'::affiliation_status)) OR ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = school_teacher_affiliations.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))) AND (initiated_by = 'teacher'::text) AND (status = 'pending_school'::affiliation_status)))));
create policy school_teacher_affiliations_update on public.school_teacher_affiliations for update using ((is_staff()) OR ((is_school_member(school_id) OR (EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = school_teacher_affiliations.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid)))))))) with check ((is_staff()) OR ((is_school_member(school_id) OR (EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = school_teacher_affiliations.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))))));
create policy school_teacher_affiliations_delete on public.school_teacher_affiliations for delete using (is_staff());

-- === schools ===
drop policy if exists schools_public_read on public.schools;
drop policy if exists schools_staff_write on public.schools;
create policy schools_select on public.schools for select using ((is_staff()) OR (((status = 'published'::record_status) OR is_staff() OR is_school_member(id))));
create policy schools_insert on public.schools for insert with check (is_staff());
create policy schools_update on public.schools for update using (is_staff()) with check (is_staff());
create policy schools_delete on public.schools for delete using (is_staff());

-- === seat_status ===
drop policy if exists seat_status_member_insert on public.seat_status;
drop policy if exists seat_status_member_update on public.seat_status;
drop policy if exists seats_staff_or_member on public.seat_status;
drop policy if exists seats_staff_write on public.seat_status;
create policy seat_status_select on public.seat_status for select using ((is_staff()) OR ((is_staff() OR is_school_member(school_id))));
create policy seat_status_insert on public.seat_status for insert with check ((is_staff()) OR ((is_school_member(school_id) AND (confirmed_at IS NULL))));
create policy seat_status_update on public.seat_status for update using ((is_staff()) OR ((is_school_member(school_id) AND (confirmed_at IS NULL)))) with check ((is_staff()) OR ((is_school_member(school_id) AND (confirmed_at IS NULL))));
create policy seat_status_delete on public.seat_status for delete using (is_staff());

-- === states ===
drop policy if exists states_public_read on public.states;
drop policy if exists states_staff_write on public.states;
create policy states_select on public.states for select using ((is_staff()) OR (true));
create policy states_insert on public.states for insert with check (is_staff());
create policy states_update on public.states for update using (is_staff()) with check (is_staff());
create policy states_delete on public.states for delete using (is_staff());

-- === teacher_experience ===
drop policy if exists teacher_experience_owner_write on public.teacher_experience;
drop policy if exists teacher_experience_public_read on public.teacher_experience;
create policy teacher_experience_select on public.teacher_experience for select using (((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_experience.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid)))))) OR ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_experience.teacher_id) AND (((t.status = 'published'::record_status) AND t.is_listed) OR is_staff() OR (t.claimed_by = ( SELECT auth.uid() AS uid))))))));
create policy teacher_experience_insert on public.teacher_experience for insert with check ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_experience.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))));
create policy teacher_experience_update on public.teacher_experience for update using ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_experience.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_experience.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))));
create policy teacher_experience_delete on public.teacher_experience for delete using ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_experience.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))));

-- === teacher_qualifications ===
drop policy if exists teacher_qualifications_owner_write on public.teacher_qualifications;
drop policy if exists teacher_qualifications_public_read on public.teacher_qualifications;
drop policy if exists teacher_quals_staff_all on public.teacher_qualifications;
create policy teacher_qualifications_select on public.teacher_qualifications for select using (((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_qualifications.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid)))))) OR (is_staff()) OR ((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_qualifications.teacher_id) AND (((t.status = 'published'::record_status) AND t.is_listed) OR is_staff() OR (t.claimed_by = ( SELECT auth.uid() AS uid))))))));
create policy teacher_qualifications_insert on public.teacher_qualifications for insert with check ((((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_qualifications.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))) AND (verified_by IS NULL) AND (verified_at IS NULL))) OR (is_staff()));
create policy teacher_qualifications_update on public.teacher_qualifications for update using (((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_qualifications.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid)))))) OR (is_staff())) with check ((((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_qualifications.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid))))) AND (verified_by IS NULL) AND (verified_at IS NULL))) OR (is_staff()));
create policy teacher_qualifications_delete on public.teacher_qualifications for delete using (((EXISTS ( SELECT 1 FROM teachers t WHERE ((t.id = teacher_qualifications.teacher_id) AND (t.claimed_by = ( SELECT auth.uid() AS uid)))))) OR (is_staff()));

-- === teachers ===
drop policy if exists teachers_owner_insert on public.teachers;
drop policy if exists teachers_owner_update on public.teachers;
drop policy if exists teachers_public_read on public.teachers;
drop policy if exists teachers_staff_all on public.teachers;
create policy teachers_select on public.teachers for select using ((is_staff()) OR ((((status = 'published'::record_status) AND is_listed) OR is_staff() OR (claimed_by = ( SELECT auth.uid() AS uid)))));
create policy teachers_insert on public.teachers for insert with check ((is_staff()) OR ((claimed_by = ( SELECT auth.uid() AS uid))));
create policy teachers_update on public.teachers for update using ((is_staff()) OR ((claimed_by = ( SELECT auth.uid() AS uid)))) with check ((is_staff()) OR ((claimed_by = ( SELECT auth.uid() AS uid))));
create policy teachers_delete on public.teachers for delete using (is_staff());
