import { type NextRequest, NextResponse } from "next/server";

import { formatEta, route } from "@/lib/routing/osrm";

// Proxies the responder's "from" and a need's "to" to the internal OSRM box, so
// OSRM stays off the public network and there's no CORS. Coordinates are parsed
// as bounded numbers before they ever reach OSRM's URL (no injection).
function parsePoint(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function GET(request: NextRequest) {
  const from = parsePoint(request.nextUrl.searchParams.get("from"));
  const to = parsePoint(request.nextUrl.searchParams.get("to"));
  if (!from || !to)
    return NextResponse.json({ error: "bad coordinates" }, { status: 400 });

  const r = await route(from, to);
  if (!r) return NextResponse.json({ error: "no route" }, { status: 503 });

  return NextResponse.json({ ...r, text: formatEta(r) });
}
