import { describe, expect, it } from "vitest";
import { buildOpenEnquiryEmail, oneLine } from "./open-enquiry-content";

const base = {
  schoolName: "G D Public School",
  parentName: "Asha",
  email: "asha@example.com",
  phone: "+919999999999",
  classLabel: "Nursery",
  message: "What is the age cut-off?",
  origin: "https://www.schooloye.com/school/gd-public-school",
};

describe("buildOpenEnquiryEmail", () => {
  it("includes the question and the consented contact details", () => {
    const m = buildOpenEnquiryEmail(base);
    expect(m.text).toContain("What is the age cut-off?");
    expect(m.text).toContain("asha@example.com");
    expect(m.text).toContain("+919999999999");
    expect(m.subject).toContain("G D Public School");
  });
  it("omits missing contact lines", () => {
    const m = buildOpenEnquiryEmail({ ...base, email: null });
    expect(m.text).not.toContain("Email:");
    expect(m.text).toContain("Please call or message them");
  });
});

describe("oneLine", () => {
  it("removes line breaks so a name cannot inject lines", () => {
    expect(oneLine("A\r\nBcc: x@y.z")).toBe("A Bcc: x@y.z");
  });
});
