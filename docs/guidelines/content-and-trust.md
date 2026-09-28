# Content and trust guideline

**Applies to:** every parent- or school-facing string, label and message (web, WhatsApp, OG images).
**Updated:** 27 Sep 2026 · **Decisions:** N-13, D-010, D-024, D-026, D-049, D-052, D-062, D-081,
D-084, D-086, D-087, D-088, D-089, D-100, D-107, D-110, D-112

## 1. Trust law (never break)

- No paid ranking, no "best" badges for sale, no star ratings, no sold votes (N-13).
- Never fabricate: an unknown fact says **"Not yet published"**, never a guess or a placeholder
  (D-049). This includes seed/demo fixtures shown in production.
- **Sponsored** content always has the sponsored border **and** the visible word "Sponsored"
  (D-089). Payment buys visibility and tools — never rank, verification or endorsement.
- **SchoolOye does not sell admissions.** Concierge copy says "paperwork assistance"; it never
  implies a seat, better chances or a relationship with a school (D-010).
- Claiming a page is free and never changes search position (D-060).
- Paid school products are never named or labelled "Verified", "Official" or "Partner" (D-112).

## 2. Provenance labels (one line under each fact)

Rendered by `FreshnessLine`; each links to the page's Sources section.

| Label | When |
|---|---|
| ✓ Verified by school · {date} | A verified school admin confirmed or entered it (claimed page) |
| ✓ Confirmed with school by phone · {date} | SchoolOye ops call |
| Official record · {registry} · checked {date} | Board / government registry (incl. "UDISE+", D-082) |
| From the school's {website / admission notice / fee circular} · {date} | School-published source, linked |
| Reported by school · {date} | Seat updates published immediately by a verified admin (D-100) |
| Reported by {N} parents ({M} with receipts) · {session} · not yet verified by school | Parent fee aggregates only (D-013) |
| From the official notice · {issuer}, dated {date} | Exam bulletins |
| Calculated by SchoolOye | Totals and derived values |
| Not yet published | No displayable source |
| Not confirmed for {session} · last year: {fact} | Previous-session fact shown as context |

**Stale** (past its D-087 limit): keep the value, add the pencil-yellow marker and "re-checking".
Never hide stale data (D-026).

## 3. Page-level wording

- Claimed + school-verified pages: "✓ Official record · verified by school on {date}".
- Unclaimed pages: "Compiled by SchoolOye from public records · {date}". Never "Official", no logo
  (D-052).
- School-supplied text sits under "From the school"; SchoolOye's factual summary sits under
  "About this school" (≤80 words, no adjectives like best, premier, top, leading).
- The school can't hide parent reports, the change log, stale markers or Sources (D-062); their
  public reply appears as "School's response".

## 4. Writing style

- **Plain and active, Class 6–8 reading level.** Short sentences. One idea per line on mobile.
- **Buttons say what happens:** "Get alerts", "Check eligibility", "Share this year's fees",
  "Start application help", "Report an update".
- **Dates:** always with day, month, year and session — "10 Dec 2026, for 2027-28". Countdown
  words ("Closes in 4 days", "Last date today") are computed in IST.
- **Empty states tell the parent what to do next:** "2027-28 admissions not announced yet · last
  year forms opened 14 Nov 2025 · Get an alert when they open."
- **Errors** say what happened and what to try, never a code.
- School names in their original script plus transliteration where available.
- No urgency tricks (dark patterns): no invented scarcity ("only 3 seats left") unless the school
  reported it, no fake timers, no pre-ticked consent.

## 5. Language (D-086)

- Every UI string goes through the translation layer from now on; no hard-coded English in
  components.
- Hindi city and admissions-tracker pages by 15 Nov; school pages get Hindi only when their
  content is translated (`hi_ready`).
- Hindi copy is written for parents, not machine-translated word for word; numbers and dates stay
  in the same format as English.

## 6. WhatsApp and share text

- First line says the fact: "{School}: Nursery 2027-28 forms open 15 Nov. Last date 10 Dec."
- One link per message, with UTM tags. No emoji walls, no ALL CAPS, no "forward to 10 groups".
- Alerts go only to people who opted in, carry a one-tap unsubscribe, and respect the D-098
  timing (form opens, 3 days before, deadline-day 08:00 IST, date changes, Friday digest) and the
  21:00–08:00 IST quiet hours (D-110).

## 7. Brand

- The brand is **SchoolOye** (capital S, capital O, "oye"), in copy, metadata and JSON-LD (D-081).
  Never "Schooloy", "School Oye" or "Schoolye".
