# Claude Design → Next.js screen map

Source: `design/` (Claude Design export, `.dc.html` + `support.js`). These files are REFERENCE ONLY.
They render client-side through the DC runtime with inline styles and `sc-for`/`sc-if` templating —
never import, iframe or copy them into `src/`. Port each to Server Components + Tailwind tokens.

Canonical versions: **Home v2** and **School Page v2** supersede Home / School Page.
Use v1 only for blocks v2 lacks (e.g. v1 school page's untabbed long-form layout informs the SEO order below).

## Launch scope (Delhi, Gurugram, Haryana)

Launch district: **Jaipur** (see CLAUDE.md — pivoted from South West Delhi, which stays fully
built but unlinked). Status values: **designed+built** (design
file ported, all states/wiring/e2e/screenshots done), **built-from-components** (no design file —
minimal version from `src/components/ui` tokens, tracked in `docs/design-gaps.md`), **pending**
(scheduled, not started), **deferred** (explicitly post-launch).

| # | Design file | Route | Rendering | Status | Notes |
|---|---|---|---|---|---|
| 0 | Components Sheet | `src/components/ui/*` | — | designed+built | DeadlineMargin, StatusPill, SeatPill, SchoolCard (default/sponsored/stale/unknown), Tabs, MapPin, DocRow, OtpInput |
| 0 | Platform Shell | `src/app/[locale]/layout.tsx` | static | designed+built | Header, 5 primary nav items, mobile bottom tab bar, EN/हिं toggle = locale route switch (not client state), footer incl. Grievance officer |
| — | Guides | `/[locale]/guides` | static | built-from-components | No design file — primary nav item with no designed content screen. See `docs/design-gaps.md` |
| 1 | School Page v2 + SchoolTabContent | `/[locale]/[city]/[slug]-[school_code]` (Overview only; `/admissions`, `/fees`, `/facilities`, `/teachers`, `/location`, `/photos` sub-routes not built) | cached static shell, deadline/seats streamed | designed+built (Overview only) | 2026-09-26: migrated off the old flat UUID URL (`/[locale]/school/[id]-[slug]`, now a permanent redirect) to the city-first, `school_code`-keyed canonical scheme from the SEO/GEO spec doc — see the handoff doc. Overview is a full authority-page rewrite: renders `about_en`/`name_hi` (previously unused), full JSON-LD (`alternateName`, `description`, `foundingDate`, `telephone`, `email`, `memberOf`, `areaServed`, `identifier` incl. `school_code`), `BreadcrumbList`, `FAQPage` (only when ≥3 real facts, never templated filler), honest verification copy, "Similar schools nearby", Compare/Claim CTAs, hreflang, an `index.md` markdown twin, and an OG image route. Tabs (Fees/Facilities/Teachers/Photos) are still **pending** — deferred because `fee_items`/`school_facilities` aren't known to be populated for the Jaipur pilot yet; building tab UI over empty tables would be exactly the thin-content risk CLAUDE.md's trust rules warn against. Browse routing (`/[locale]/[state]/[city]/[locality]` → `/[locale]/[city]/[entitySlug]`) migrated in lockstep since Next.js won't allow the old and new dynamic segments as siblings. "Report an update" from the design is still not wired — no public correction-intake action exists yet (only the authenticated school-portal edit-request flow). Needs, before merge: `pnpm db:views --confirm` + `pnpm db:types` (adds `school_code` to `api.public_schools`), then `pnpm typecheck && pnpm lint && pnpm test && pnpm dev` for a real visual/build check — this session's sandbox can't reach the DB or run the platform-native lint/test/build binaries (see CLAUDE.md's own precedent for this limitation). |
| 2 | Home v2 | `/[locale]` | static | designed+built | Scoped to Jaipur |
| 3 | Search Results | `/[locale]/schools` (filters in searchParams) | dynamic, noindex for filter combos | designed+built | Map lazy-loaded (MapLibre), List/Map toggle. Compare tray = client island |
| 4 | City List | `/[locale]/[city]/admissions` | ISR per city | pending | Indexable. Empty state designed |
| 5 | Delhi Nursery Hub | `/[locale]/delhi/nursery-admission` | ISR | pending | High-intent seasonal SEO page |
| 6 | Age Checker | `/[locale]/tools/age-eligibility` | static + client island | designed+built | Deliberate deviation from the design's fabricated verdict — see top-of-file comment. Hindi variant done |
| 7 | Compare Schools | `/[locale]/compare?ids=` | dynamic, noindex | designed+built | |
| 8 | Seats Available Now | `/[locale]/[city]/seats-available` + block on school page | ISR, short revalidate | pending | OpenSeat |
| 9 | WhatsApp Alerts | `/[locale]/alerts` | client flow | designed+built | Steps 5a/5b (phone entry, OTP verify) factored into the shared `/sign-in` gate instead of embedded here — see top-of-file comment. Consent recorded in `consents`, subscription in `alert_subscriptions`. Step 5e's per-toggle delivery timing has no backing column, not built. WhatsApp sending is backend, out of frontend scope |
| — | Sign-in (phone OTP) | `/[locale]/sign-in` | dynamic, noindex | designed+built | Adapted from WhatsApp Alerts steps 5a/5b as a standalone, reusable gate for Alerts/Shortlist/Enquiry via `?next=` |
| 10 | Application Help | `/[locale]/admissions/help` → `/my/admissions` | auth, dynamic | designed+built | Concierge + Document Vault. `/my/*` noindex. Payments behind a provider interface (mock/manual now, razorpay later) — see docs/data-retention.md and the child-select addition in docs/design-gaps.md |
| 11 | School Portal | `/for-schools` (public), `/portal/*` (auth) | dynamic | designed+built | Claim → dashboard (seat status, enquiries, notices summary) → post admission notice → request a profile-field edit (ops-reviewed correction, not direct write — schools.* stays ops-verified) → News & PR (`/portal/news`, `/portal/news/new`; new `school_posts` table, same submit-then-ops-review shape as admission notices, reviewed at `/ops/posts`). Not built: Insights (no real analytics data — would be fabricated) and the featured-placement upsell (no checkout flow). Public display of approved news (a News tab on the school page) is a follow-up — same reasoning as the deferred Fees/Facilities/Teachers tabs, no consumer built this pass. |
| 12 | Teacher Profile | `/[locale]/teacher/[id]-[slug]` | ISR | pending | Claimed + unclaimed states |
| 13 | Teachers Directory | `/[locale]/teachers` | ISR | pending | |
| — | Ops Verification Queue | `/ops/*` | auth, internal | designed+built | Separate route group, noindex, role-gated via RLS. 7 review queues (schools, localities, claims, notices, seats, corrections, orders; `/ops/schools/[id]` is the full raw record + publish gate — `schools_public_read`'s RLS policy only exposes `status='published'` rows to anon) plus a cross-queue Tasks board (`/ops/tasks`, backed by the pre-existing `ops_tasks` table — assignment, priority, due dates, ad-hoc school follow-ups beyond the fixed queues), Staff management (`/ops/staff`, admin-only role grants via `requireAdmin()`), and an Audit log viewer (`/ops/audit`, over `audit_log`). No design file — built from `src/components/ui` tokens. Staff accounts: promote a signed-in profile's `role` to `ops`/`admin` via `/ops/staff` (or directly in the DB for the first account, before any admin exists). |
| — | Onboarding | `/[locale]/onboarding` | auth, noindex | built-from-components | Name + terms/privacy consent, gates every first sign-in. No design file. See `docs/design-gaps.md` |
| — | Terms / Privacy | `/[locale]/terms`, `/[locale]/privacy` | static | built-from-components | Placeholder legal content, pending legal review. No design file |
| — | Account settings | `/[locale]/my/account` | auth, noindex | built-from-components | Name edit, sign-out (device/all). No design file. See `docs/design-gaps.md` |

## Post-launch (designed, do not build yet)
- **Teacher of the Week** (feature, archive, nominate, accept): nominations/voting are a "test later" item. Keep the design and don't wire it up. Remove the "Teacher of the Week" mention from the shell's Teachers nav note until it ships. Status: **deferred**.

## Fixes to apply while porting
- Mockups show mobile + desktop side by side, so they have 2–4 `<h1>` per file. Production: exactly one `<h1>` per page.
- Mock data uses Jaipur localities (Vaishali Nagar, Raja Park, C-Scheme). Seed fixtures must be Delhi/Gurugram schools.
- Shell city list includes Noida, Jaipur and Kota. Show only cities with live data; others appear when ingested.
- No `<img>` in the designs yet. School photos need `next/image` with explicit dimensions and a no-photo state.
- DeadlineMargin depends on `now`. On cached pages it must render in a dynamic/streamed segment or the page must revalidate at IST midnight; never bake a countdown into a long-lived cache. Store deadlines as Postgres `date`.

## Infrastructure
- Database: Supabase ap-southeast-1 (Singapore); Vercel functions: sin1. Region move to
  ap-south-1 deferred — must be decided before the first real user signup, while
  auth/profile/children tables are empty.
