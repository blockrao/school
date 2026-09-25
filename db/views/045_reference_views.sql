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

-- Minimal: only what the board-name lookups in public-adapter.ts need
-- (school_id -> board_id). affiliation_no/level/valid_from/valid_to aren't
-- consumed by any built page yet (School Page v2 isn't built) and stay
-- unexposed until they are and a proper source-gated view is designed for them.
create or replace view api.public_school_affiliations as
select school_id, board_id
from school_affiliations;
