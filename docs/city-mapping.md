# City/locality mapping analysis — Jaipur district

Read-only analysis via `DATABASE_URL_RO`. **Nothing in this document has been applied.**
No migration has run, no table has changed. This is a proposal for review.

## Data sources actually available

The brief asked for four signals: address text, source town/village fields, pincode,
coordinates. Checked all four before analyzing:

- **Address text** — present for all 38 schools (`schools.address`).
- **Source town/village fields** — **none exist for Jaipur.** Every `source_records` row
  matched to a Jaipur school comes from a single source, `saras_archive` (CBSE's
  affiliation directory, via archived crawl) — 38/38 records, zero from UDISE, RAJPSP, or
  anything else. That payload's `normalized` shape has `board`/`state`/`address`/`pincode`/
  `district` etc., but no town or village field at all. So this signal is unavailable for
  Jaipur specifically — not filtered out, genuinely absent upstream.
- **Pincode** — present for all 38, but see the ambiguity findings below.
- **Coordinates** — 21/38 schools (55%). All 21 share `geocode_precision = 'locality'`,
  and every one of them sits at **exactly 0 meters** from its nearest locality centroid.
  This means these aren't real rooftop/address geocodes — they were assigned by snapping
  to the centroid of whichever locality the pipeline picked. Treat "has coordinates" here
  as "has a locality assignment already made upstream," not as independent verification.
  This matters for the map: locality-precision points should get the same area/zone
  treatment as pincode-precision points, not an exact pin — neither represents real
  address-level accuracy. (No Jaipur school currently has `geocode_precision = 'pincode'`
  specifically; the principle still applies to what's actually there.)

## Method, per school

For each school: check address text against the 97 `localities` names (and known town
names outside the `cities`/`localities` tables, found by reading the addresses); cross-check
against `localities.pincodes[]`; where coordinates exist, take the nearest-locality-centroid
distance as a signal (with the caveat above — it's circular with the existing geocode, not
independent confirmation). Confidence is high when 2+ signals agree, medium when address
text alone gives a specific, real place name, low when nothing beyond "district = Jaipur"
is available.

## Classification

| Class | Count | % |
|---|---|---|
| City + locality | 25 | 66% |
| City only | 4 | 11% |
| Town | 5 | 13% |
| Rural (village → nearest town) | 2 | 5% |
| Unresolved | 2 | 5% |

### City + locality (25) — examples

- **Golden Era Academy** — address "...JAIPURA JAGATPURA", geocoded to Jagatpura, pincode
  302017 matches Jagatpura. All three signals agree. Confidence: high. Method: combined.
- **Deep International School** — address explicitly says "MAIN SHIPRA PATH MANSAROVER",
  matching two real localities by name — but `pincode = 301001`, which is an Alwar-district
  code, nowhere near Jaipur's 302xxx range. The address text is clearly right and the
  pincode is clearly wrong (data-entry error, not a mapping ambiguity). Confidence: high,
  method: address_text — pincode should not be trusted here.
- **Jayshree Periwal Global School** — address says "JAGATPURA", but pincode 303012 doesn't
  match Jagatpura's listed 302017 (Sector-36 is likely a newer, outer part of a large
  locality with its own postal code). Confidence: medium, method: address_text.

### City only (4) — examples

- **Alpha International Academy** — "SIRSI ROAD, JAIPUR", pincode 302034 not in any
  locality's pincode list. Sirsi Road is a real, large Jaipur corridor without its own
  locality entry (contrast: "200 ft Bypass (Ajmer Road Stretch)" *is* tracked as a
  corridor-locality — Sirsi Road isn't yet). Confidence: low.
- **Shankar Lal Dhanuka Sr Sec...** — address is nearly just the school's own name plus
  "JAMDOLI, JAIPUR". Jamdoli is a real east-Jaipur area, not in `localities`. Confidence: low.
- **Tree House High School** — "KAMALA NEHRU NAGAR, AJMER ROAD" — not matched. Confidence: low.

### Town (5) — a real town within Jaipur *district*, not Jaipur *city*

- **Bombay World School** — Dudu (pincode 303008 — real, ~50km from Jaipur city, near the
  Ajmer border). Confidence: high (explicit name + correct real-world pincode).
- **Sanskar Public School** — Bassi (pincode 303302). Confidence: high.
- **The Asian International School** and **Vinayak International School** — both Chomu
  (pincodes 303704, 303702). Confidence: high.
- **Shri Mahaveer Internatioal School** — "KISHANGARH-RENWAL" (pincode 303603). **Important
  alias-collision risk**: there is a *different, better-known* Kishangarh in Ajmer district
  (pincode 305801 — see the unresolved case below). Any canonical naming must disambiguate
  these explicitly (e.g. "Kishangarh-Renwal (Jaipur)" vs "Kishangarh (Ajmer)"), or future
  address-matching will silently conflate two unrelated towns 100km apart.

### Rural (2) — village-level, needs "Near \<town\>"

- **OM Public School** — address uses "KHASRA NO." (a rural land-parcel identifier, not
  used for urban addresses) and names "TUNGA", a real village/small town near Bagru.
  Proposed label: "Near Tunga". Confidence: medium.
- **Sri Chaitanya Techno School** (`b07e018a-...`) — address is literally "GRAM HARDATPURA
  KHORA BISAL" ("gram" = village in Hindi). This school *has* a geocode (0m from Jhotwara's
  centroid, `geocode_precision = 'locality'`) — the coordinate is misleading here; the
  address text is unambiguous that this is a village, not the Jhotwara urban locality.
  This is the clearest case in the dataset for **not** trusting a locality-precision
  geocode over explicit address text. Proposed label: "Near Hardatpura" (or the nearest
  real town once confirmed — the address alone doesn't name one). Confidence: low on the
  "near which town" part specifically, high on "this is rural."

### Unresolved (2) — flagged for `/ops`, not a mapping-confidence problem

- **M S S Public School** — address literally states "DISTT AJMER" and pincode 305801 is a
  real Ajmer-district code. This school is almost certainly assigned the wrong
  `district_id` (75 = Jaipur) upstream — not a city/locality mapping question at all.
- **Army Public School** — "JAIPUR CANTT ... 56 A.P.O RAJASTHAN", pincode 324008, which
  doesn't match any Jaipur-area range. Military "APO" addresses are genuinely hard to
  geocode (they're administrative, not geographic) — needs a human to confirm whether this
  is really in Jaipur Cantonment or a data entry error.

## Discovered names not yet in `cities`/`localities`

**Towns (real places, distinct from Jaipur city, not in `cities` at all — `cities` has
exactly one row, Jaipur):** Dudu, Bassi, Chomu, Kishangarh-Renwal.

**Candidate new localities/micro-localities** (named in addresses, not in the 97-row
`localities` table): Ambabari, Mahapura, Hathoj, Govindpura, Tagore Nagar, Krishna Nagar,
Jamdoli, Kamala Nehru Nagar (Chordia City), Sirsi Road (as its own corridor entry, the way
"200 ft Bypass" already is).

**Locality name / alias issues found:**
- **Mansarovar ↔ Shipra Path**: both share pincode 302020. Two different schools whose
  addresses explicitly say "MANSAROVAR" were geocoded to "Shipra Path" instead — this reads
  as a systematic pattern (the pipeline picks one locality per shared pincode, not
  necessarily the one the address names), not two isolated errors. Worth checking across
  the other 11 ambiguous-pincode groups too.
- **Malviya Nagar ↔ Jagatpura** (pincode 302017), **Bhankrota ↔ Heerapura**, **Kalwar Road
  ↔ Jhotwara** (pincode 302012), **City Palace ↔ Bapu Bazaar**: same pattern — address
  names one real, listed locality; the existing geocode landed on a different one sharing
  the same pincode.
- **Kishangarh-Renwal (Jaipur) vs Kishangarh (Ajmer)**: not a variant of the same place —
  two real, different towns with similar names in neighboring districts. Flagged above;
  repeating here because it's the highest-risk alias collision in this dataset (a naive
  string-match system would merge them).

## Pincodes spanning city and rural areas

No single pincode in this dataset is shared between a city-locality match and a
rural/village match — the rural cases (Tunga-area 303902, Hardatpura/"Khora Bisal") and
town cases (Dudu 303008, Bassi 303302, Chomu 303702/303704, Kishangarh-Renwal 303603) all
sit in distinct 303xxx ranges, cleanly separate from the city's 302xxx range. The 12
*ambiguous* pincodes found (listed above) are all city-locality-vs-city-locality
collisions, not city-vs-rural.

## Proposed schema (SQL — proposal only, not applied)

```sql
create table if not exists school_city_locality (
  school_id uuid primary key references schools(id) on delete cascade,
  city_id integer references cities(id),
  locality_id integer references localities(id),
  town_name text,            -- set when classification = 'town' and no cities row exists yet
  rural_near_town text,      -- set when classification = 'rural', e.g. "Near Tunga"
  classification text not null
    check (classification in ('city_locality','city_only','town','rural','unresolved')),
  method text not null
    check (method in ('address_text','pincode','coordinates','combined','manual')),
  confidence numeric(3,2) not null check (confidence between 0 and 1),
  notes text,
  assigned_by uuid references profiles(user_id),  -- null for automated assignment
  assigned_at timestamptz not null default now()
);

create table if not exists locality_aliases (
  id bigserial primary key,
  locality_id integer not null references localities(id) on delete cascade,
  alias text not null,
  unique (locality_id, alias)
);
-- seed example: Shipra Path/Mansarovar are NOT aliases of each other (they're both real,
-- distinct localities that happen to share a pincode) — aliases are for spelling variants
-- of the SAME place, e.g. alias "New Sanganer" -> locality "New Sanganer Road".
```

**Rural rule**: `rural_near_town` is set from a real, explicitly-named place in the address
when one exists (OM Public School → "Tunga", from the address itself). When no town is
named (the Hardatpura case), it stays null pending `/ops` review rather than guessing a
nearest town by distance alone — the address said "village," not which town it's near.

## `/ops` review queue (unresolved + low-confidence)

| School | Issue | Suggested action |
|---|---|---|
| M S S Public School | Address says "DISTT AJMER"; pincode matches Ajmer | Confirm/correct `district_id` |
| Army Public School | Pincode 324008 doesn't match any Jaipur range; APO address | Confirm location or flag as unmappable |
| Alpha International Academy | No locality match, low confidence | Manual locality assignment |
| Shankar Lal Dhanuka Sr Sec... | Degenerate address (repeats school name), Jamdoli unmatched | Manual locality assignment |
| Tree House High School | Kamala Nehru Nagar / Chordia City unmatched | Manual locality assignment |
| Sri Chaitanya Techno School (`b07e018a`) | "Rural" per address, but geocoded to an urban locality centroid — geocode should not be trusted here | Confirm nearest town for "Near \<town\>" label |
| Mansarovar/Shipra Path pair, and the 3 other pincode-conflict pairs above | Systematic pattern: address names one locality, existing geocode landed on its pincode-sibling | Re-derive locality from address text where it disagrees with the geocode, for all 12 ambiguous-pincode groups, not just the 2 schools found here |

## How this would scale to other districts

Jaipur is the *best case*: it has a populated `cities`/`localities` table (97 localities
with names, pincodes, and centroids) to match against, and a majority of its schools have
some usable geocode. Almost no other district has this:

- **South West Delhi** (46 schools, the district this repo was built against before this
  message): zero `cities`/`localities` rows exist for any Delhi district. There is nothing
  to match addresses *against* — the method here (address text vs. a known locality table)
  simply has no target. Scaling there means building the reference table first, not running
  this matching approach.
- **Source coverage**: Jaipur's only source is `saras_archive`, with no town/village field
  at all. Other districts are matched from different source mixes (UDISE, state education
  department portals, etc.) — some of those source payloads may carry real
  village/block/tehsil fields UDISE is known for; that needs checking per-district before
  assuming the "source town/village fields" signal is available anywhere else either.
- **Geocode reliability**: the 0-meter-from-centroid pattern found here (geocodes are
  locality-snapped, not independent) is very likely a pipeline-wide behavior, not Jaipur-
  specific — worth confirming, since it changes how much weight coordinates should carry
  as a signal everywhere, not just here.

**Practical order for further districts**: build/import a `localities`-equivalent table for
each launch district first (this is the actual bottleneck, not the matching logic itself,
which generalizes directly), then re-run this same address-text/pincode/coordinate method.

---

**Stopping here for review, per instruction. Nothing applied — no migration run, no table
changed, no code touched.**
