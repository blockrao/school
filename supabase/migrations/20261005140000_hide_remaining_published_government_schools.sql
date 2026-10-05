-- Hide the remaining already-tagged government schools (5 Oct 2026).
--
-- Follow-up to 20261005130000 (which hid the 56 schools with a government
-- name but management IS NULL). Checking the live result turned up 18 more
-- published schools that were ALREADY correctly tagged
-- management='government' or 'central_government' the whole time (KGBV --
-- Kasturba Gandhi Balika Vidyalaya -- and Haryana's Mewat Model School
-- scheme among them) but never hidden. The original "only 18 tagged
-- government, effectively none" note in data-and-trust.md (5 Oct, earlier
-- today) treated this as negligible noise, written before Prav's explicit,
-- repeated "no govt schools on the platform, final, fix it forever"
-- (this session, three times). Leaving these 18 published contradicts that
-- directly, so closing it now rather than leaving a known residual.
--
-- Scope: exactly the schools.management value already says -- no name
-- pattern guessing needed here, unlike 20261005130000. Verified before
-- writing: 18 rows (15 'government' + 3 'central_government'), all
-- status='published'.

update public.schools
set status = 'hidden'
where status = 'published'
  and management in ('government', 'central_government');
