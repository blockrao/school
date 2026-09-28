-- api.public_school_redirects: every non-canonical way a school has been
-- addressed, mapped to the canonical slug (D-121 §8–§9). One row per source key;
-- the app 301s to /school/{to_slug} in one hop.
--   kind 'merged'  — the absorbed school's slug and school_code → survivor
--   kind 'alias'   — alias / retired slugs from school_slug_redirects
-- Legacy /{city}/{slug}-{school_code} URLs resolve through school_code: for live
-- schools via api.public_schools, for merged ones via this view.
create or replace view api.public_school_redirects as
select s.slug as from_slug, s.school_code as from_code, s.id as from_id,
       survivor.slug as to_slug, 'merged'::text as kind
from schools s
join schools survivor on survivor.id = s.merged_into
union all
select r.slug, null::int, null::uuid, coalesce(survivor.slug, s.slug), r.reason
from school_slug_redirects r
join schools s on s.id = r.school_id
left join schools survivor on survivor.id = s.merged_into;
