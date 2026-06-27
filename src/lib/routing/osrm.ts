// Self-hosted routing via OSRM (Open Source Routing Machine) — zero API cost,
// runs in Docker against a Venezuela OpenStreetMap extract. Deterministic
// shortest-path on the road graph; NOT AI. Returns null when OSRM is
// unreachable so callers degrade gracefully (Golden Rule #6).
//
// Golden Rule #5 caveat: post-quake roads may be blocked. OSRM routes the
// pre-disaster network, so ETAs are a best-guess — the UI labels them "~".
export type Point = { lat: number; lng: number };
export type Route = { distanceM: number; durationS: number };

// Pure parser — exported so response handling is testable without a network.
export function parseRoute(json: unknown): Route | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { code?: unknown; routes?: unknown };
  if (o.code !== "Ok" || !Array.isArray(o.routes) || o.routes.length === 0)
    return null;
  const r = o.routes[0] as { distance?: unknown; duration?: unknown };
  if (typeof r.distance !== "number" || typeof r.duration !== "number")
    return null;
  return { distanceM: r.distance, durationS: r.duration };
}

// Human-readable, Spanish. Pure — tested.
export function formatEta({ distanceM, durationS }: Route): string {
  const dist =
    distanceM < 1000
      ? `${Math.round(distanceM)} m`
      : `${(distanceM / 1000).toFixed(1)} km`;
  const min = Math.round(durationS / 60);
  const time = min < 1 ? "<1 min" : `${min} min`;
  return `~${dist} · ${time}`;
}

export async function route(from: Point, to: Point): Promise<Route | null> {
  const base = process.env.OSRM_URL ?? "http://localhost:5000";
  // OSRM wants lon,lat order. Values are validated numbers (see /api/route).
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  try {
    const res = await fetch(
      `${base}/route/v1/driving/${coords}?overview=false`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    return parseRoute(await res.json());
  } catch {
    return null; // offline, no OSRM, timeout — non-fatal
  }
}
