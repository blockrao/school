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
| 1 | School Page v2 + SchoolTabContent | `/[locale]/school/[id]-[slug]` (+ `/admissions`, `/fees`, `/facilities`, `/teachers`, `/location`, `/photos`) | cached static shell, deadline/seats streamed | pending | Tabs are **real links to sub-routes**, not setState. Overview must contain the fact block + JSON-LD. Sub-routes self-canonical only if content is substantial; else canonical → overview |
| 2 | Home v2 | `/[locale]` | static | pending | |
| 3 | Search Results | `/[locale]/schools` (filters in searchParams) | dynamic, noindex for filter combos | pending | Map lazy-loaded (MapLibre). Compare tray = client island |
| 4 | City List | `/[locale]/[city]/admissions` | ISR per city | pending | Indexable. Empty state designed |
| 5 | Delhi Nursery Hub | `/[locale]/delhi/nursery-admission` | ISR | pending | High-intent seasonal SEO page |
| 6 | Age Checker | `/[locale]/tools/age-eligibility` | static + client island | pending | Hindi variant designed — test under `/hi` |
| 7 | Compare Schools | `/[locale]/compare?ids=` | dynamic, noindex | pending | |
| 8 | Seats Available Now | `/[locale]/[city]/seats-available` + block on school page | ISR, short revalidate | pending | OpenSeat |
| 9 | WhatsApp Alerts | `/[locale]/alerts` | client flow | pending | OTP via Supabase Auth phone; WhatsApp sending is backend, out of frontend scope |
| 10 | Application Help | `/[locale]/admissions/help` → `/my/admissions` | auth, dynamic | pending | Concierge + Document Vault. `/my/*` noindex |
| 11 | School Portal | `/for-schools` (public), `/portal/*` (auth) | dynamic | pending | Claim → dashboard → seats → post notice |
| 12 | Teacher Profile | `/[locale]/teacher/[id]-[slug]` | ISR | pending | Claimed + unclaimed states |
| 13 | Teachers Directory | `/[locale]/teachers` | ISR | pending | |
| — | Ops Verification Queue | `/ops/*` | auth, internal | pending | Separate route group, noindex, role-gated via RLS |

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
