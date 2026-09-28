import { describe, expect, it } from "vitest";
import { classifyAdmissionProvenance, classifySchoolProvenance } from "@/lib/provenance";

describe("classifySchoolProvenance", () => {
  it("requires both claimed AND school_verified for the top tier", () => {
    expect(classifySchoolProvenance("claimed", "school_verified")).toBe("school_verified");
    // Claimed but not yet school-verified must NOT get the top tier — same
    // pairing rule recordBadge/identityBand already enforce.
    expect(classifySchoolProvenance("claimed", "ops_verified")).toBe("ops_checked");
    expect(classifySchoolProvenance("claimed", "unverified")).toBe("unverified");
    // school_verified with claim somehow not 'claimed' (shouldn't happen in
    // practice, but the function must not trust verification alone).
    expect(classifySchoolProvenance("unclaimed", "school_verified")).not.toBe("school_verified");
  });

  it("maps ops_verified and source_verified independent of claim state", () => {
    expect(classifySchoolProvenance("unclaimed", "ops_verified")).toBe("ops_checked");
    expect(classifySchoolProvenance("unclaimed", "source_verified")).toBe("source_checked");
  });

  it("defaults to unverified", () => {
    expect(classifySchoolProvenance("unclaimed", "unverified")).toBe("unverified");
    expect(classifySchoolProvenance("unclaimed", "anything_else")).toBe("unverified");
  });
});

describe("classifyAdmissionProvenance", () => {
  it("never returns school_verified — admission_cycles has no claim column to pair it with", () => {
    expect(classifyAdmissionProvenance("ops_verified")).toBe("ops_checked");
    expect(classifyAdmissionProvenance("source_verified")).toBe("source_checked");
    expect(classifyAdmissionProvenance("unverified")).toBe("unverified");
    expect(classifyAdmissionProvenance("school_verified")).not.toBe("school_verified");
  });
});
