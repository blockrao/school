# Data coverage report — 2026-09-25

Read-only analysis against the live Supabase database (ap-southeast-1). Queried via
`DATABASE_URL` (not `DATABASE_URL_RO`) — `claude_ro` cannot see any school data at all
(see [Note on methodology](#note-on-methodology)). No writes, no schema changes; this
file is the only output.

## Summary numbers

- **10,548 schools** total. **8,893 (84.3%)** have a district (and therefore a state);
  **1,655 (15.7%)** have neither.
- **0 schools** have a `city_id`. **21 (0.2%)** have a `locality_id` — all 21 are in the
  Jaipur pilot batch, not Delhi/Gurugram.
- **21 schools (0.2%)** have coordinates. All 21 are the same Jaipur pilot batch.
- **374 schools (3.5%)** have a board affiliation row. **10,548 (100%)** have at least
  one identifier row (UDISE or similar) — identifiers are the one thing that's fully
  populated.
- **0 schools** have fee items, admission cycles, or seat status. 50 (0.5%) have an
  admission notice.
- **0 of 48,319** `field_provenance` rows have `verified_at` set — not "mostly
  unverified," *literally none*. Nothing in this database has been through a human
  verification pass yet.
- **204 schools (1.9%)** share a slug with at least one other school (95 distinct
  duplicated slugs). Mitigated by canonical URLs being `id`-prefixed, not slug-only.
- The one row in `cities` is **Jaipur**, not Delhi or Gurugram — this is exactly the
  known "mock data uses Jaipur" issue from `docs/screen-map.md`, but it means the
  *entire* city/locality hierarchy currently in the database is placeholder data,
  disconnected from all 10,548 real schools.
- The `anon` role has table-level `SELECT` **granted on all 50 tables and views**,
  including `audit_log`, `sales_accounts`, `sales_activities`, `ops_tasks`, `children`,
  `profiles`, `consents`. Empirically, RLS blocks all of them — every sensitive table
  returned 0 rows when queried as `anon`. But the grant itself is broader than
  necessary; RLS is the *only* thing standing between `anon` and that data, with no
  grant-level backstop. See [§3](#3-public-exposure-as-anon).

## Note on methodology

You asked for `DATABASE_URL_RO` only. It can't produce this report — `claude_ro` is a
raw Postgres login with no Supabase auth session, so the `schools_public_read` RLS
policy (`status = 'published' OR is_staff() OR is_school_member(id)`) filters out all
10,548 rows, since none currently have `status = 'published'`. Same for every table
joined to `schools`. Confirmed with the user before switching; used `DATABASE_URL`
(the `postgres` role, which bypasses RLS) for this report only, SELECT-only throughout.

## 1. School coverage

### Overall

| Field | Have it | % of 10,548 |
| --- | ---: | ---: |
| State / district | 8,893 | 84.3% |
| City | 0 | 0.0% |
| Locality | 21 | 0.2% |
| Lat/lng (`location`) | 21 | 0.2% |
| Board affiliation | 374 | 3.5% |
| Identifier (UDISE/CBSE aff. no./etc.) | 10,548 | 100.0% |
| Fee items | 0 | 0.0% |
| Admission cycle | 0 | 0.0% |
| Admission notice | 50 | 0.5% |
| Seat status | 0 | 0.0% |

### By state

| State | Schools | Lat/lng | Affiliation |
| --- | ---: | ---: | ---: |
| Haryana | 8,636 | 0 | 117 |
| *(no district linked)* | 1,655 | 0 | 0 |
| Delhi | 219 | 0 | 219 |
| Rajasthan | 38 | 21 | 38 |

Rajasthan (38 schools, all in Jaipur) is almost certainly leftover pilot/demo data —
`docs/screen-map.md` already flags Jaipur mock data as something to remove. It's the
*only* place lat/lng coverage is non-zero.

### By district (all 37 groups, including "no district")

| State | District | Schools | Affiliation | Identifier |
| --- | --- | ---: | ---: | ---: |
| — | *(none)* | 1,655 | 0 | 1,655 |
| Haryana | Faridabad | 1,137 | 25 | 1,137 |
| Haryana | Hisar | 648 | 12 | 648 |
| Haryana | Gurugram | 534 | 10 | 534 |
| Haryana | Panipat | 520 | 9 | 520 |
| Haryana | Palwal | 515 | 0 | 515 |
| Haryana | Sonipat | 511 | 9 | 511 |
| Haryana | Karnal | 469 | 3 | 469 |
| Haryana | Bhiwani | 408 | 6 | 408 |
| Haryana | Rohtak | 399 | 25 | 399 |
| Haryana | Jind | 353 | 0 | 353 |
| Haryana | Jhajjar | 347 | 0 | 347 |
| Haryana | Kaithal | 327 | 0 | 327 |
| Haryana | Yamunanagar | 327 | 0 | 327 |
| Haryana | Mahendragarh | 292 | 1 | 292 |
| Haryana | Sirsa | 290 | 0 | 290 |
| Haryana | Kurukshetra | 264 | 0 | 264 |
| Haryana | Rewari | 262 | 9 | 262 |
| Haryana | Ambala | 245 | 7 | 245 |
| Haryana | Fatehabad | 240 | 0 | 240 |
| Haryana | Nuh Mewat | 193 | 0 | 193 |
| Haryana | Charkhi Dadri | 160 | 0 | 160 |
| Haryana | Panchkula | 113 | 1 | 113 |
| Delhi | North West Delhi | 78 | 78 | 78 |
| Delhi | South West Delhi | 46 | 46 | 46 |
| Haryana | *Yamuna Nagar (dup.)* | 46 | 0 | 46 |
| Rajasthan | Jaipur | 38 | 38 | 38 |
| Delhi | New Delhi | 31 | 31 | 31 |
| Haryana | *Sonepat (dup.)* | 25 | 0 | 25 |
| Delhi | North Delhi | 22 | 22 | 22 |
| Delhi | West Delhi | 16 | 16 | 16 |
| Delhi | East Delhi | 15 | 15 | 15 |
| Delhi | South Delhi | 9 | 9 | 9 |
| Haryana | *Mohindergarh (dup.)* | 8 | 0 | 8 |
| Haryana | *Nuh (dup.)* | 3 | 0 | 3 |
| Delhi | Central Delhi | 1 | 1 | 1 |
| Delhi | North East Delhi | 1 | 1 | 1 |

**Data-quality issue found while running this**: four districts are duplicated under
two spellings/cases each — Yamunanagar/YAMUNA NAGAR, Sonipat/SONEPAT,
Mahendragarh/MOHINDERGARH, Nuh Mewat/NUH — splitting 82 schools across the wrong
district row. Looks like two ingestion passes used inconsistent naming (Title Case vs
ALL CAPS) and never got reconciled.

### Freshness

Every one of the 48,319 `field_provenance` rows tracks a field's source, but **none**
have `verified_at` set:

| Bucket | Schools |
| --- | ---: |
| none (never verified) | 10,548 |
| <7d / 7–30d / 30–180d / older | 0 |

Average 4.6 provenance rows per school — source tracking is happening at real scale,
verification hasn't started.

### Duplicate slugs

95 distinct slugs are shared by more than one school; 204 schools total. Worst
offender: `govt-boys-sr-sec-school-north-west-delhi`, shared by **10** different
government schools in the same district — a generic auto-generated slug pattern for
government schools, not a real collision of similarly-named private schools. Grouping
by district instead of city (since city is universally empty) surfaces the same
pattern: duplicates cluster where a generic name template was used.

Not a routing bug — CLAUDE.md's canonical URL scheme is `/school/[id]-[slug]`, so the
ID disambiguates even when slugs collide. Worth cleaning up for SEO/readability, not
urgent for correctness.

## 2. Geography

**The database has exactly 1 city (Jaipur) and 97 localities, all in Jaipur.** Every
locality's `city_id` points at Jaipur; there is no Delhi or Gurugram city row at all.

- Schools mapped to a locality: **21**, all 21 in the Jaipur/Rajasthan batch.
- Schools mapped to a city: **0**.
- Schools with a district but no city: **8,893** — effectively all of them, since city
  is universally unpopulated regardless of district.

This means the *entire* real dataset (8,636 Haryana + 219 Delhi schools) has zero
connection to any city or locality row. The city/locality hierarchy that exists is
100% Jaipur placeholder data, matching the known issue already in
`docs/screen-map.md` ("Mock data uses Jaipur localities... Seed fixtures must be
Delhi/Gurugram schools").

### Proposal for deriving city/locality (not implemented)

Two viable paths, likely needed together:

1. **Pincode-based lookup.** `schools.pincode` is populated far more often than
   `location` (worth confirming the exact rate — not measured in this report). If
   `localities.pincodes` (a text array) were populated for real Delhi/Gurugram
   localities the way it currently is for Jaipur ones, a straight pincode → locality
   → city join would resolve a large share of schools with no new data collection,
   just seeding real locality/pincode reference data for the launch cities.
2. **PostGIS point-in-polygon**, for the schools that do get geocoded (`location` is
   already a proper geometry/geography column). Requires: (a) actual geocoding of
   `address`/`pincode` into `location` for Haryana/Delhi schools — currently 0 of
   8,855 have it — via a geocoding API or bulk provider; (b) locality/city boundary
   polygons for Delhi and Gurugram (not just centroids, which is all `localities`
   stores today) to do `ST_Contains`.

Given pincode coverage is likely much higher than geocoding coverage, (1) is the
faster win; (2) is the more precise long-term source once real boundary data exists.
Address-string parsing (regex/NLP for locality names) is a fallback for the remainder,
lower confidence.

## 3. Public exposure as `anon`

Tested by connecting as the `postgres` role and `SET ROLE anon`, then running the same
queries a real anon-key client would run through PostgREST/`@supabase/supabase-js`.

**Table-level `SELECT` grant**: all 50 tables and views in `public`, with no
column-level restrictions — a blanket `GRANT SELECT ON ALL TABLES` was applied at some
point, not a per-table allowlist. This includes tables that read as clearly internal:
`audit_log`, `sales_accounts`, `sales_activities`, `ops_tasks`, `data_quality_flags`,
`source_records`, `children`, `consents`, `profiles`, `documents`, `invoices`,
`application_orders`, `correction_requests`, `enquiries`, `school_claims`,
`school_members`.

**Actual rows returned as `anon`** (tested directly, not inferred from grants):

| Table | Rows visible to anon |
| --- | ---: |
| `states`, `districts`, `cities`, `localities`, `boards`, `class_levels`, `facilities`, `products` | full reference-table contents (3/36/1/97/8/16/13/4) |
| `schools`, `public_school_admissions`, `public_seat_status`, `school_affiliations` | **0** — RLS blocks everything until a school is `published` |
| `audit_log`, `sales_accounts`, `sales_activities`, `ops_tasks`, `data_quality_flags`, `source_records`, `children`, `consents`, `profiles`, `documents`, `invoices`, `application_orders`, `correction_requests`, `enquiries`, `sources`, `field_provenance`, `school_identifiers` | **0** — RLS blocks all of them |

**Finding**: no active data leak today — RLS is doing real work, and every sensitive
table came back empty when actually queried as `anon`. But the grant is a real gap:
it's a single layer of defense (RLS) with zero backstop at the grant level. If any one
policy on `audit_log`/`sales_accounts`/`ops_tasks`/etc. is ever dropped, misconfigured,
or has a logic bug (e.g. an `OR true` typo, a missing `WITH CHECK`), that table becomes
instantly and fully readable by anyone with the public anon key — no second layer
would catch it. Worth tightening the grants to match what `anon` should ever
legitimately read (reference tables + published-school views), independent of RLS.

## 4. Five real schools, best → worst populated

`schools.completeness` is 0 for every one of the 753 Gurugram/Delhi schools — not yet
computed, can't be used for ranking. Built a proxy score instead: 1 point each for a
non-null phone, email, website, established_year, about_en, medium, address, pincode,
location, and having a board-affiliation row (max 10). Actual distribution across the
753 Gurugram/Delhi schools: score 6 → 88 schools, 5 → 136, 4 → 5 (rare), 1 → 524
(the floor — most schools).

| | Best (score 6/10) | Upper (5/10) | Rare middle (4/10) | Floor (1/10) | Floor (1/10) |
| --- | --- | --- | --- | --- | --- |
| **Name** | ST Xavier's School | Arya Girls SR Sec School | Kamal International School | Shiksha Bharti P.S., Badshahpur | Shri Ram SR |
| **District** | North Delhi | North Delhi | New Delhi | Gurugram | Gurugram |
| **Address** | 4 Raj Niwas Marg, Civil Lines, Delhi | Teliwara, Delhi | Nangli Sakrawati, Najafgarh Road, New Delhi-43 | *(none)* | *(none)* |
| **Pincode** | 110054 | 110006 | 110043 | *(none)* | *(none)* |
| **Established** | 1960 | 1909 | *(none)* | *(none)* | *(none)* |
| **Website** | www.svmmunger.com | *(none)* | *(none)* | *(none)* | *(none)* |
| **Phone / Email** | *(none)* / *(none)* | *(none)* / *(none)* | *(none)* / *(none)* | *(none)* / *(none)* | *(none)* / *(none)* |
| **Lat/lng** | *(none)* | *(none)* | *(none)* | *(none)* | *(none)* |
| **Board affiliation** | CBSE 2730060 | CBSE 2788007 | *(none)* | *(none)* | *(none)* |
| **Identifier** | CBSE aff. no. only | CBSE aff. no. only | *(none)* | UDISE 06180300902, Haryana code 21840 | UDISE 06180203604, Haryana code 21782 |
| **`field_provenance` rows** | 7 | 6 | 5 | 3 | 3 |
| **Status / verification** | draft / unverified | draft / unverified | draft / unverified | draft / unverified | draft / unverified |

Even the "best" Delhi school here — a real, identifiable CBSE school — has no phone,
no email, and no coordinates. Every field that does exist came from source ingestion,
not verification: `status` is `draft` and `verification` is `unverified` across all
five, matching §1's finding that 0 of 48,319 provenance rows have ever been checked.
The two Gurugram schools at the floor score have almost nothing beyond a name,
district, and government identifiers (UDISE/Haryana school code) — no address at all,
meaning even a basic fact block or map pin isn't buildable for them today.
