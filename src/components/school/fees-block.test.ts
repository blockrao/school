import { describe, expect, it } from "vitest";
import type { PublicSchoolFee } from "@/contracts";
import { firstYearTotal } from "./fees-block";

const row = (o: Partial<PublicSchoolFee>): PublicSchoolFee => ({
  fee_id: "1",
  school_id: "s",
  academic_year: "2026-27",
  class_code: "nursery",
  fee_head: "tuition",
  component: "Tuition",
  variant: null,
  amount_min: 100,
  amount_max: 100,
  frequency: "yearly",
  mandatory: true,
  refundable: false,
  basis: "fee_circular",
  effective_from: null,
  notes: null,
  source_kind: "school_document",
  evidence_url: null,
  observed_at: null,
  valid_to: null,
  updated_at: "2026-10-01",
  ...o,
});

describe("firstYearTotal", () => {
  it("annualises quarterly fees and adds one-time fees", () => {
    const t = firstYearTotal([
      row({ amount_min: 1000, amount_max: 1000, frequency: "one_time" }),
      row({ amount_min: 500, amount_max: 500, frequency: "quarterly" }),
    ]);
    expect(t).toBe(3000);
  });
  it("returns null if any mandatory fee has no single amount", () => {
    expect(firstYearTotal([row({}), row({ amount_min: null, amount_max: null })])).toBeNull();
    expect(firstYearTotal([row({ amount_min: 100, amount_max: 200 })])).toBeNull();
  });
  it("returns null when nothing is marked mandatory", () => {
    expect(firstYearTotal([row({ mandatory: null })])).toBeNull();
  });
});
