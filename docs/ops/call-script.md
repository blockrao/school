# Ops call script — school admissions verification

**Used by:** the data desk on `/ops/calls` · **Updated:** 27 Sep 2026 · **Decisions:** D-014, D-065, D-084
Full workflow (queue priority, capture form, `next_check_on` rules): `docs/spec/ops-console.md`
and `docs/spec/school-entity-page.md` §10.

## Before the call (30 seconds)
- Open the school in `/ops/calls`: last call outcome, known cycles for the current session, phones.
- Note which entry classes you need (Nursery/Pre-primary, Class 1, 6, 9, 11 as offered).

## Script (about 90 seconds)
1. "Namaste, I'm {name} from SchoolOye. We help parents in {city} track school admission dates.
   Could I speak to the admissions office?"
2. "For the {session} session, have admission forms been announced for {classes}?"
   - If yes: form release date, last date, online or offline, form fee, any test or interaction and
     its date, result date.
   - If no: "Roughly when do you expect them?" (record as expected, not confirmed).
3. "What is the age cut-off for {entry class} — born between which dates?"
4. "Which documents do parents need at the time of admission?"
5. "Could you WhatsApp us this year's admission notice or fee circular? It helps us show exactly
   what the school has published." (Tick "document requested".)
6. "SchoolOye gives every school a free official page it can update itself. Who should approve your
   school's record?" → name + role (internal only) → **send the claim link** by WhatsApp/email.
7. "Thank you. We'll check back before your last date."

## Rules
- Record only what the school says; never guess. Anything uncertain = "expected", not confirmed.
- Never discuss or quote other schools, rankings or aggregator data (D-027).
- Never promise seats, placement or visibility; claiming is free and never affects search position
  (D-060).
- Never ask for or record a parent's or child's personal details.
- Staff names captured on calls are internal only (never published).

## Outcomes (pick one)
reached · no answer · call back at {time} · wrong number · refused · not admitting this year.
The system sets the next call date automatically from the outcome and the cycle dates.
