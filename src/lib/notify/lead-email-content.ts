export type LeadKind = "admission_lead" | "enquiry";

export type LeadEmail = { subject: string; text: string };

/**
 * Pure builder. Deliberately carries NO parent details (name, phone, message):
 * the enquiry flow never discloses a parent's contact to the school up front
 * (SDP-04), and an admission lead's name+phone are shared only inside the
 * portal, behind the school's login. The email is a nudge to log in.
 */
export function buildLeadEmail(input: {
  schoolName: string;
  kind: LeadKind;
  origin: string;
}): LeadEmail {
  const { schoolName, kind, origin } = input;
  const what = kind === "admission_lead" ? "an admission application" : "an enquiry";
  const path = kind === "admission_lead" ? "/portal/admission-leads" : "/portal";
  return {
    subject: `A parent sent ${schoolName} ${what} on SchoolOye`,
    text: [
      `Hello,`,
      ``,
      `A parent has sent ${schoolName} ${what} through SchoolOye.`,
      ``,
      `View it and reply: ${origin}${path}`,
      ``,
      `If your school has not claimed its page yet, you can do that here (it takes a couple of minutes): ${origin}/for-schools/claim`,
      ``,
      `SchoolOye`,
    ].join("\n"),
  };
}

/** Usable addresses from the school's public contact list. */
export function usableEmails(email: readonly (string | null)[] | null | undefined): string[] {
  return Array.from(
    new Set(
      (email ?? [])
        .map((e) => (e ?? "").trim())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
    ),
  );
}
