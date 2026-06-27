// Standard humanitarian export formats (Golden Rule #8): HXL-tagged CSV and
// GeoJSON. Reads the public views only (blurred coords, no PII).

export type Field = { key: string; header: string; hxl: string };
export type Row = Record<string, string | number | boolean | null>;

// RFC-4180 quoting: wrap in quotes and double any internal quote when the cell
// contains a comma, quote, or newline. Free-text descriptions need this.
function csvCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toHxlCsv(rows: Row[], fields: Field[]): string {
  const line = (vals: (string | number | boolean | null | undefined)[]) =>
    vals.map(csvCell).join(",");
  return [
    line(fields.map((f) => f.header)),
    line(fields.map((f) => f.hxl)), // HXL hashtag row
    ...rows.map((r) => line(fields.map((f) => r[f.key]))),
  ].join("\r\n");
}

export function toGeoJSON(rows: Row[], propFields: Field[]): string {
  return JSON.stringify({
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: Object.fromEntries(propFields.map((f) => [f.key, r[f.key]])),
    })),
  });
}
