"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  canApplyNow,
  checkEligibility,
  type EligibilityCycle,
  humanizeMonths,
  parseDateOnly,
} from "@/lib/eligibility";
import { cn } from "@/lib/utils";

// Generic, exam/school-agnostic: any admission cycle with a dob window can be
// passed in. Intended to be reused as-is on future admission templates —
// keep it free of RMS CET / exam-specific copy or types.

const APPLY_STATUS_NOTE: Record<string, string> = {
  open: "Applications are open now.",
  "closing-soon": "Applications are open now — closing soon.",
  upcoming: "Applications haven't opened yet.",
  closed: "This year's applications are closed.",
  "not-announced": "Dates aren't announced yet.",
};

export function EligibilityChecker({
  id,
  cycles,
  helpHref,
  shareHref,
  className,
}: {
  id?: string;
  cycles: EligibilityCycle[];
  /** Link to a real, existing help/concierge flow — never a placeholder. */
  helpHref: string;
  /** WhatsApp share link for the page itself, reused as the "tell a friend" CTA. */
  shareHref: string;
  className?: string;
}) {
  const inputId = useId();
  const [dobInput, setDobInput] = useState("");

  const dob = useMemo(() => parseDateOnly(dobInput), [dobInput]);
  const results = useMemo(() => (dob ? checkEligibility(dob, cycles) : null), [dob, cycles]);

  const eligibleNow = results?.filter(
    (r) => r.verdict.kind === "eligible" && canApplyNow(r.cycle.applyStatus),
  );
  const eligibleNotOpen = results?.filter(
    (r) => r.verdict.kind === "eligible" && !canApplyNow(r.cycle.applyStatus),
  );
  const ineligible = results?.filter(
    (r) => r.verdict.kind === "too_young" || r.verdict.kind === "too_old",
  );
  const closestMiss = ineligible?.reduce<(typeof ineligible)[number] | undefined>((closest, r) => {
    const months =
      r.verdict.kind === "too_young" || r.verdict.kind === "too_old"
        ? r.verdict.kind === "too_young"
          ? r.verdict.monthsShort
          : r.verdict.monthsOver
        : Number.POSITIVE_INFINITY;
    const closestMonths =
      closest?.verdict.kind === "too_young"
        ? closest.verdict.monthsShort
        : closest?.verdict.kind === "too_old"
          ? closest.verdict.monthsOver
          : Number.POSITIVE_INFINITY;
    return months < closestMonths ? r : closest;
  }, undefined);

  const hasAnswer = results !== null && results.length > 0;
  const isEligibleForSomething =
    (eligibleNow?.length ?? 0) > 0 || (eligibleNotOpen?.length ?? 0) > 0;

  return (
    <section
      id={id}
      className={cn("scroll-mt-20 rounded-md border border-rule bg-copy-white p-4", className)}
    >
      <h2 className="font-display text-card font-semibold">Check your eligibility</h2>
      <p className="mt-1 text-meta text-muted-ink">
        Enter the child's date of birth — we'll check it against every open age window on this page.
        Nothing is saved or sent anywhere; this runs entirely on your device.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label htmlFor={inputId} className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-muted-ink">Date of birth</span>
          <input
            id={inputId}
            type="date"
            value={dobInput}
            onChange={(e) => setDobInput(e.target.value)}
            className="h-10 rounded-md border border-rule px-3 text-body"
          />
        </label>
      </div>

      {hasAnswer && (
        <div className="mt-4 flex flex-col gap-3">
          {eligibleNow && eligibleNow.length > 0 && (
            <div className="rounded-md border border-pill-open-bd bg-pill-open-bg p-3">
              <p className="font-semibold text-pill-open-fg">
                Eligible — and applications are open
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {eligibleNow.map(({ cycle }) => (
                  <li key={cycle.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-body text-pill-open-fg">{cycle.label}</span>
                    {cycle.formUrl && (
                      <a
                        href={cycle.formUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="rounded-md bg-pill-open-fg px-3 py-1 text-meta font-semibold text-copy-white"
                      >
                        Apply now ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {eligibleNotOpen && eligibleNotOpen.length > 0 && (
            <div className="rounded-md border border-pill-upcoming-bd bg-pill-upcoming-bg p-3">
              <p className="font-semibold text-ink">Eligible by age, but not open to apply yet</p>
              <ul className="mt-2 flex flex-col gap-1">
                {eligibleNotOpen.map(({ cycle }) => (
                  <li key={cycle.id} className="text-body text-ink">
                    {cycle.label} —{" "}
                    <span className="text-meta">{APPLY_STATUS_NOTE[cycle.applyStatus]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isEligibleForSomething && ineligible && ineligible.length > 0 && (
            <div className="rounded-md border border-pill-closed-bd bg-pill-closed-bg p-3">
              <p className="font-semibold text-ink">Not eligible for this year's age window</p>
              <ul className="mt-2 flex flex-col gap-1">
                {ineligible.map(({ cycle, verdict }) => (
                  <li key={cycle.id} className="text-body text-muted-ink">
                    {cycle.label} —{" "}
                    {verdict.kind === "too_young" &&
                      `too young by about ${humanizeMonths(verdict.monthsShort)}`}
                    {verdict.kind === "too_old" &&
                      `past the age limit by about ${humanizeMonths(verdict.monthsOver)}`}
                  </li>
                ))}
              </ul>
              {closestMiss && (
                <p className="mt-2 text-meta text-muted-ink">
                  Closest match: <strong>{closestMiss.cycle.label}</strong>. Age windows shift
                  slightly every year, so it's worth checking again when next year's notification is
                  out.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-rule border-t pt-3">
            <a
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-meta text-ruled-blue"
            >
              Share this result on WhatsApp ↗
            </a>
            <span className="text-meta text-muted-ink">·</span>
            <Link href={helpHref} className="font-semibold text-meta text-ruled-blue">
              Get help with the application →
            </Link>
          </div>
        </div>
      )}

      {!hasAnswer && (
        <p className="mt-3 text-meta text-muted-ink">
          Not sure where to start?{" "}
          <Link href={helpHref} className="font-semibold text-ruled-blue">
            SchoolOye can prepare and submit the form for you
          </Link>
          .
        </p>
      )}
    </section>
  );
}

// Re-exported so pages don't need a second import for the shared type.
export type { EligibilityCycle };
