-- Hide misclassified government schools (5 Oct 2026).
--
-- Found while pulling CBSE affiliation numbers for a Delhi contact-info
-- enrichment pass: 56 published schools (51 Delhi + 5 Haryana) have names
-- that are unambiguous government-school naming conventions -- "Govt ...
-- Sr. Sec. School", "Govt. Sarvodaya Kanya Vidyalaya", "Rajkiya Pratibha
-- Vikas Vidyalaya" (Rajkiya = government), "Government Model Sanskriti
-- Senior Secondary School" (Haryana's state govt-school program) -- but
-- every one has schools.management = NULL, not 'government' or
-- 'central_government'. That's why the earlier "only 18 government-tagged
-- schools site-wide" check (data-and-trust.md, 5 Oct 2026) missed them:
-- they were never tagged, so they never showed up as government, and
-- stayed published on a platform Prav has confirmed three times this
-- session is private-schools-only, no government schools, ever.
--
-- Scope is deliberately narrow and false-positive-checked: only rows with
-- management IS NULL. Six other schools matched the same name patterns
-- ("Sarvodaya Public School", "Sarvodaya Bal Bharti Public School", "...
-- Opp Govt Petrol Pump Faridabad") but already carry management =
-- 'private_unaided' -- same false-positive shape caught earlier this
-- session in the Faridabad government-school check (a private school's
-- name or address merely mentioning "Govt"/"Sarvodaya"). Those are
-- deliberately excluded and untouched.
--
-- Verified before writing: 56 rows (51 Delhi, 5 Haryana), all
-- status='published', all management IS NULL, all name_en matching one of
-- govt/government/rajkiya/sarvodaya/kendriya vidyalaya/navodaya vidyalaya.
--
-- Also corrects management to 'government' on these same rows (not just
-- hiding them) -- same "fix the bookkeeping, not just the symptom" pattern
-- as 20261005110000_fix_bulk_import_source_type_mislabel.sql -- so a future
-- query of schools.management tells the truth even though these rows are
-- now hidden, and a future UDISE/other re-ingestion pass doesn't silently
-- re-publish them as unclassified again.
--
-- Per Prav's standing rule (scripts/db-migrate.mjs header): Claude writes
-- migration files and stops. A human runs
-- `pnpm db:migrate 20261005130000_hide_misclassified_government_schools.sql --confirm`.

update public.schools
set status = 'hidden',
    management = 'government'
where status = 'published'
  and management is null
  and (
    name_en ~* 'govt' or name_en ~* 'government' or name_en ~* 'rajkiya'
    or name_en ~* 'sarvodaya' or name_en ~* 'kendriya vidyalaya' or name_en ~* 'navodaya vidyalaya'
  );
