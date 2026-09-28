import { describe, expect, it } from "vitest";
import type { Dictionary } from "@/i18n/dictionary";
// Not `getDictionary()` — that file imports "server-only", which throws
// outside a react-server bundling condition (vitest runs plain Node). Reading
// the JSON directly still exercises the real shipped content; TranslationKey
// is derived from Dictionary's actual shape, so this also proves the JSON
// matches its own type.
import dictJson from "@/i18n/locales/en.json";
import { t, tEnum, tPlural } from "@/i18n/t";

const dict = dictJson as Dictionary;

describe("t", () => {
  it("looks up a dot-path key", () => {
    expect(t(dict, "common.brand")).toBe("SchoolOye");
  });

  it("interpolates named placeholders", () => {
    expect(t(dict, "footer.grievance_officer", { email: "help@example.com" })).toBe(
      "Grievance officer: help@example.com",
    );
  });

  it("leaves an unmatched placeholder untouched rather than blanking it", () => {
    expect(t(dict, "footer.grievance_officer", {})).toBe("Grievance officer: {email}");
  });

  it("falls back to the raw key for a missing path, never throws", () => {
    // @ts-expect-error deliberately invalid key for the fallback-path test
    expect(t(dict, "does.not.exist")).toBe("does.not.exist");
  });
});

describe("tPlural", () => {
  it("selects the 'one' category for count 1", () => {
    expect(tPlural(dict, "results.school_count", 1)).toBe("1 school");
  });

  it("selects the 'other' category for count !== 1", () => {
    expect(tPlural(dict, "results.school_count", 0)).toBe("0 schools");
    expect(tPlural(dict, "results.school_count", 3)).toBe("3 schools");
  });
});

describe("tEnum", () => {
  it("maps a known code to its label", () => {
    expect(tEnum(dict, "gender", "coed")).toBe("Co-ed");
    expect(tEnum(dict, "management", "government")).toBe("Government");
  });

  it("falls back to the raw code for an unmapped value, never blanks it", () => {
    expect(tEnum(dict, "gender", "nonbinary_future_value")).toBe("nonbinary_future_value");
  });

  it("passes through null/undefined as empty, not the literal word", () => {
    expect(tEnum(dict, "gender", null)).toBe("");
    expect(tEnum(dict, "gender", undefined)).toBe("");
  });
});
