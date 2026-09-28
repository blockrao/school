# School detail page — requirements spec (v1)

Reviewed 2026-09-28 against a JaipurCircle school-page draft (sister project, same
founder) and the live Supabase schema — not the migration files, which are stale on
several tables (see `docs/architecture-baseline.md`'s exams correction). Everything
below is checked against what the database actually has today.

## Finding: this is mostly a data-population problem, not an architecture problem

The JaipurCircle draft asks for a rich page — identity, admissions, fees, facilities,
media, nearby, rankings, corrections, teacher relationships. Nearly all of it already
has a matching table in this schema:

| Section | Table(s) | Schema state | Data state |
|---|---|---|---|
| Identity / At a Glance | `schools`, `school_affiliations` | built | loading now (Jaipur) |
| Location | `schools.location`, `localities` | built | partial (see below) |
| Admissions | `admission_cycles`, `admission_notices` | built, 276 notices exist | not yet for Jaipur |
| Fees | `fee_items` (academic_year, class_code, component, amount_min/max, `verification` enum) | built | 0 rows anywhere |
| Facilities | `facilities` (taxonomy) + `school_facilities` (available boolean, nullable = not verified) | built | 0 rows anywhere |
| Media/images | `school_media` (approved flag, licence) | built | 0 rows anywhere |
| Nearby | `landmarks` + `locality_neighbors` (488 adjacency rows) | built at locality level | usable now |
| Rankings | `school_rankings` (explicitly commented: "not a trust/verification signal, kept separate from field_provenance") | built, 21 rows | populated, correctly isolated |
| Report a correction | `correction_requests` **and** `update_reports` | both exist, overlapping purpose | needs reconciling — pick one, don't build a third |
| Teacher relationships | `school_teacher_affiliations` | built | 0 rows |
| Reviews | — | **no table** | genuine gap |
| Transport | — | **no table** | genuine gap |
| School-level documents (prospectus, fee circular) | — | `documents` exists but is personal child-KYC storage (`child_id`, `sha256`, `retain_until`) — wrong table | genuine gap |
| Compare | — | query/UI feature, no schema needed | not built |

**Root-cause note:** the 14 Jaipur schools unpublished earlier (2026-09-28) for
aggregator/ranking-site sourcing were contaminated because that data was written into
`school_affiliations` — a facts table — instead of `school_rankings`, which exists
specifically so ranking-site data never gets treated as a verified fact. The schema
already enforces the separation the JaipurCircle draft asks for ("no arbitrary quality
score" / rankings kept separate); the ingestion process that loaded those 14 schools
didn't use it. Fix the loader, not just the affected rows.

## Tier 1 — mandatory to create a page at all (hard publish gate, unchanged from the MVP decision)

- `name_en`
- `address`
- `locality_id`
- `pincode`
- at least one `school_affiliations` row (board)
- `website` OR `phone`

A school missing any of these stays `status = 'draft'` and is not indexed. This is
enforced by RLS (`schools_public_read` policy: `status = 'published' OR is_staff() OR
is_school_member(id)`), not by the view layer alone — `docs/DATA_ACCESS.md`'s
completeness-based description was incomplete on this point.

Additionally, at least one `school_affiliations.source_id` on that school must **not**
be an aggregator/ranking source (`ai_web_research_2026_jpr`, `cforerankings_2026`) —
codified 2026-09-28 after the Jaipur sourcing incident above.

## Tier 2 — holistic v1 page, every section independently gated

Each section renders from its own data and degrades honestly when empty — a missing
section is never fabricated, and is never allowed to block the rest of the page.

1. **Identity / At a Glance** — Tier 1 fields plus gender, medium, management,
   established_year, tier, from `schools`. Freshness line per fact
   ("Checked N days ago · source") per `CLAUDE.md`'s SEO/GEO rule.
2. **Location** — address + `GeoCoordinates` from `schools.location`, tagged by
   `geocode_precision` (`pincode` / `locality` / exact — never presented as more precise
   than it is).
3. **Admissions** — `admission_cycles` / `admission_notices` if present for this
   school, else "Not yet published."
4. **Fees** — `fee_items` if present, else "Not yet published." Never estimate; the
   `verification` enum on `fee_items` must be surfaced (official/verified/estimated/
   parent-reported), matching the JaipurCircle draft's distinction requirement exactly.
5. **Facilities** — `school_facilities` joined to `facilities` taxonomy. Three states:
   `available = true` → Available, `available = false` → Not available, no row →
   section omitted entirely (never rendered as "no facilities").
6. **Nearby** — locality + `landmarks` + `locality_neighbors`. Available as soon as a
   school has a `locality_id`, independent of everything else.
7. **Rankings** — `school_rankings` only, always labeled as third-party, never merged
   into the verified fact block.
8. **Report a correction** — always shown; a UI affordance, not data-gated. Route it to
   whichever of `correction_requests` / `update_reports` survives the reconciliation
   below.
9. **Teacher relationships** — `school_teacher_affiliations` if any exist, else
   omitted.

## Explicitly out of v1 scope (genuine schema gaps — data repo's job, not this repo's)

- **Reviews/feedback** — no table exists.
- **Transport** — no table exists.
- **School-level documents** (prospectus, fee circular, affiliation certificate) — the
  only `documents` table is personal child-KYC storage; needs its own
  `school_documents`-style table with `source + date + academic_year` per the
  JaipurCircle draft's requirement.
- **Compare** — pure UI/query feature against Tier 2 data already modeled; no schema
  blocker, just not built yet.

## Immediate action items

1. Reconcile `correction_requests` vs `update_reports` — pick one, or a clear split of
   responsibilities, before wiring the "report a correction" UI to either.
2. Audit the ingestion path that wrote `ai_web_research_2026_jpr`/`cforerankings_2026`
   sourced rows into `school_affiliations` for Jaipur, and check whether the same
   mistake happened in the untagged ~10,500-row Haryana/Delhi-NCR pool before it's ever
   surfaced.
3. Request `school_documents` and `school_transport`(or equivalent) tables from the
   data repo before building those two page sections.
4. Write the missing `db/views/` + grants for `exams`/`exam_cycle_milestones`/etc. (see
   `docs/architecture-baseline.md`) — exam pages currently have no view layer at all
   despite the tables being live.
