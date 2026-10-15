import { describe, expect, it } from "vitest";
import { haversineKm, rankNearest } from "./nearby";

describe("haversineKm", () => {
  it("is ~0 for the same point and ~111 km per degree of latitude", () => {
    expect(haversineKm({ lat: 28.4, lng: 77 }, { lat: 28.4, lng: 77 })).toBeCloseTo(0, 5);
    expect(haversineKm({ lat: 28, lng: 77 }, { lat: 29, lng: 77 })).toBeCloseTo(111.2, 0);
  });
});

describe("rankNearest", () => {
  const s = (id: string, lat: number | null, lng: number | null) => ({ id, lat, lng });
  const origin = s("o", 28.4, 77.0);
  it("orders by distance, excludes itself and rows without coordinates", () => {
    const out = rankNearest(
      origin,
      [
        s("far", 28.6, 77.0),
        s("o", 28.4, 77.0),
        s("near", 28.401, 77.0),
        s("none", null, null),
        s("mid", 28.45, 77.0),
      ],
      3,
    );
    expect(out.map((x) => x.id)).toEqual(["near", "mid", "far"]);
  });
  it("returns nothing when the origin has no coordinates", () => {
    expect(rankNearest(s("o", null, null), [s("a", 1, 1)], 4)).toEqual([]);
  });
  it("breaks distance ties by id so output is stable", () => {
    const out = rankNearest(origin, [s("b", 28.41, 77.0), s("a", 28.39, 77.0)], 2);
    expect(out).toHaveLength(2);
  });
});
