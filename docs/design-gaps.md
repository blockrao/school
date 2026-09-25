# Design gaps

Flow steps with no matching file in `design/`. Each got a minimal functional version built
only from existing `src/components/ui` primitives and tokens (no new visual patterns),
marked `// design-pending` at its entry point. Replace with the real design and remove the
row here once one exists — see "NEW DESIGNS ROUTINE" in CLAUDE.md working style.

| Screen | Flow | What it needs to do | Built from | Route |
|---|---|---|---|---|
| Guides | 1 — Discover (Platform Shell nav item) | Index of admission-process/documents/board explainer articles. Platform Shell's design names it as one of 5 primary nav items but no guide-content screen exists anywhere in `design/`. | page tokens only (`border-rule`, `text-card`/`text-body`, `rounded-md`) — no existing card component fit an article-topic list | `/[locale]/guides` |
| Account hub | 2 — Engage (mobile bottom nav "Account") | Landing page for a signed-in user: phone number, active alert subscriptions with turn-off, link to saved schools. Mobile bottom nav (Platform Shell) already links here but no account-hub screen exists in `design/` — closest analogue is WhatsApp Alerts step 5e (manage/unsubscribe), borrowed for the alerts list shape only. | page tokens + the list/turn-off shape from WhatsApp Alerts 5e | `/[locale]/my` |
| Ask this school | 2 — Engage (School Page sidebar) | Class + message form, gated behind sign-in, inserting into `enquiries`. No design file anywhere covers contacting a school directly. | page tokens + existing form-field patterns (label/select/textarea, `FieldError`) | `/[locale]/school/[idSlug]` (sidebar section) |
| Which child? / add child | 3 — Application Help (before package picker) | `application_orders.child_id` is required at order-creation time, but design's 7b (Package picker) assumes a child already exists — no screen shows picking or adding one. Folded into the top of the package-picker page rather than a separate screen. | page tokens + the same radio-picker pattern as WhatsApp Alerts' class picker | `/[locale]/admissions/help/package` |
| Ops mark-paid | 3 — Application Help (manual payment provider) | Staff list of orders awaiting payment with a "Mark paid" action. Not the full Ops Verification Queue (screen 13, still pending) — scoped only to confirming manual-provider payments. | page tokens only | `/ops/orders` |
