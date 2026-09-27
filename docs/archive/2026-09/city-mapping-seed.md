# Jaipur locality seed — from the JaipurCircle CSV export

Source: `data/imports/jaipurcircle_localities.csv` (98 rows, 129 columns) — gitignored,
never committed (confirmed via `git log --all -- localities_rows.csv` before moving it;
empty history, so it was never tracked). Cross-referenced against the repo's own
`lib/generated/locality-slugs.json` / `locality-aliases.json` (`/Users/praveenyadav/jaipurcircle.com`,
read-only, no edits/git commands run there).

**Nothing has been applied.** `supabase/migrations/20260925055444_locality_enrichment_schema.sql`
and `supabase/seeds/jaipur_localities.sql` are new files, not run. You review, then apply
both with `--confirm`.

## What was copied vs. excluded

Copied (structured facts only): `pincode`/`pin_code` → `locality_pincodes`, `geo_lat`/`geo_lng`
→ `centroid`, `nearby_localities` → `locality_neighbors`, `landmarks` → `landmarks`,
`zone`/`ward_number`/`ward_name` → internal columns on `localities` (not exposed by any
`api.*` view — those don't touch `localities` at all today).

**Excluded entirely**, per instruction: `description`, `seo_content`, `seo_blurb`,
`vibe_tags`, `character_tags`, `real_estate`, `best_for`, `known_for`, `not_best_for`,
`pros`/`cons`, `local_insights`, `resident_testimonials`, `resident_reality`,
`civic_reality`, `safety_description`, `traffic_notes`, `parking_notes`, all
`police_station_*` fields, `hospitals`/`schools`/`colleges`/`malls`/`parks` (rich JSON
with ratings/pricing/hours — editorial, not bare facts), `faq_json`, `schema_json`, and
every meta/SEO field. **`parks` was excluded even though 97/98 rows had it** — its entries
carry timings/features (descriptive), not a bare name/type the way `landmarks` does.

## Decisions applied

- **Roads → corridors**: Ajmer Road, Tonk Road, Amer Road, Agra Road, Delhi Road, and
  `200ft-bypass-ajmer-road` (folded into a new clean `200ft-bypass` corridor, with the old
  slug kept as its alias — fixing the inconsistency found earlier where that slug was both
  a canonical locality *and* an alias target in JaipurCircle's own data). Their original
  `localities` rows are **not deleted** — kept, unmodified, with a new
  `superseded_by_corridor_id` pointing at the corridor, so the app can treat them as
  legacy/redirect rather than normal localities without losing anything.
- **Heerapura → sub-locality of Bhankrota**: `parent_locality_id` set.
- **Mahapura**: already existed in our 97 (confirmed again against this CSV) — enriched
  normally, nothing special needed.
- **Walled City**: genuinely new — the CSV's 98th row, not in our existing 97. Inserted with
  name/slug/Hindi name only; the source has **no** coordinates, zone, pincode, or landmarks
  for it, so everything else stays null rather than guessed.
- **`micro_localities`** (only 1 of 98 rows — Vaishali Nagar — had any): "Nursery Circle" →
  new sub-locality (`parent_locality_id` = Vaishali Nagar; no coordinates in source, left
  null). "Vaishali Marg" → alias of Vaishali Nagar. "Amrapali Circle" / "Gandhi Path" /
  "Queens Road" are already independent locality rows — left untouched, not folded under
  Vaishali Nagar. "Chitrakoot side" / "Ajmer Road side" / "Khatipura Road side" are
  directional descriptions, not place names — excluded entirely (listed under "couldn't
  place" below).
- **`name_hi`**: generated for all 98 (including the 5 rows that already had real
  Devanagari text in the source — regenerated/reviewed the same as everything else, since
  none of it has been independently verified). `name_hi_status = 'needs_review'` on every
  row. Full list below for your review.

## Locality → sub-locality tree

Only two parent/child relationships exist in this seed (the source's `parent_locality_slug`
column was present but **empty on all 98 rows** — this tree is entirely from the explicit
decisions above, not source data):

```
Bhankrota
└── Heerapura

Vaishali Nagar
└── Nursery Circle
```

Every other locality remains top-level. `parent_locality_id` is ready for more, once real
hierarchy data exists.

## Corridors

**6** corridor rows: Ajmer Road, Tonk Road, Amer Road, Agra Road, Delhi Road, 200 ft Bypass.
Each has a single reference-point centroid (reused from its former locality-row coordinate)
— not a real route/polyline, since no line-geometry data exists anywhere checked.
`locality_corridors` (which localities sit "on" a corridor) is **not populated** — no
relationship data exists in the source; inferring it from proximity alone would be a
fabrication, not a finding.

## Pincode coverage

**80 of 98** localities (82%) got at least one pincode (from `pincode`, falling back to
`pin_code` where `pincode` was blank — `pincode` was the more complete field: e.g. "Moti
Doongri Road" and "Janta Colony Main Road" had `pincode` but blank `pin_code`).
18 localities have no pincode in the source: mostly the corridors (roads don't really have
a single pincode) plus a handful of others — full list is queryable from `locality_pincodes`
once applied (any locality slug absent from it).

## Neighbour coverage

**87 of 91** non-corridor, non-Walled-City localities (96%) have **source-derived**
adjacency (`method = 'source'`, from the CSV's own `nearby_localities` field — 432 pairs,
with real distance computed from centroids for pairs where both ends have coordinates).
The remaining **2** localities had no source-derived neighbors at all, so they got the
centroid-computed fallback instead (`method = 'computed'`, ≤3km — 18 pairs). Every row is
honestly tagged with which method produced it; nothing is blended.

## Landmarks

**30** landmark rows across **19** localities, from the `landmarks` field only (not `parks`
— see exclusions above). The other 79 localities have no landmark data in the source.

## Zones — correction from the earlier report

The CSV has **8** real Jaipur Municipal Corporation zones, not the 7 found in the smaller
Downloads-file sample used for the first draft of this seed: Adarsh Nagar, Civil Lines,
Hawa Mahal, Jhotwara, Sanganer, Vidyadhar Nagar, Vishwakarma, **and Walled City** (covers
the historic core — Hawa Mahal, Johri Bazaar, Bapu Bazaar, Chandpole, etc.). `zone` is only
set where currently null (`coalesce`) — never overwrites an existing curated value.

## Hindi names — for your review (all `needs_review`)

Compositionally transliterated using standard conventions (Nagar → नगर, Road → रोड, Marg →
मार्ग, Bazaar → बाज़ार, etc.) for the 93 rows that had no usable Devanagari in the source;
the 5 that did (e.g. Malviya Nagar → मालवीय नगर) were kept as-is but still marked
`needs_review` since none of it has been independently verified here.

| English | Hindi | English | Hindi |
|---|---|---|---|
| 200 ft Bypass (Ajmer Rd Stretch) | 200 फ़ीट बाईपास (अजमेर रोड सेक्शन) | Moti Doongri Road | मोती डूंगरी रोड |
| Adarsh Nagar | आदर्श नगर | Murlipura | मुरलीपुरा |
| Adarsh Nagar Circle | आदर्श नगर सर्कल | Nahargarh | नाहरगढ़ |
| Agra Road | आगरा रोड | Nahargarh Road | नाहरगढ़ रोड |
| Ajmer Road | अजमेर रोड | Nehru Bazaar | नेहरू बाज़ार |
| Amer | आमेर | New Sanganer Road | न्यू सांगानेर रोड |
| Amer Road | आमेर रोड | Nirman Nagar | निर्माण नगर |
| Amrapali Circle | आम्रपाली सर्कल | Officers Campus Extension | ऑफिसर्स कैंपस एक्सटेंशन |
| Badi Chaupar | बड़ी चौपड़ | Panchyawala | पंचयावाला |
| Bagru | बगरू | Pratap Nagar | प्रताप नगर |
| Bani Park | बनी पार्क | Pratap Nagar Sector 1 | प्रताप नगर सेक्टर 1 |
| Bapu Bazaar | बापू बाज़ार | Purani Basti | पुरानी बस्ती |
| Bapu Nagar | बापू नगर | Queens Road | क्वींस रोड |
| Bhankrota | भांकरोटा | Raja Park | राजा पार्क |
| Brahmpuri | ब्रह्मपुरी | Raja Park Market | राजा पार्क मार्केट |
| C Scheme | सी स्कीम | Ramchandrapura | रामचंद्रपुरा |
| Chandpole | चांदपोल | Ramganj | रामगंज |
| Chaura Rasta | चौड़ा रास्ता | Sanganer | सांगानेर |
| Chhoti Chaupar | छोटी चौपड़ | Sanganeri Gate | सांगानेरी गेट |
| Chitrakoot | चित्रकूट | Shipra Path | शिप्रा पथ |
| Chomu Road | चोमू रोड | Shyam Nagar | श्याम नगर |
| City Palace | सिटी पैलेस | Sikar Road | सीकर रोड |
| Civil Lines | सिविल लाइन्स | Sindhi Camp | सिंधी कैंप |
| Delhi Road | दिल्ली रोड | Sitapura | सीतापुरा |
| Durgapura | दुर्गापुरा | Sodala | सोडाला |
| Gandhi Path West | गांधी पथ पश्चिम | Station Road | स्टेशन रोड |
| Ghat Gate | घाट गेट | Surajpole | सूरजपोल |
| Goner Road | गोनेर रोड | Tilak Nagar | तिलक नगर |
| Gopalbari | गोपालबाड़ी | Tonk Road | टोंक रोड |
| Gopalpura Bypass | गोपालपुरा बाईपास | Topkhana Desh | तोपखाना देश |
| Harmada | हरमाड़ा | Tripolia Bazaar | त्रिपोलिया बाज़ार |
| Hawa Mahal | हवा महल | Vaishali Nagar | वैशाली नगर |
| Heerapura | हीरापुरा | Vidyadhar Nagar | विद्याधर नगर |
| JLN Marg | जेएलएन मार्ग | Vishwakarma | विश्वकर्मा |
| Jagatpura | जगतपुरा | Vishwakarma Industrial Area | विश्वकर्मा औद्योगिक क्षेत्र |
| Jaipur Bypass | जयपुर बाईपास | Walled City | परकोटा |
| Jal Mahal | जल महल | World Trade Park | वर्ल्ड ट्रेड पार्क |
| Janta Colony | जनता कॉलोनी | Jhalana Doongri | झालाना डूंगरी |
| Janta Colony Main Road | जनता कॉलोनी मेन रोड | Jhotwara | झोटवाड़ा |
| Jantar Mantar | जंतर मंतर | Jhotwara Industrial Area | झोटवाड़ा औद्योगिक क्षेत्र |
| Jawahar Circle | जवाहर सर्कल | Johri Bazaar | जौहरी बाज़ार |
| Jawahar Nagar | जवाहर नगर | Jyothi Nagar | ज्योति नगर |
| Kalwar Road | कालवाड़ रोड | Kanakpura | कनकपुरा |
| Kardhani | करधनी | Khole Ke Hanuman Ji Area | खोले के हनुमान जी क्षेत्र |
| Kishanpole Bazaar | किशनपोल बाज़ार | Kukas | कुकस |
| Lal Kothi | लाल कोठी | MI Road | एमआई रोड |
| Mahal Road | महल रोड | Mahapura | महापुरा |
| Malviya Nagar* | मालवीय नगर | Mansarovar | मानसरोवर |
| Mansarovar Extension | मानसरोवर एक्सटेंशन | Mini Secretariat Complex | मिनी सचिवालय परिसर |
| Nursery Circle (new sub-locality) | नर्सरी सर्कल | | |

\* Malviya Nagar was one of the 5 rows with real Devanagari already in the source;
kept as-is, still marked `needs_review`.

## Rows that couldn't be placed / excluded

- **"Chitrakoot side" / "Ajmer Road side" / "Khatipura Road side"** (from Vaishali Nagar's
  `micro_localities`): directional descriptions ("towards X"), not distinct places anyone
  searches for. Not inserted as sub-localities or aliases — genuinely excluded, not an
  oversight.
- **"Gandhi Path"** (also from Vaishali Nagar's `micro_localities`): possibly refers to our
  existing "Gandhi Path West" locality, possibly a distinct "Gandhi Path" — the source
  doesn't disambiguate. Left alone rather than guessed; flagging for your call.
- **`parent_locality_slug`**: present as a column in the source but empty on every one of
  the 98 rows — the tree above is entirely from the two explicit decisions, not source data.

## Files in this proposal

- `supabase/migrations/20260925055444_locality_enrichment_schema.sql` — revised from the
  earlier draft: adds `name_hi_status`, `superseded_by_corridor_id` (+ its FK, added via a
  `pg_constraint` existence check — Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, caught
  before it could fail on apply), and `corridors.aliases`.
- `supabase/seeds/jaipur_localities.sql` — idempotent, upserts by `(city_id, slug)`, never
  deletes. Enriches 91 existing localities, inserts 2 new ones (Walled City, Nursery
  Circle), sets 2 parent relationships, creates 6 corridors and marks their 6 superseded
  locality rows, seeds 80 pincode rows, 30 landmark rows, and 450 neighbor rows (432
  source + 18 computed fallback).

Stopping here for review, per instruction.
