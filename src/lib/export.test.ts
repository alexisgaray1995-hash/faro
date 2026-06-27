import { describe, expect, it } from "vitest";

import { toGeoJSON, toHxlCsv, type Field } from "@/lib/export";

const fields: Field[] = [
  { key: "name", header: "name", hxl: "#name" },
  { key: "lat", header: "lat", hxl: "#geo+lat" },
  { key: "lng", header: "lng", hxl: "#geo+lon" },
];

describe("toHxlCsv", () => {
  it("emits a header row, an HXL hashtag row, then data", () => {
    const out = toHxlCsv([{ name: "Clinic", lat: 10, lng: -66 }], fields);
    expect(out.split("\r\n")).toEqual([
      "name,lat,lng",
      "#name,#geo+lat,#geo+lon",
      "Clinic,10,-66",
    ]);
  });

  it("RFC-4180 quotes cells with commas, quotes, and newlines", () => {
    const rows = [{ name: 'A, "B"\nC', lat: 0, lng: 0 }];
    const line = toHxlCsv(rows, fields).split("\r\n")[2];
    expect(line).toBe('"A, ""B""\nC",0,0');
  });

  it("renders null/undefined as empty cells", () => {
    const line = toHxlCsv([{ name: null, lat: 0, lng: 0 }], fields).split(
      "\r\n",
    )[2];
    expect(line).toBe(",0,0");
  });
});

describe("toGeoJSON", () => {
  it("builds a FeatureCollection with [lng, lat] points", () => {
    const fc = JSON.parse(
      toGeoJSON([{ name: "Clinic", lat: 10, lng: -66 }], fields),
    );
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features[0].geometry.coordinates).toEqual([-66, 10]);
    expect(fc.features[0].properties.name).toBe("Clinic");
  });
});
