# Design guideline

**Applies to:** every screen and component. **Updated:** 27 Sep 2026
**Decisions:** D-050, D-051, D-074 · Source: Product Specification v1.0 §7 + the Claude Design export

## 1. Direction

The user is an anxious parent tracking deadlines on a phone. The interface should feel like a
**well-kept school notebook**: calm, ruled, dependable, with the one urgent thing clearly marked.

## 2. Source of truth

- `design/*.dc.html` (Claude Design export) is **reference only**. Never import, iframe or copy its
  markup or inline styles; port to Server Components with token utilities (D-074).
- No hex values or arbitrary `[...]` values in components. If a token is missing, add it to
  `src/app/globals.css`.
- A flow step with no design gets a minimal version built from existing `src/components/ui`
  primitives, marked `// design-pending`, and logged in `docs/design-gaps.md`.
- New designs landing in `design/`: diff against `docs/screen-map.md`, port new components first,
  replace the matching `design-pending` screen, remove its design-gaps row.

## 3. Tokens

| Token | Hex | Use |
|---|---|---|
| Copy white | `#FCFCF8` | Page background |
| Ruled blue | `#2F4B9A` | Brand, links, primary actions |
| Ink | `#1B2230` | Text |
| Margin red | `#C8372D` | **Deadlines 0–7 days away only.** Nothing else is red |
| Board green | `#1F5A43` | "Open" status |
| Pencil yellow | `#F0C04A` | "Upcoming" status, stale marker, highlights |
| Slate | `#6B7280` | Secondary text, "Closed", "Not announced" |

**Type:** Anek Latin + Anek Devanagari (500/600/700) for headings; Mukta (400–700) for body and
UI, via `next/font/google` as `--font-anek-latin`, `--font-anek-devanagari`, `--font-mukta`. Load
Devanagari only on `/hi` routes where possible. Scale 14 / 16 / 20 / 25 / 31 / 39. Minimum text
14 px; body 16 px.

## 4. Signature element: the deadline margin

A vertical strip on the left of each school card and the school page's admission card, like a
notebook margin, showing the next date and days left. States:

| State | Margin | Label |
|---|---|---|
| Closing soon (0–7 days) | Margin red | "Closes in 4 days" / "Last date today" |
| Open | Ink | "Open until 10 Dec" |
| Upcoming | Dashed ink | "Opens 15 Nov" |
| Not announced | Slate, "—" | "Not announced yet" |
| Closed | Slate | "Closed" |
| Seats now (OpenSeat) | Ink | "Seats available" / "Few seats" / "Waitlist" / "Full" |

Every status colour always has a text label next to it — never colour alone.

## 5. Layout and components

- Mobile first: single column, left-aligned. Desktop: two columns (content + sticky action panel).
- Cards only for lists of comparable items (schools, exams). No card soup.
- Tabs are links (routes), not client state.
- Component set (in `src/components/ui`): DeadlineMargin · StatusPill · SchoolCard ·
  SponsoredLabel · FreshnessLine / NotYetPublished · VerificationBadge · FilterSheet · CityPicker ·
  LanguageToggle · AgeChecker · AlertSignup · ShareSheet (WhatsApp first) · CompareTable ·
  DocumentChecklist · ApplicationStatusRow · EmptyState · ErrorState · OTPInput · ConsentCheckbox ·
  OpsQueueTable · SourcePreview · FieldEditorWithProvenance.

## 6. Quality bars

- **Performance (D-051):** ≤60 KB gzip app-owned JS on the school page (`pnpm bundle-check`;
  framework baseline ~131 KB excluded); LCP ≤2.0 s, INP ≤200 ms, CLS ≤0.05 on a Moto G-class phone
  over 4G. No client-side data fetching for first paint; maps, galleries and the compare tray are
  lazy client islands.
- **Accessibility:** WCAG 2.1 AA contrast; visible focus; tap targets ≥44 px; status never by colour
  alone; every form field labelled; errors announced.
- **Done means:** states, wiring, e2e coverage and screenshots are all in place for the screen
  (tracked in `docs/screen-map.md`).
