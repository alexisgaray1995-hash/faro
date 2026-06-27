import { describe, expect, it } from "vitest";

import { formatEta, parseRoute } from "@/lib/routing/osrm";

describe("parseRoute", () => {
  it("reads distance/duration from an OK response", () => {
    expect(
      parseRoute({ code: "Ok", routes: [{ distance: 3200, duration: 480 }] }),
    ).toEqual({ distanceM: 3200, durationS: 480 });
  });

  it("returns null when OSRM finds no route or errors", () => {
    expect(parseRoute({ code: "NoRoute", routes: [] })).toBeNull();
    expect(parseRoute({ code: "Ok", routes: [] })).toBeNull();
    expect(parseRoute(null)).toBeNull();
    expect(parseRoute({ code: "Ok", routes: [{ distance: "x" }] })).toBeNull();
  });
});

describe("formatEta", () => {
  it("uses meters under 1 km and km above", () => {
    expect(formatEta({ distanceM: 850, durationS: 120 })).toBe(
      "~850 m · 2 min",
    );
    expect(formatEta({ distanceM: 3200, durationS: 480 })).toBe(
      "~3.2 km · 8 min",
    );
  });

  it("floors sub-minute travel to <1 min", () => {
    expect(formatEta({ distanceM: 100, durationS: 20 })).toBe(
      "~100 m · <1 min",
    );
  });
});
