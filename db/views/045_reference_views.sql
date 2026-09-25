-- Pure reference data — no redaction/source rules apply (nothing sensitive, no
-- trust-gating needed), but public-adapter.ts should read ONLY api.* views, so
-- these exist purely to eliminate raw-table reads from application code. Kept
-- as separate small views (not folded into public_areas, which is district ×
-- state with a computed launch flag, a different shape) so each stays a plain
-- passthrough.
create or replace view api.public_districts as
select id, name_en, slug, state_id
from districts;

create or replace view api.public_states as
select id, name_en, code
from states;

create or replace view api.public_cities as
select id, name_en, slug, district_id
from cities;

create or replace view api.public_boards as
select id, name_en
from boards;
