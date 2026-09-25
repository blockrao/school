import { describe, expect, it } from "vitest";
import { titleCase } from "@/lib/text";

describe("titleCase", () => {
  it("title-cases an all-caps district name", () => {
    expect(titleCase("SOUTH WEST DELHI")).toBe("South West Delhi");
  });

  it("leaves already-cased names alone", () => {
    expect(titleCase("Delhi")).toBe("Delhi");
  });
});
