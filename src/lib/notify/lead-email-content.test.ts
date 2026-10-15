import { describe, expect, it } from "vitest";
import { buildLeadEmail, usableEmails } from "./lead-email-content";

describe("buildLeadEmail", () => {
  it("names the school and links to the portal without parent details", () => {
    const e = buildLeadEmail({
      schoolName: "Test School",
      kind: "admission_lead",
      origin: "https://x.test",
    });
    expect(e.subject).toContain("Test School");
    expect(e.text).toContain("https://x.test/portal/admission-leads");
    expect(e.text).toContain("/for-schools/claim");
  });
  it("uses the portal root for enquiries", () => {
    const e = buildLeadEmail({ schoolName: "S", kind: "enquiry", origin: "https://x.test" });
    expect(e.text).toContain("https://x.test/portal\n");
    expect(e.subject).toContain("an enquiry");
  });
});

describe("usableEmails", () => {
  it("drops blanks, nulls and malformed, and dedupes", () => {
    expect(usableEmails([null, "", "a@b.in", "a@b.in", "nope", " c@d.com "])).toEqual([
      "a@b.in",
      "c@d.com",
    ]);
  });
  it("handles null input", () => {
    expect(usableEmails(null)).toEqual([]);
  });
});
