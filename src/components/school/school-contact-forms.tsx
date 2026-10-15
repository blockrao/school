"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sendEnquiry, sendOpenEnquiry, submitAdmissionLead } from "@/app/[locale]/_views/actions";
import { useViewer } from "@/components/school/use-viewer";
import { FieldError } from "@/components/ui/field-error";
import { lp } from "@/lib/urls";

export type AdmissionCycleOption = {
  cycle_id: string;
  class_code: string;
  academic_year: string;
};

/**
 * The school page's two parent-facing forms (admission request and "Ask this
 * school"), moved out of the server-rendered entity page so that page can be
 * statically cached and served fast to crawlers (15 Oct 2026 SEO audit).
 *
 * Everything per-visitor lives here: signed-in state comes from /api/viewer
 * and the post-submit messages (?enquiry_sent=1, ?apply_error=...) are read
 * from the URL after mount. The server-rendered default is what an anonymous
 * visitor or a crawler sees: the "Sign in" links.
 */
export function SchoolContactForms({
  schoolId,
  name,
  canonicalPath,
  locale,
  admissions,
}: {
  schoolId: string;
  name: string;
  canonicalPath: string;
  locale: string;
  admissions: AdmissionCycleOption[];
}) {
  const { signedIn } = useViewer(schoolId);
  const user = signedIn;
  const [flags, setFlags] = useState({
    enquirySent: false,
    enquiryError: false,
    askError: null as string | null,
    applySent: false,
    applyErrorCode: null as string | null,
  });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setFlags({
      enquirySent: p.get("enquiry_sent") === "1",
      enquiryError: p.get("enquiry_error") === "failed",
      askError: p.get("ask_error"),
      applySent: p.get("apply_sent") === "1",
      applyErrorCode: p.get("apply_error"),
    });
  }, []);
  const { enquirySent, enquiryError, askError, applySent, applyErrorCode } = flags;
  const school = { id: schoolId };

  return (
    <>
      {/* 29 Sep 2026: the admissions-lead-capture CTA. Distinct from "Ask this
  school" below on purpose — applying is a deliberate, single-recipient
  disclosure (the parent is choosing to give *this* school their contact
  details so it can process an application, same as a paper form), not the
  SDP-04 controlled-intermediary model that keeps contact details private
  for a general question. See submitAdmissionLead in ./actions.ts and
  admission_leads (20260929070000_admission_leads.sql). */}
      {admissions.length > 0 && (
        <section
          aria-labelledby="apply-heading"
          className="flex flex-col gap-2 rounded-md border border-rule p-4"
        >
          <h2 id="apply-heading" className="font-display text-card font-semibold">
            Request admission information
          </h2>
          {applySent ? (
            <p className="text-body text-muted-ink">
              Your request has been sent to {name}. They have your name and phone number and will
              reach out directly.
            </p>
          ) : applyErrorCode === "already_applied" ? (
            <p className="text-body text-muted-ink">
              You've already sent a request for this class — {name} has your details.
            </p>
          ) : user ? (
            <form action={submitAdmissionLead} className="flex flex-col gap-3">
              <input type="hidden" name="schoolId" value={school.id} />
              <input type="hidden" name="returnPath" value={canonicalPath} />
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-muted-ink">Class and session</span>
                <select
                  name="cycleSelection"
                  required
                  defaultValue=""
                  className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
                >
                  <option value="" disabled>
                    Choose a class
                  </option>
                  {admissions.map((cycle) => (
                    <option
                      key={cycle.cycle_id}
                      value={`${cycle.cycle_id}|${cycle.class_code}|${cycle.academic_year}`}
                    >
                      {cycle.academic_year} · Class {cycle.class_code.replace(/^c/, "")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-muted-ink">
                  Note for the school (optional)
                </span>
                <textarea
                  name="note"
                  maxLength={1000}
                  rows={3}
                  className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
                />
              </label>
              <label className="flex items-start gap-2 text-meta text-muted-ink">
                <input type="checkbox" name="consent" required className="mt-0.5" />
                <span>
                  Share my name and phone number with {name} so they can respond to my request.
                </span>
              </label>
              {applyErrorCode && applyErrorCode !== "already_applied" && (
                <FieldError id="apply-error">
                  {applyErrorCode === "consent_required"
                    ? "Check the consent box to share your details with the school."
                    : "Something went wrong sending your request. Please try again."}
                </FieldError>
              )}
              <button
                type="submit"
                className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
              >
                Request admission information →
              </button>
            </form>
          ) : (
            <Link
              href={lp(
                locale,
                `/sign-in?next=${encodeURIComponent(`${canonicalPath}#apply-heading`)}`,
              )}
              className="w-fit font-semibold text-ruled-blue"
            >
              Sign in to request information
            </Link>
          )}
        </section>
      )}

      <section
        aria-labelledby="enquiry-heading"
        className="flex flex-col gap-2 rounded-md border border-rule p-4"
      >
        <h2 id="enquiry-heading" className="font-display text-card font-semibold">
          Ask this school
        </h2>
        {enquirySent ? (
          <p className="text-body text-muted-ink">
            Your question has been sent to the school. They'll get back to you directly.
          </p>
        ) : user ? (
          <form action={sendEnquiry} className="flex flex-col gap-3">
            <input type="hidden" name="schoolId" value={school.id} />
            <input type="hidden" name="returnPath" value={canonicalPath} />
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">
                Class you're asking about (optional)
              </span>
              <select
                name="classCode"
                defaultValue=""
                className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
              >
                <option value="">Any class</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={`c${n}`}>
                    Class {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">Your question</span>
              <textarea
                name="message"
                required
                maxLength={1000}
                rows={4}
                className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
              />
            </label>
            {enquiryError && (
              <FieldError id="enquiry-error">
                Something went wrong sending your question. Please try again.
              </FieldError>
            )}
            <button
              type="submit"
              className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
            >
              Send question
            </button>
          </form>
        ) : (
          <form action={sendOpenEnquiry} className="flex flex-col gap-3">
            <input type="hidden" name="schoolId" value={school.id} />
            <input type="hidden" name="returnPath" value={canonicalPath} />
            {/* Honeypot: hidden from people and screen readers; bots fill it. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">Your name</span>
              <input
                name="parentName"
                required
                maxLength={120}
                autoComplete="name"
                className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">Mobile number</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">
                Email (mobile or email is needed)
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">
                Class you're asking about (optional)
              </span>
              <select
                name="classCode"
                defaultValue=""
                className="h-11 rounded-md border border-line-blue-strong bg-copy-white px-3 text-body outline-none"
              >
                <option value="">Any class</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={`c${n}`}>
                    Class {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-semibold text-muted-ink">Your question</span>
              <textarea
                name="message"
                required
                maxLength={1000}
                rows={4}
                className="rounded-md border border-line-blue-strong bg-copy-white p-3 text-body outline-none"
              />
            </label>
            <label className="flex items-start gap-2 text-meta text-muted-ink">
              <input type="checkbox" name="consent" required className="mt-0.5" />
              <span>
                Share my name and contact details with {name} so they can reply to me. No sign-in
                needed.
              </span>
            </label>
            {askError && (
              <FieldError id="ask-error">
                {askError === "consent"
                  ? "Tick the box to share your details with the school."
                  : askError === "contact"
                    ? "Enter a valid 10-digit mobile number or an email address."
                    : askError === "rate"
                      ? "You have sent a few questions already. Please try again in an hour."
                      : "Something went wrong sending your question. Please try again."}
              </FieldError>
            )}
            <button
              type="submit"
              className="flex h-12 w-fit items-center rounded-md bg-ruled-blue px-5 font-semibold text-copy-white"
            >
              Send question
            </button>
          </form>
        )}
      </section>
    </>
  );
}
