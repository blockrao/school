// Decides whether a page may declare itself available in Hindi (hreflang
// alternates, eventually a language switcher) — see "SchoolOye Live Site
// Audit — Full Hindi parity" (30 Sep 2026): a page only claims Hindi once
// EVERY field on it is complete, never a partial translation advertised as
// done. A visibly half-Hindi page is worse for trust than an English-only
// one, so completeness gates the claim, not just presence of some Hindi text.
import type { PublicExamAdmission } from "@/contracts";

/**
 * True only when every cycle on an exam page carries complete Hindi text for
 * every field SchoolOye treats as core to the page (exam name, eligibility
 * notes, every milestone label, every fee-tier label). Missing or partial
 * Hindi on any one field keeps the whole page English-only for hreflang
 * purposes — see docs/spec/urls-and-routing.md for how this feeds into
 * localeAlternates(). Extend this file with one function per content type
 * (school, news, …) as each one grows real Hindi fields, rather than
 * hardcoding a `translated` array at each call site.
 */
export function examHasCompleteHindi(cycles: readonly PublicExamAdmission[]): boolean {
  if (cycles.length === 0) return false;
  return cycles.every((cycle) => {
    if (!cycle.name_hi || !cycle.eligibility_notes_hi) return false;
    if (cycle.milestones.some((milestone) => !milestone.label_hi)) return false;
    if (cycle.fee_tiers.some((tier) => !tier.category_label_hi)) return false;
    return true;
  });
}
