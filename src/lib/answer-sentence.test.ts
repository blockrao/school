import { describe, expect, it } from "vitest";
import type { PublicSchoolEvent, PublicSchoolJob, PublicSchoolNews } from "@/contracts";
import {
  admissionClassLabel,
  buildActivityAnswer,
  buildAdmissionsAnswer,
} from "@/lib/answer-sentence";
import type { SchoolActivityItem } from "@/lib/school-activity";

const now = new Date("2026-09-29T12:00:00.000Z");

// Minimal fixture builders, same style as school-activity.test.ts's own
// news()/event()/job() — kept local to this file rather than shared, per
// that file's existing pattern.
function newsFixture(overrides: Partial<PublicSchoolNews> = {}): PublicSchoolNews {
  return {
    id: "news-1",
    school_id: "school-1",
    school_slug: "lancers-convent-sr-sec-school",
    kind: "news",
    title: "Lancer's Convent to host Dandiya Night 2026",
    body: "...",
    source_url: null,
    published_at: "2026-09-29T11:47:59.333Z",
    post_code: 1,
    post_slug: "lancer-s-convent-to-host-dandiya-night-2026-64705",
    tier: "organic",
    listing_requested_at: null,
    listing_review: null,
    ...overrides,
  };
}

function eventFixture(overrides: Partial<PublicSchoolEvent> = {}): PublicSchoolEvent {
  return {
    id: "event-1",
    school_id: "school-1",
    school_slug: "lancers-convent-sr-sec-school",
    event_code: 1,
    event_slug: "dandiya-night-2026-17190",
    event_type: "cultural",
    title: "Dandiya Night 2026",
    description: null,
    starts_at: "2026-10-11T12:30:00.000Z",
    ends_at: null,
    location: "Lancer's Convent, Prashant Vihar, Rohini, New Delhi",
    class_codes: [],
    registration_url: null,
    source_url: null,
    cancelled_at: null,
    listing_requested_at: null,
    listing_review: null,
    created_at: "2026-09-29T11:17:29.000Z",
    ...overrides,
  };
}

function jobFixture(overrides: Partial<PublicSchoolJob> = {}): PublicSchoolJob {
  return {
    id: "job-1",
    school_id: "school-1",
    school_slug: "gyan-devi",
    job_code: 1,
    job_slug: "j-1-pgt-maths",
    title: "PGT Mathematics",
    employment_type: "full_time",
    subject: "Mathematics",
    description: "...",
    experience_required: null,
    salary_range: null,
    location: null,
    apply_url: null,
    apply_email: null,
    class_codes: [],
    closes_at: null,
    filled_at: null,
    cancelled_at: null,
    listing_requested_at: null,
    listing_review: null,
    created_at: "2026-09-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("admissionClassLabel", () => {
  it("maps named early-years stages", () => {
    expect(admissionClassLabel("nursery")).toBe("Nursery");
    expect(admissionClassLabel("lkg")).toBe("LKG");
    expect(admissionClassLabel("ukg")).toBe("UKG");
    expect(admissionClassLabel("prep")).toBe("Prep");
  });

  it("maps c<N> codes", () => {
    expect(admissionClassLabel("c1")).toBe("Class 1");
    expect(admissionClassLabel("c12")).toBe("Class 12");
  });

  it("falls back to title-casing an unrecognized code rather than guessing", () => {
    expect(admissionClassLabel("montessori")).toBe("Montessori");
  });
});

describe("buildAdmissionsAnswer", () => {
  it("real case: Lancer's Convent's live open Nursery cycle", () => {
    const sentence = buildAdmissionsAnswer(
      "Lancer's Convent SR Sec School",
      {
        academic_year: "2027-28",
        class_code: "nursery",
        opens_on: "2026-09-25",
        closes_on: "2026-10-31",
      },
      now,
    );
    expect(sentence).toBe(
      "Lancer's Convent SR Sec School is accepting Nursery admissions for 2027-28, open until 31 Oct 2026.",
    );
  });

  it("no admission cycle at all", () => {
    expect(buildAdmissionsAnswer("Gyan Deep Sr.sec.", null, now)).toBe(
      "Admission dates for Gyan Deep Sr.sec. have not yet been published on SchoolOye.",
    );
  });

  it("a cycle exists but no dates were ever announced", () => {
    const sentence = buildAdmissionsAnswer(
      "New School",
      { academic_year: "2027-28", class_code: "c1", opens_on: null, closes_on: null },
      now,
    );
    expect(sentence).toBe(
      "Admission dates for Class 1 at New School (2027-28) have not yet been published.",
    );
  });

  it("a cycle that has already closed", () => {
    const sentence = buildAdmissionsAnswer(
      "DAV Public School",
      {
        academic_year: "2026-27",
        class_code: "c11",
        opens_on: "2026-01-01",
        closes_on: "2026-02-28",
      },
      now,
    );
    expect(sentence).toBe(
      "Admissions for Class 11 at DAV Public School (2026-27) closed on 28 Feb 2026.",
    );
  });

  it("a cycle that opens in the future", () => {
    const sentence = buildAdmissionsAnswer(
      "St. Xavier's",
      {
        academic_year: "2027-28",
        class_code: "c1",
        opens_on: "2026-12-01",
        closes_on: "2027-01-31",
      },
      now,
    );
    expect(sentence).toBe("Admissions for Class 1 at St. Xavier's (2027-28) open on 1 Dec 2026.");
  });

  it("open with no closing date announced", () => {
    const sentence = buildAdmissionsAnswer(
      "Open School",
      { academic_year: "2027-28", class_code: "c1", opens_on: "2026-09-01", closes_on: null },
      now,
    );
    expect(sentence).toBe(
      "Open School is accepting Class 1 admissions for 2027-28; no closing date has been announced yet.",
    );
  });

  it("never fabricates a specific day/month it doesn't have (not-announced names no date)", () => {
    const sentence = buildAdmissionsAnswer(
      "Test School",
      { academic_year: "2027-28", class_code: "c1", opens_on: null, closes_on: null },
      now,
    );
    // Academic year ("2027-28") is legitimately in the sentence; no month
    // abbreviation (which would only appear from a real opens_on/closes_on)
    // should ever show up here.
    expect(sentence).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });
});

describe("buildActivityAnswer", () => {
  it("real case: Lancer's Convent Dandiya Night news post", () => {
    const item: SchoolActivityItem = {
      kind: "news",
      sortAt: new Date("2026-09-29T11:47:59.333Z"),
      upcoming: false,
      data: newsFixture(),
    };
    expect(buildActivityAnswer("Lancer's Convent SR Sec School", item)).toBe(
      "Lancer's Convent SR Sec School announced on 29 Sept 2026: Lancer's Convent to host Dandiya Night 2026.",
    );
  });

  it("real case: Lancer's Convent Dandiya Night event, upcoming", () => {
    const item: SchoolActivityItem = {
      kind: "event",
      sortAt: new Date("2026-10-11T12:30:00.000Z"),
      upcoming: true,
      status: "upcoming",
      data: eventFixture(),
    };
    expect(buildActivityAnswer("Lancer's Convent SR Sec School", item)).toBe(
      "Lancer's Convent SR Sec School is holding Dandiya Night 2026 on 11 Oct 2026 at Lancer's Convent, Prashant Vihar, Rohini, New Delhi.",
    );
  });

  it("event: ongoing", () => {
    const item: SchoolActivityItem = {
      kind: "event",
      sortAt: new Date("2026-10-11T12:30:00.000Z"),
      upcoming: false,
      status: "ongoing",
      data: eventFixture(),
    };
    expect(buildActivityAnswer("Lancer's Convent SR Sec School", item)).toBe(
      "Lancer's Convent SR Sec School's Dandiya Night 2026 at Lancer's Convent, Prashant Vihar, Rohini, New Delhi is happening now (started 11 Oct 2026).",
    );
  });

  it("event: completed", () => {
    const item: SchoolActivityItem = {
      kind: "event",
      sortAt: new Date("2026-10-11T12:30:00.000Z"),
      upcoming: false,
      status: "completed",
      data: eventFixture(),
    };
    expect(buildActivityAnswer("Lancer's Convent SR Sec School", item)).toBe(
      "Lancer's Convent SR Sec School held Dandiya Night 2026 on 11 Oct 2026 at Lancer's Convent, Prashant Vihar, Rohini, New Delhi.",
    );
  });

  it("event: cancelled", () => {
    const item: SchoolActivityItem = {
      kind: "event",
      sortAt: new Date("2026-10-11T12:30:00.000Z"),
      upcoming: false,
      status: "cancelled",
      data: eventFixture({ cancelled_at: "2026-10-05T00:00:00.000Z" }),
    };
    expect(buildActivityAnswer("Lancer's Convent SR Sec School", item)).toBe(
      "Lancer's Convent SR Sec School's Dandiya Night 2026, originally scheduled for 11 Oct 2026 at Lancer's Convent, Prashant Vihar, Rohini, New Delhi, was cancelled.",
    );
  });

  it("event: no location on record never fabricates a place", () => {
    const item: SchoolActivityItem = {
      kind: "event",
      sortAt: new Date("2026-10-11T12:30:00.000Z"),
      upcoming: true,
      status: "upcoming",
      data: eventFixture({ location: null }),
    };
    expect(buildActivityAnswer("Lancer's Convent SR Sec School", item)).toBe(
      "Lancer's Convent SR Sec School is holding Dandiya Night 2026 on 11 Oct 2026.",
    );
  });

  it("job: open with a closing date", () => {
    const item: SchoolActivityItem = {
      kind: "job",
      sortAt: new Date("2026-09-15T00:00:00.000Z"),
      upcoming: false,
      status: "open",
      data: jobFixture({ closes_at: "2026-10-15T00:00:00.000Z" }),
    };
    expect(buildActivityAnswer("Gyan Devi", item)).toBe(
      "Gyan Devi is hiring for PGT Mathematics (Mathematics), applications close 15 Oct 2026.",
    );
  });

  it("job: open with no closing date announced", () => {
    const item: SchoolActivityItem = {
      kind: "job",
      sortAt: new Date("2026-09-15T00:00:00.000Z"),
      upcoming: false,
      status: "open",
      data: jobFixture({ closes_at: null }),
    };
    expect(buildActivityAnswer("Gyan Devi", item)).toBe(
      "Gyan Devi is hiring for PGT Mathematics (Mathematics).",
    );
  });

  it("job: no subject on record falls back to the title alone", () => {
    const item: SchoolActivityItem = {
      kind: "job",
      sortAt: new Date("2026-09-15T00:00:00.000Z"),
      upcoming: false,
      status: "open",
      data: jobFixture({ subject: null, closes_at: null }),
    };
    expect(buildActivityAnswer("Gyan Devi", item)).toBe("Gyan Devi is hiring for PGT Mathematics.");
  });

  it("job: closed", () => {
    const item: SchoolActivityItem = {
      kind: "job",
      sortAt: new Date("2026-09-15T00:00:00.000Z"),
      upcoming: false,
      status: "closed",
      data: jobFixture({ closes_at: "2026-09-20T00:00:00.000Z" }),
    };
    expect(buildActivityAnswer("Gyan Devi", item)).toBe(
      "Applications for the PGT Mathematics (Mathematics) position at Gyan Devi have closed.",
    );
  });

  it("job: filled", () => {
    const item: SchoolActivityItem = {
      kind: "job",
      sortAt: new Date("2026-09-15T00:00:00.000Z"),
      upcoming: false,
      status: "filled",
      data: jobFixture({ filled_at: "2026-09-25T00:00:00.000Z" }),
    };
    expect(buildActivityAnswer("Gyan Devi", item)).toBe(
      "The PGT Mathematics (Mathematics) position at Gyan Devi has been filled.",
    );
  });

  it("job: cancelled", () => {
    const item: SchoolActivityItem = {
      kind: "job",
      sortAt: new Date("2026-09-15T00:00:00.000Z"),
      upcoming: false,
      status: "cancelled",
      data: jobFixture({ cancelled_at: "2026-09-18T00:00:00.000Z" }),
    };
    expect(buildActivityAnswer("Gyan Devi", item)).toBe(
      "Gyan Devi withdrew its PGT Mathematics (Mathematics) posting.",
    );
  });
});
