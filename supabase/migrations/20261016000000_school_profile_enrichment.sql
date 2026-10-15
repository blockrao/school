-- Add production columns for school profiles (board, fees, facilities, ratings, admission)
-- 16 Oct 2026: prepare schools table for Gurugram bulk data seeding

alter table schools
  add column board_affiliation text,  -- CBSE, ICSE, IB, ISC, NIOS, ICSEcam, etc
  add column admission_url text,      -- direct URL to admissions page
  add column annual_fee numeric,      -- in rupees (e.g., 850000)
  add column rating float,            -- 0-5 scale from Edustoke/Ezyschooling
  add column review_count integer,    -- number of reviews/ratings
  add column facilities text[],       -- array: swimming, transport, meals, etc
  add column school_type text,        -- day, boarding, day_cum_boarding
  add column curriculum_details text; -- free-form: "IB PYP, MYP & DP; ICSE; IGCSE"

-- Add comments for clarity
comment on column schools.board_affiliation is 'Board affiliation: CBSE, ICSE, IB, ISC, NIOS, etc';
comment on column schools.admission_url is 'Direct URL to school admissions page';
comment on column schools.annual_fee is 'Annual fee in rupees (from portal or official source)';
comment on column schools.rating is 'Average rating 0-5 (from Edustoke, Ezyschooling, etc)';
comment on column schools.review_count is 'Number of reviews/ratings on public portals';
comment on column schools.facilities is 'Array of facilities: swimming, transport, meals, hostel, etc';
comment on column schools.school_type is 'School type: day, boarding, day_cum_boarding';
comment on column schools.curriculum_details is 'Free-form curriculum/board details: e.g., IB PYP, MYP & DP; ICSE; IGCSE';
