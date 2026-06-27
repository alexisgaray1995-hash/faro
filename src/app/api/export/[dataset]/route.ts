import { type NextRequest, NextResponse } from "next/server";

import { toGeoJSON, toHxlCsv, type Field, type Row } from "@/lib/export";
import { createClient } from "@/lib/supabase/server";

// Public, anon-readable export of the same blurred views the map uses
// (Golden Rule #8: HXL CSV + GeoJSON for interop). No PII, no auth needed.
type ViewName = "public_resources" | "public_hazards" | "public_needs";

const DATASETS: Record<
  string,
  { view: ViewName; order: string; fields: Field[] }
> = {
  resources: {
    view: "public_resources",
    order: "updated_at",
    fields: [
      { key: "id", header: "id", hxl: "#meta+id" },
      { key: "type", header: "type", hxl: "#facility+type" },
      { key: "name", header: "name", hxl: "#facility+name" },
      { key: "description", header: "description", hxl: "#description" },
      { key: "is_open", header: "is_open", hxl: "#status+open" },
      { key: "lat", header: "lat", hxl: "#geo+lat" },
      { key: "lng", header: "lng", hxl: "#geo+lon" },
      { key: "verification", header: "verification", hxl: "#status+verified" },
      { key: "updated_at", header: "updated_at", hxl: "#date+updated" },
    ],
  },
  hazards: {
    view: "public_hazards",
    order: "updated_at",
    fields: [
      { key: "id", header: "id", hxl: "#meta+id" },
      { key: "type", header: "type", hxl: "#event+type" },
      { key: "severity", header: "severity", hxl: "#severity" },
      { key: "description", header: "description", hxl: "#description" },
      { key: "lat", header: "lat", hxl: "#geo+lat" },
      { key: "lng", header: "lng", hxl: "#geo+lon" },
      { key: "verification", header: "verification", hxl: "#status+verified" },
      { key: "updated_at", header: "updated_at", hxl: "#date+updated" },
    ],
  },
  needs: {
    view: "public_needs",
    order: "created_at",
    fields: [
      { key: "id", header: "id", hxl: "#meta+id" },
      { key: "category", header: "category", hxl: "#need+type" },
      { key: "people_count", header: "people_count", hxl: "#affected+num" },
      { key: "description", header: "description", hxl: "#description" },
      { key: "lat", header: "lat", hxl: "#geo+lat" },
      { key: "lng", header: "lng", hxl: "#geo+lon" },
      { key: "verification", header: "verification", hxl: "#status+verified" },
      { key: "created_at", header: "created_at", hxl: "#date+created" },
    ],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await params;
  const cfg = DATASETS[dataset];
  if (!cfg)
    return NextResponse.json({ error: "unknown dataset" }, { status: 404 });

  const format =
    request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "geojson";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(cfg.view)
    .select("*")
    .order(cfg.order, { ascending: false })
    .limit(5000);
  if (error)
    return NextResponse.json({ error: "query failed" }, { status: 502 });

  const rows = (data ?? []) as Row[];
  const stamp = new Date().toISOString().slice(0, 10);

  const body =
    format === "csv" ? toHxlCsv(rows, cfg.fields) : toGeoJSON(rows, cfg.fields);
  const contentType =
    format === "csv" ? "text/csv; charset=utf-8" : "application/geo+json";
  const ext = format === "csv" ? "csv" : "geojson";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="faro-${dataset}-${stamp}.${ext}"`,
    },
  });
}
